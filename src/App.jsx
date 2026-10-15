// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PinLogin, { DASHBOARD_PIN, AUTH_STORAGE_KEY } from './components/PinLogin';
import SalesDashboard from './components/SalesDashboard';
import CollectionDashboard from './components/CollectionDashboard';
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

  // Active view: 'sales' | 'collection' | 'online'
  const [activeView, setActiveView] = useState('sales');

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
  };

  // Filter sales rows according to selected month
  const filteredSalesRows = useMemo(() => {
    if (selectedMonth === 'ALL') return salesRows;
    return salesRows.filter((r) => r.month === selectedMonth);
  }, [salesRows, selectedMonth]);

  // If user has not authenticated with PIN 040903, show the PIN Login Screen
  if (!isAuthenticated) {
    return <PinLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`app-container ${isFullscreen ? 'app-container--fullscreen' : ''}`}>
      <div className="app-topbar">
        <header className="app-header">
          <div className="app-header__branding">
            <div className="app-header__logo-icon">📊</div>
            <div>
              <h1 className="app-header__title">
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
          onViewChange={setActiveView}
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
        {isLoading && salesRows.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Syncing real-time data from Google Sheets (Sales, Collection, Online)...</p>
          </div>
        ) : (
          <>
            {activeView === 'sales' && <SalesDashboard rows={filteredSalesRows} />}
            {activeView === 'collection' && <CollectionDashboard data={paymentData} />}
            {activeView === 'online' && <OnlineSalesDashboard data={onlineData} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
