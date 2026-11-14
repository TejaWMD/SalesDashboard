// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  getSSOSession,
  clearSSOSession,
  isSSOAdmin,
  DEFAULT_MAIN_PORTAL_URL,
} from './utils/ssoAuth';
import Sidebar from './components/Sidebar';
import HomepageDashboard from './components/HomepageDashboard';
import KpiDashboard from './components/KpiDashboard';
import SalesDashboard from './components/SalesDashboard';
import TableDashboard from './components/TableDashboard';
import CollectionDashboard from './components/CollectionDashboard';
import CollectionTableDashboard from './components/CollectionTableDashboard';
import PaymentUpdateTable from './components/PaymentUpdateTable';
import OnlineSalesDashboard from './components/OnlineSalesDashboard';
import AdminActivityDashboard from './components/AdminActivityDashboard';
import TvControls from './components/TvControls';
import wmdLogo from './assets/wmd-logo.jpg';
import {
  fetchSalesData,
  fetchPaymentData,
  fetchOnlineData,
  fetchOnlineTabs,
  COLLECTION_MONTHS,
} from './utils/fetchSheet';
import { fetchPaymentUpdateData } from './utils/fetchPaymentUpdate';
import { generateExecutivePdfReport } from './utils/generatePdfReport';
import {
  recordUserActivity,
  sendUserHeartbeat,
  formatDashboardLocation,
  startCloudActivitySync,
  syncFromCloud,
} from './utils/activityTracker';
import './styles.css';

const AUTO_REFRESH_INTERVAL_MS = 60000; // 60 seconds auto-sync
const HEARTBEAT_INTERVAL_MS = 12000; // 12 seconds presence heartbeat

