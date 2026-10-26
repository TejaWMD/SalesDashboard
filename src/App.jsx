// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PinLogin, {
  AUTH_STORAGE_KEY,
  getStoredUserEmail,
  isAdminEmail,
} from './components/PinLogin';
import Sidebar from './components/Sidebar';
import HomepageDashboard from './components/HomepageDashboard';
import KpiDashboard from './components/KpiDashboard';
import SalesDashboard from './components/SalesDashboard';
import TableDashboard from './components/TableDashboard';
import CollectionDashboard from './components/CollectionDashboard';
import CollectionTableDashboard from './components/CollectionTableDashboard';
import OnlineSalesDashboard from './components/OnlineSalesDashboard';
import AdminActivityDashboard from './components/AdminActivityDashboard';
import TvControls from './components/TvControls';
import { fetchSalesData, fetchPaymentData, fetchOnlineData } from './utils/fetchSheet';
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
  // Currently authenticated user email (persisted in localStorage)
  const [currentUserEmail, setCurrentUserEmail] = useState(() => getStoredUserEmail());
  const isAuthenticated = Boolean(currentUserEmail);
  const isAdmin = useMemo(() => isAdminEmail(currentUserEmail), [currentUserEmail]);

  // Active view: 'homepage' | 'kpi' | 'sales' | 'collection' | 'online' | 'admin'
  const [activeView, setActiveView] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v && ['homepage', 'kpi', 'sales', 'collection', 'online', 'admin'].includes(v)) {
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
      const [salesRes, paymentRes, onlineRes] = await Promise.all([
        fetchSalesData(),
        fetchPaymentData(),
        fetchOnlineData(),
      ]);

      setSalesRows(salesRes.rows);
      setAvailableMonths(salesRes.availableMonths);
      setPaymentData(paymentRes);
      setOnlineData(onlineRes);

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

  const handleLockDashboard = () => {
    if (currentUserEmail) {
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'LOGOUT',
        location: currentLocationLabel,
        details: 'Signed out of dashboard',
        status: 'offline',
      });
    }
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }
    setCurrentUserEmail(null);
    setActiveView('homepage');
  };

  const handleLoginSuccess = (loggedInEmail) => {
    const cleanEmail = String(loggedInEmail || getStoredUserEmail() || '')
      .trim()
      .toLowerCase();
    setCurrentUserEmail(cleanEmail);
    setActiveView('homepage');
    recordUserActivity({
      email: cleanEmail,
      actionType: 'LOGIN',
      location: 'Homepage (Account Managers)',
      details: 'Signed in to the dashboard',
      status: 'online',
    });
  };

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
      recordUserActivity({
        email: currentUserEmail,
        actionType: 'SUBTAB_CHANGE',
        location: nextLoc,
        details: `Switched to ${tab === 'table' ? 'Table View' : 'Dashboard View'} in ${
          activeView === 'sales' ? 'Sales Performance' : 'Collection Tracking'
        }`,
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

  // If user is not authenticated, show the Login Screen
  if (!isAuthenticated) {
    return <PinLogin onSuccess={handleLoginSuccess} />;
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
        availableMonths={availableMonths}
        onMonthChange={handleMonthChange}
        onDownloadReport={handleDownloadReport}
        isGeneratingReport={isGeneratingReport}
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
                {activeView === 'online' && '🛒'}
                {activeView === 'admin' && '🛡️'}
              </div>
              <div>
                <h1 className="app-header__title">
                  {activeView === 'homepage' && 'ACCOUNT MANAGERS'}
                  {activeView === 'kpi' && 'ACCOUNT MANAGERS BALANCED KPI'}
                  {activeView === 'sales' && 'SALES PERFORMANCE'}
                  {activeView === 'collection' && 'COLLECTION TRACKING'}
                  {activeView === 'online' && 'ONLINE SALES'}
                  {activeView === 'admin' && 'ADMIN USER & ACTIVITY TRACKER'}
                </h1>
              </div>
            </div>
          </header>

          <TvControls
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            availableMonths={availableMonths}
            activeView={activeView}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
            lastUpdated={lastUpdated}
            onManualRefresh={handleManualRefresh}
            isLoading={isLoading}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onLockDashboard={handleLockDashboard}
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
                ) : (
                  <CollectionTableDashboard rows={paymentData.rows} />
                ))}
              {activeView === 'online' && <OnlineSalesDashboard data={onlineData} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
