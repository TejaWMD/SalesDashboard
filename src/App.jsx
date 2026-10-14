// src/App.jsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import SalesDashboard from './components/SalesDashboard';
import CollectionDashboard from './components/CollectionDashboard';
import CombinedDashboard from './components/CombinedDashboard';
import TvControls from './components/TvControls';
import { fetchSheetData } from './utils/fetchSheet';
import './styles.css';

const TABS = ['combined', 'sales', 'collection'];
const CYCLE_DURATION_SECONDS = 20;
const AUTO_REFRESH_INTERVAL_MS = 60000; // 60 seconds

function App() {
  const [activeTab, setActiveTab] = useState('combined');
  const [rows, setRows] = useState([]);
  const [availableMonths, setAvailableMonths] = useState(['OCT']);
  const [selectedMonth, setSelectedMonth] = useState('OCT');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState(null);

  // TV Auto-Cycle Mode state
  const [isTvCycleActive, setIsTvCycleActive] = useState(false);
  const [cycleSecondsRemaining, setCycleSecondsRemaining] = useState(CYCLE_DURATION_SECONDS);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load data from Google Sheet
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSheetData();
      setRows(data.rows);
      setAvailableMonths(data.availableMonths);

      // Default to the first available month with active data if not set
      if (data.availableMonths.length > 0 && (!selectedMonth || selectedMonth === 'ALL')) {
        // Prefer OCT or the latest month
        const preferred = data.availableMonths.includes('OCT') ? 'OCT' : data.availableMonths[data.availableMonths.length - 1];
        setSelectedMonth(preferred);
      }

      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch Google Sheet data:', err);
      setError('Could not fetch data from Google Sheet. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  // Initial load & periodic auto-refresh (every 60s)
  useEffect(() => {
    loadData(false);
    const refreshInterval = setInterval(() => {
      loadData(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshInterval);
  }, [loadData]);

  // TV Mode Auto-Cycle Carousel (Rotates tabs every 20 seconds)
  useEffect(() => {
    if (!isTvCycleActive) {
      setCycleSecondsRemaining(CYCLE_DURATION_SECONDS);
      return;
    }

    const timer = setInterval(() => {
      setCycleSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Advance to next tab
          setActiveTab((currentTab) => {
            const nextIdx = (TABS.indexOf(currentTab) + 1) % TABS.length;
            return TABS[nextIdx];
          });
          return CYCLE_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTvCycleActive]);

  // Fullscreen change listener
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

  // Filter rows by selected month
  const filteredRows = useMemo(() => {
    if (selectedMonth === 'ALL') return rows;
    return rows.filter((r) => r.month === selectedMonth);
  }, [rows, selectedMonth]);

  return (
    <div className={`app-container ${isFullscreen ? 'app-container--fullscreen' : ''}`}>
      {/* Top Header */}
      <header className="app-header">
        <div className="app-header__branding">
          <div className="app-header__logo-icon">📊</div>
          <div>
            <h1 className="app-header__title">Executive Sales & Collection Dashboard</h1>
            <p className="app-header__subtitle">Real-time TV & Multi-outlet Performance Monitor</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="tab-nav">
          <button
            className={`tab-nav__btn ${activeTab === 'combined' ? 'active' : ''}`}
            onClick={() => setActiveTab('combined')}
          >
            Combined Overview
          </button>
          <button
            className={`tab-nav__btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            Sales Dashboard
          </button>
          <button
            className={`tab-nav__btn ${activeTab === 'collection' ? 'active' : ''}`}
            onClick={() => setActiveTab('collection')}
          >
            Collection Tracking
          </button>
        </nav>
      </header>

      {/* TV Controls & Sync Status Bar */}
      <TvControls
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        availableMonths={availableMonths}
        isTvCycleActive={isTvCycleActive}
        onToggleTvCycle={handleToggleTvCycle}
        cycleSecondsRemaining={cycleSecondsRemaining}
        cycleDuration={CYCLE_DURATION_SECONDS}
        lastUpdated={lastUpdated}
        onManualRefresh={() => loadData(false)}
        isLoading={isLoading}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Error alert if any */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => loadData(false)}>Try Again</button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main">
        {isLoading && rows.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Fetching real-time data from Google Sheet...</p>
          </div>
        ) : (
          <>
            {activeTab === 'combined' && <CombinedDashboard rows={filteredRows} />}
            {activeTab === 'sales' && <SalesDashboard rows={filteredRows} />}
            {activeTab === 'collection' && <CollectionDashboard rows={filteredRows} />}
          </>
        )}
      </main>

      {/* Footer info for TV display */}
      <footer className="app-footer">
        <span>Connected to Google Sheet: <strong>Data for TV</strong></span>
        <span>•</span>
        <span>Auto-sync every 60s</span>
        <span>•</span>
        <span>Display optimized for Smart TV & Dashboard Monitors</span>
      </footer>
    </div>
  );
}

export default App;
