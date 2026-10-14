// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import PinLogin, { DASHBOARD_PIN, AUTH_STORAGE_KEY } from './components/PinLogin';
import OverviewDashboard from './components/OverviewDashboard';
import ChartsDashboard from './components/ChartsDashboard';
import TableDashboard from './components/TableDashboard';
import CombinedDashboard from './components/CombinedDashboard';
import TvControls from './components/TvControls';
import { fetchSheetData } from './utils/fetchSheet';
import './styles.css';

const TV_CYCLE_TABS = ['overview', 'charts', 'table'];
const CYCLE_DURATION_SECONDS = 25;
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

  // Active view: 'overview' | 'charts' | 'table' | 'combined'
  const [activeView, setActiveView] = useState('overview');

  // Sheet data states
  const [rows, setRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState(['OCT']);
  const [selectedMonth, setSelectedMonth] = useState('OCT');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState(null);

  // TV Auto-Cycle Mode
  const [isTvCycleActive, setIsTvCycleActive] = useState(false);
  const [cycleSecondsRemaining, setCycleSecondsRemaining] = useState(CYCLE_DURATION_SECONDS);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch real-time data from Google Sheet
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSheetData();
      setRows(data.rows);
      setAvailableMonths(data.availableMonths);

      // Default to OCT or the month with active data if not set
      if (data.availableMonths.length > 0 && (!selectedMonth || selectedMonth === 'ALL')) {
        const preferred = data.availableMonths.includes('OCT')
          ? 'OCT'
          : data.availableMonths[data.availableMonths.length - 1];
        setSelectedMonth(preferred);
      }

      const now = new Date();
      setLastUpdated(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to fetch Google Sheet data:', err);
      setError('Could not fetch data from Google Sheet. Please verify internet connection.');
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

  // TV Mode Auto-Cycle Carousel (Rotates views every 25 seconds)
  useEffect(() => {
    if (!isTvCycleActive) {
      setCycleSecondsRemaining(CYCLE_DURATION_SECONDS);
      return;
    }

    const timer = setInterval(() => {
      setCycleSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Advance to next view in cycle
          setActiveView((current) => {
            const currentIdx = TV_CYCLE_TABS.indexOf(current);
            const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % TV_CYCLE_TABS.length;
            return TV_CYCLE_TABS[nextIdx];
          });
          return CYCLE_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTvCycleActive]);

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

  const handleToggleTvCycle = () => {
    setIsTvCycleActive((prev) => !prev);
    setCycleSecondsRemaining(CYCLE_DURATION_SECONDS);
  };

  const handleLockDashboard = () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }
    setIsAuthenticated(false);
  };

  // Filter rows strictly according to selected month
  const filteredRows = useMemo(() => {
    if (selectedMonth === 'ALL') return rows;
    return rows.filter((r) => r.month === selectedMonth);
  }, [rows, selectedMonth]);

  // If user has not authenticated with PIN 040903, show the PIN Login Screen
  if (!isAuthenticated) {
    return <PinLogin onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`app-container ${isFullscreen ? 'app-container--fullscreen' : ''}`}>
      {/* Top Header */}
      <header className="app-header">
        <div className="app-header__branding">
          <div className="app-header__logo-icon">📊</div>
          <div>
            <h1 className="app-header__title">Executive Sales & Collection Portal</h1>
            <p className="app-header__subtitle">
              Live TV & Multi-Outlet Monitor • Google Sheet: Data for TV
            </p>
          </div>
        </div>

        {/* Quick View Navigation */}
        <nav className="tab-nav">
          <button
            type="button"
            className={`tab-nav__btn ${activeView === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            📊 TV Overview
          </button>
          <button
            type="button"
            className={`tab-nav__btn ${activeView === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveView('charts')}
          >
            📈 Comparison Charts
          </button>
          <button
            type="button"
            className={`tab-nav__btn ${activeView === 'table' ? 'active' : ''}`}
            onClick={() => setActiveView('table')}
          >
            📋 Master Table
          </button>
          <button
            type="button"
            className={`tab-nav__btn ${activeView === 'combined' ? 'active' : ''}`}
            onClick={() => setActiveView('combined')}
          >
            📑 Extended Detail
          </button>
        </nav>
      </header>

      {/* TV Controls & Sync Status Bar */}
      <TvControls
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        activeView={activeView}
        onViewChange={setActiveView}
        isTvCycleActive={isTvCycleActive}
        onToggleTvCycle={handleToggleTvCycle}
        cycleSecondsRemaining={cycleSecondsRemaining}
        cycleDuration={CYCLE_DURATION_SECONDS}
        lastUpdated={lastUpdated}
        onManualRefresh={() => loadData(false)}
        isLoading={isLoading}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onLockDashboard={handleLockDashboard}
      />

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
        {isLoading && rows.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Fetching real-time data from Google Sheet ("Data for TV")...</p>
          </div>
        ) : (
          <>
            {activeView === 'overview' && <OverviewDashboard rows={filteredRows} />}
            {activeView === 'charts' && <ChartsDashboard rows={filteredRows} />}
            {activeView === 'table' && <TableDashboard rows={filteredRows} />}
            {activeView === 'combined' && <CombinedDashboard rows={filteredRows} />}
          </>
        )}
      </main>

      {/* Minimal Footer for TV Screen */}
      <footer className="app-footer">
        <span>Connected to Google Sheet: <strong>Data for TV</strong></span>
        <span>•</span>
        <span>Auto-sync active (60s)</span>
        <span>•</span>
        <span>PIN Protected</span>
        <span>•</span>
        <span>Optimized for Smart TV, Laptop & Mobile</span>
      </footer>
    </div>
  );
}

export default App;
