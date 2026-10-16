// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PinLogin, { DASHBOARD_PIN, AUTH_STORAGE_KEY } from './components/PinLogin';
import Sidebar from './components/Sidebar';
import HomepageDashboard from './components/HomepageDashboard';
import SalesDashboard from './components/SalesDashboard';
import TableDashboard from './components/TableDashboard';
import CollectionDashboard from './components/CollectionDashboard';
import CollectionTableDashboard from './components/CollectionTableDashboard';
import OnlineSalesDashboard from './components/OnlineSalesDashboard';
import TvControls from './components/TvControls';
import { fetchSalesData, fetchPaymentData, fetchOnlineData } from './utils/fetchSheet';
import './styles.css';

const AUTO_REFRESH_INTERVAL_MS = 60000; // 60 seconds auto-sync

function App() {
  // Authentication state (PIN: 040903)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) === DASHBOARD_PIN;
    } catch {
      return false;
    }
  });

  // Active view: 'homepage' | 'sales' | 'collection' | 'online'
  const [activeView, setActiveView] = useState('homepage');

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
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const handleLockDashboard = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }
    setIsAuthenticated(false);
    setActiveView('homepage');
  };

  const handleLoginSuccess = () => {
    setActiveView('homepage');
    setIsAuthenticated(true);
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
  };

  // If user has not authenticated with PIN 040903, show the PIN Login Screen
  if (!isAuthenticated) {
    return <PinLogin onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`app-container ${isFullscreen ? 'app-container--fullscreen' : ''}`}>
      {/* Collapsible Responsive Sidebar across all pages */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
                {activeView === 'sales' && '💰'}
                {activeView === 'collection' && '💵'}
                {activeView === 'online' && '🛒'}
              </div>
              <div>
                <h1 className="app-header__title">
                  {activeView === 'homepage' && 'ACCOUNT MANAGERS'}
                  {activeView === 'sales' && 'SALES PERFORMANCE'}
                  {activeView === 'collection' && 'COLLECTION TRACKING'}
                  {activeView === 'online' && 'ONLINE SALES'}
                </h1>
              </div>
            </div>
          </header>

          <TvControls
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
            activeView={activeView}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
            lastUpdated={lastUpdated}
            onManualRefresh={() => loadData(false)}
            isLoading={isLoading}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onLockDashboard={handleLockDashboard}
          />
        </div>

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
          ) : isLoading && salesRows.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Syncing real-time data from Google Sheets (Sales, Collection, Online)...</p>
            </div>
          ) : (
            <>
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