function App() {
  // SSO session hand-off from MainApp Portal
  const [ssoSession, setSsoSession] = useState(() => getSSOSession());
  const isAuthenticated = Boolean(ssoSession && ssoSession.email);
  const currentUserEmail = useMemo(
    () => (ssoSession?.email ? String(ssoSession.email).trim().toLowerCase() : null),
    [ssoSession]
  );
  const isAdmin = useMemo(() => isSSOAdmin(ssoSession), [ssoSession]);

  // Active view: 'homepage' | 'kpi' | 'sales' | 'collection' | 'payment-update' | 'online' | 'admin'
  const [activeView, setActiveView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v && ['homepage', 'kpi', 'sales', 'collection', 'payment-update', 'online', 'admin'].includes(v)) {
        return v;
      }
    } catch (e) {}
    return 'homepage';
  });

  // Header sub-tabs for Sales and Collection ('dashboard' | 'table')
  const [salesSubTab, setSalesSubTab] = useState('dashboard');
  const [collectionSubTab, setCollectionSubTab] = useState('dashboard');

  // Collapsible Sidebar states (Desktop/TV collapse & Mobile drawer)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sales data states
  const [salesRows, setSalesRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState(['OCT']);
  const [selectedMonth, setSelectedMonth] = useState('OCT');

  // Payment data states
  const [paymentData, setPaymentData] = useState({ rows: [], picList: [], summary: {} });
  const [paymentUpdateData, setPaymentUpdateData] = useState({ rows: [], columns: [], sections: [] });

  // Collection month tabs (configured with GIDs in fetchSheet.js)
  const [selectedCollectionGid, setSelectedCollectionGid] = useState(() => {
    const novMonth = COLLECTION_MONTHS.find((m) => m.gid === '182735412');
    return novMonth ? novMonth.gid : (COLLECTION_MONTHS[COLLECTION_MONTHS.length - 1]?.gid || '182735412');
  });
  const selectedCollectionGidRef = useRef(selectedCollectionGid);

  // Online sales month tabs (one sheet tab per month, discovered automatically)
  const [onlineTabs, setOnlineTabs] = useState([]);
  const [selectedOnlineTab, setSelectedOnlineTab] = useState('');
  const onlineTabsRef = useRef([]);
  const selectedOnlineTabRef = useRef('');

  // Online sales data states
  const [onlineData, setOnlineData] = useState({
    shopeeTotal: 0,
    tiktokTotal: 0,
    totalSales: 0,
    shopeePercent: 0,
    tiktokPercent: 0,
    dailyRecords: [],
    activeDaysCount: 0,
    dailyAverage: 0,
    peakDay: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Executive PDF Report Generation state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportToast, setReportToast] = useState(null);

  const currentLocationLabel = useMemo(
    () =>
      formatDashboardLocation(
        activeView,
        salesSubTab,
        collectionSubTab,
        selectedMonth
      ),
    [activeView, salesSubTab, collectionSubTab, selectedMonth]
  );

  // Start cross-device cloud activity sync on mount
  useEffect(() => {
    const stopSync = startCloudActivitySync();
    return () => {
      if (stopSync) stopSync();
    };
  }, []);

  // Keep live presence heartbeat updated for the currently logged-in user
  useEffect(() => {
    if (!currentUserEmail) return undefined;

    // Broadcast this device's active presence immediately on mount/view change
    sendUserHeartbeat(
      currentUserEmail,
      currentLocationLabel,
      `Viewing ${currentLocationLabel}`
    );

    // Pull latest cloud state in parallel
    syncFromCloud();

    const heartbeatTimer = setInterval(() => {
      sendUserHeartbeat(
        currentUserEmail,
        currentLocationLabel,
        `Viewing ${currentLocationLabel}`
      );
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        sendUserHeartbeat(
          currentUserEmail,
          currentLocationLabel,
          `Viewing ${currentLocationLabel}`
        );
        syncFromCloud();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [currentUserEmail, currentLocationLabel]);

  // Fetch real-time data from all Google Sheets concurrently
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const [salesRes, paymentRes, onlineRes, paymentUpdateRes] = await Promise.all([
        fetchSalesData(),
        fetchPaymentData(selectedCollectionGidRef.current),
        (async () => {
          const tabs = await fetchOnlineTabs(onlineTabsRef.current);
          if (tabs.length === 0) return null;
          let tab = selectedOnlineTabRef.current;
          if (!tabs.includes(tab)) {
            // Default: current calendar month if it has a tab, otherwise the latest tab
            const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DECEMBER'];
            const nowDate = new Date();
            const currentName = `${monthNames[nowDate.getMonth()]} ${nowDate.getFullYear()}`;
            tab = tabs.includes(currentName) ? currentName : tabs[tabs.length - 1];
          }
          const data = await fetchOnlineData(tab);
          return { tabs, tab, data };
        })(),
        fetchPaymentUpdateData(),
      ]);

      setSalesRows(salesRes.rows);
      setAvailableMonths(salesRes.availableMonths);
      setPaymentData(paymentRes);
      if (paymentUpdateRes) {
        setPaymentUpdateData(paymentUpdateRes);
      }
      if (onlineRes) {
        onlineTabsRef.current = onlineRes.tabs;
        selectedOnlineTabRef.current = onlineRes.tab;
        setOnlineTabs(onlineRes.tabs);
        setSelectedOnlineTab(onlineRes.tab);
        setOnlineData(onlineRes.data);
      }

      // Default month to OCT or latest available month
      if (salesRes.availableMonths.length > 0 && (!selectedMonth || selectedMonth === 'ALL')) {
        const preferred = salesRes.availableMonths.includes('OCT')
          ? 'OCT'
          : salesRes.availableMonths[salesRes.availableMonths.length - 1];
        setSelectedMonth(preferred);
      }

      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to fetch data from Google Sheets:', err);
      setError('Could not fetch data from Google Sheets. Please verify connection and permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  // Initial load & automatic refresh every 60s
  useEffect(() => {
    if (isAuthenticated) {
      loadData(false);
      const refreshTimer = setInterval(() => {
        loadData(true);
      }, AUTO_REFRESH_INTERVAL_MS);
      return () => clearInterval(refreshTimer);
    }
    return undefined;
  }, [isAuthenticated, loadData]);

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    const entering = !document.fullscreenElement;
    if (entering) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
    if (currentUserEmail) {
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'FULLSCREEN_TOGGLE',
        location: currentLocationLabel,
        details: entering ? 'Entered Fullscreen Mode' : 'Exited Fullscreen Mode',
      });
    }
  };

  const handleReturnToMainApp = () => {
    const target = ssoSession?.portal_url || DEFAULT_MAIN_PORTAL_URL;
    window.location.href = target;
  };

  const handleLockDashboard = () => {
    if (currentUserEmail) {
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'LOGOUT',
        location: currentLocationLabel,
        details: 'Signed out of dashboard (returned to Main Portal)',
        status: 'offline',
      });
    }
    clearSSOSession();
    setSsoSession(null);
    const target = ssoSession?.portal_url || DEFAULT_MAIN_PORTAL_URL;
    window.location.href = target;
  };

  // Record SSO login presence on entry
  useEffect(() => {
    if (currentUserEmail) {
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'LOGIN',
        location: 'Homepage (Account Managers)',
        details: `Connected via Main Portal SSO (${ssoSession?.role_label || ssoSession?.role || 'Staff'})`,
        status: 'online',
      });
    }
  }, [currentUserEmail]);

  const handleViewChange = (nextView) => {
    if (nextView === 'admin' && !isAdmin) return;
    setActiveView(nextView);
    if (currentUserEmail) {
      const nextLoc = formatDashboardLocation(
        nextView,
        salesSubTab,
        collectionSubTab,
        selectedMonth
      );
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'NAVIGATION',
        location: nextLoc,
        details: `Opened ${nextLoc}`,
      });
    }
  };

  // Filter sales rows according to selected month
  const filteredSalesRows = useMemo(() => {
    if (selectedMonth === 'ALL') return salesRows;
    return salesRows.filter((r) => r.month === selectedMonth);
  }, [salesRows, selectedMonth]);

  const activeSubTab = activeView === 'sales' ? salesSubTab : collectionSubTab;
  const handleSubTabChange = (tab) => {
    if (activeView === 'sales') {
      setSalesSubTab(tab);
    } else if (activeView === 'collection') {
      setCollectionSubTab(tab);
    }
    if (currentUserEmail) {
      const nextLoc = formatDashboardLocation(
        activeView,
        activeView === 'sales' ? tab : salesSubTab,
        activeView === 'collection' ? tab : collectionSubTab,
        selectedMonth
      );
      const subTabTitle = tab === 'table' ? 'Table View' : tab === 'payment-update' ? 'Payment Update View' : 'Dashboard View';
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'SUBTAB_CHANGE',
        location: nextLoc,
        details: `Switched to ${subTabTitle} in ${
          activeView === 'sales' ? 'Sales Performance' : 'Collection Tracking'
        }`,
      });
    }
  };

  const handleOnlineTabChange = async (newTab) => {
    selectedOnlineTabRef.current = newTab;
    setSelectedOnlineTab(newTab);
    try {
      const data = await fetchOnlineData(newTab);
      // Ignore stale responses if the user switched again meanwhile
      if (selectedOnlineTabRef.current === newTab) setOnlineData(data);
    } catch (err) {
      console.error('Failed to fetch online sales tab:', err);
      setError('Could not fetch online sales for the selected month.');
    }
  };

  const handleCollectionMonthChange = async (newGid) => {
    selectedCollectionGidRef.current = newGid;
    setSelectedCollectionGid(newGid);
    setIsLoading(true);
    try {
      const data = await fetchPaymentData(newGid);
      if (selectedCollectionGidRef.current === newGid) {
        setPaymentData(data);
      }
    } catch (err) {
      console.error('Failed to fetch collection tab for selected month:', err);
      setError('Could not fetch collection data for the selected month.');
    } finally {
      setIsLoading(false);
    }

    if (currentUserEmail) {
      const monthObj = COLLECTION_MONTHS.find((m) => String(m.gid) === String(newGid));
      const monthLabel = monthObj?.label || newGid;
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'FILTER_CHANGE',
        location: currentLocationLabel,
        details: `Changed Collection Month filter to ${monthLabel}`,
      });
    }
  };

  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    if (currentUserEmail) {
      const nextLoc = formatDashboardLocation(
        activeView,
        salesSubTab,
        collectionSubTab,
        newMonth
      );
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'FILTER_CHANGE',
        location: nextLoc,
        details: `Changed Sales Month filter to ${newMonth === 'ALL' ? 'All Months' : newMonth}`,
      });
    }
  };

  const handleManualRefresh = () => {
    loadData(false);
    if (currentUserEmail) {
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'DATA_REFRESH',
        location: currentLocationLabel,
        details: 'Triggered manual Google Sheets data sync',
      });
    }
  };

  // Download Executive PDF Report for Admin
  const handleDownloadReport = async (overrideMonth) => {
    const monthToUse = overrideMonth || selectedMonth;
    setIsGeneratingReport(true);
    try {
      const res = await generateExecutivePdfReport({
        salesRows,
        selectedMonth: monthToUse,
        paymentData,
        onlineData,
        currentUserEmail,
      });

      setReportToast({
        type: 'success',
        message: `Executive Report downloaded: ${res.filename} (${res.pages} pages)`,
      });

      if (currentUserEmail) {
        recordUserActivity({
          email: currentUserEmail,
          actionType: 'EXPORT_REPORT',
          location: currentLocationLabel,
          details: `Exported Executive PDF Report for month ${monthToUse}`,
        });
      }
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      setReportToast({
        type: 'error',
        message: 'Could not generate PDF report. Please try again.',
      });
    } finally {
      setIsGeneratingReport(false);
      setTimeout(() => {
        setReportToast(null);
      }, 5000);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      const baseUrl = ssoSession?.portal_url || DEFAULT_MAIN_PORTAL_URL;
      const separator = baseUrl.includes('?') ? '&' : '?';
      window.location.replace(`${baseUrl}${separator}restricted=true`);
    }
  }, [isAuthenticated, ssoSession]);

  // If user is not authenticated via MainApp Portal, redirect to MainApp Restricted page
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`app-container ${isFullscreen ? 'app-container--fullscreen' : ''}`}>
      {/* Collapsible Responsive Sidebar across all pages */}
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUserEmail={currentUserEmail}
        isAdmin={isAdmin}
        selectedMonth={selectedMonth}
        onDownloadReport={handleDownloadReport}
        isGeneratingReport={isGeneratingReport}
        onReturnToMainApp={handleReturnToMainApp}
        onLockDashboard={handleLockDashboard}
      />

      {/* Right Main Workspace */}
      <div className="app-workspace">
        <div className="app-topbar">
          <header className="app-header">
            <div className="app-header__branding">
              {/* Mobile Sidebar Trigger Button */}
              <button
                type="button"
                className="mobile-sidebar-trigger"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open Navigation Menu"
                title="Open Menu"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="app-header__logo-icon">
                {activeView === 'homepage' && <span style={{ filter: "grayscale(1) brightness(0) invert(1)" }}>👥</span>}
                {activeView === 'kpi' && '🎯'}
                {activeView === 'sales' && '💰'}
                {activeView === 'collection' && '💵'}
                {activeView === 'payment-update' && '📝'}
                {activeView === 'online' && '🛒'}
                {activeView === 'admin' && '🛡️'}
              </div>
              <div>
                <h1 className="app-header__title">
                  {activeView === 'homepage' && 'Account Managers'}
                  {activeView === 'kpi' && 'Balanced KPI'}
                  {activeView === 'sales' && 'Sales'}
                  {activeView === 'collection' && 'Collection'}
                  {activeView === 'payment-update' && 'Payment Updates'}
                  {activeView === 'online' && 'Online Sales'}
                  {activeView === 'admin' && 'Activity Tracker'}
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="app-header__mobile-logo"
              onClick={handleReturnToMainApp}
              title="Return to MainApp Portal"
              aria-label="Return to MainApp Portal"
            >
              <img src={wmdLogo} alt="WMD Company Logo" />
            </button>
          </header>

          <TvControls
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            availableMonths={availableMonths}
            onlineTabs={onlineTabs}
            selectedOnlineTab={selectedOnlineTab}
            onOnlineTabChange={handleOnlineTabChange}
            collectionMonths={COLLECTION_MONTHS}
            selectedCollectionGid={selectedCollectionGid}
            onCollectionMonthChange={handleCollectionMonthChange}
            activeView={activeView}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
            lastUpdated={lastUpdated}
            onManualRefresh={handleManualRefresh}
            isLoading={isLoading}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onLockDashboard={handleLockDashboard}
            onReturnToMainApp={handleReturnToMainApp}
          />
        </div>

        {/* Executive Report Download Toast Feedback */}
        {reportToast && (
          <div className={`report-toast-banner report-toast-banner--${reportToast.type}`}>
            <div className="report-toast-content">
              <span>{reportToast.type === 'success' ? '📄' : '⚠️'}</span>
              <span>{reportToast.message}</span>
            </div>
            <button
              type="button"
              className="report-toast-close"
              onClick={() => setReportToast(null)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error alert if any */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => loadData(false)}>
              Try Again
            </button>
          </div>
        )}

        {/* Main Content Area (Fitted 100vh on TV without page scroll) */}
        <main className="app-main">
          {activeView === 'homepage' ? (
            <HomepageDashboard />
          ) : activeView === 'admin' && isAdmin ? (
            <AdminActivityDashboard currentUserEmail={currentUserEmail} />
          ) : isLoading && salesRows.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Syncing real-time data from Google Sheets (Sales, Collection, Online)...</p>
            </div>
          ) : (
            <>
              {activeView === 'kpi' && (
                <KpiDashboard
                  salesRows={filteredSalesRows}
                  paymentData={paymentData}
                  selectedMonth={selectedMonth}
                />
              )}
              {activeView === 'sales' &&
                (salesSubTab === 'dashboard' ? (
                  <SalesDashboard rows={filteredSalesRows} />
                ) : (
                  <TableDashboard rows={filteredSalesRows} />
                ))}
              {activeView === 'collection' &&
                (collectionSubTab === 'dashboard' ? (
                  <CollectionDashboard data={paymentData} />
                ) : collectionSubTab === 'table' ? (
                  <CollectionTableDashboard rows={paymentData.rows} />
                ) : (
                  <PaymentUpdateTable data={paymentUpdateData} isLoading={isLoading} />
                ))}
              {activeView === 'payment-update' && (
                <PaymentUpdateTable data={paymentUpdateData} isLoading={isLoading} />
              )}
              {activeView === 'online' && <OnlineSalesDashboard data={onlineData} monthLabel={selectedOnlineTab} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
