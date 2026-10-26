// src/components/TvControls.jsx
import React from 'react';
import wmdLogo from '../assets/wmd-logo.jpg';
import './TvControls.css';

function TvControls({
  selectedMonth,
  onMonthChange,
  availableMonths,
  activeView,
  activeSubTab,
  onSubTabChange,
  lastUpdated,
  onManualRefresh,
  isLoading,
  isFullscreen,
  onToggleFullscreen,
  onLockDashboard,
}) {
  const showHeaderTabs = activeView === 'sales' || activeView === 'collection';

  return (
    <div className="tv-controls">
      {/* Left controls: Month selector & Dashboard/Table Tabs */}
      <div className="tv-controls__group tv-controls__left">
        {activeView === 'sales' || activeView === 'kpi' ? (
          <div className="tv-controls__item">
            <label htmlFor="month-select" className="tv-controls__label">
              MONTH:
            </label>
            <select
              id="month-select"
              className="tv-controls__select"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="tv-controls__item">
            <span className="tv-controls__label">PERIOD:</span>
            <span className="tv-controls__badge-pill">OCT 2026</span>
          </div>
        )}

        {/* Header Tabs for Sales & Collection: Dashboard vs Table */}
        {showHeaderTabs && (
          <div className="tv-view-switcher" role="tablist" aria-label="View Mode Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'dashboard'}
              className={`tv-view-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onSubTabChange('dashboard')}
              title="Dashboard View: KPIs, Scorecards & Charts"
            >
              📊 Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'table'}
              className={`tv-view-btn ${activeSubTab === 'table' ? 'active' : ''}`}
              onClick={() => onSubTabChange('table')}
              title="Table View: Searchable, Sortable & TV Scrollable Data Table"
            >
              📋 Table
            </button>
          </div>
        )}

        {/* Live Status indicator */}
        <div className="tv-controls__sync-status">
          <span className={`tv-controls__live-dot ${isLoading ? 'pulsing' : ''}`} />
          <span className="tv-controls__last-sync">
            {isLoading ? 'Syncing...' : `Live Synced: ${lastUpdated || 'Just now'}`}
          </span>
        </div>
      </div>

      {/* Right controls: Refresh, Fullscreen, Lock + WMD Company Logo */}
      <div className="tv-controls__group tv-controls__right">
        {/* Manual Refresh Button */}
        <button
          type="button"
          className="tv-btn tv-btn--refresh"
          onClick={onManualRefresh}
          disabled={isLoading}
          title="Fetch latest data from all Google Sheets"
        >
          <svg
            className={`tv-btn__icon ${isLoading ? 'spin' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Refresh</span>
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          className="tv-btn tv-btn--fullscreen"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Best for TV)'}
        >
          {isFullscreen ? (
            <svg className="tv-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg className="tv-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
          <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
        </button>

        {/* Lock / Logout Button */}
        <button
          type="button"
          className="tv-btn tv-btn--lock"
          onClick={onLockDashboard}
          title="Sign Out (Return to Login Screen)"
        >
          <svg className="tv-btn__icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Logout</span>
        </button>

        {/* WMD Company Logo on the Top Right */}
        <div className="tv-company-logo" title="WMD Sales & Collection Portal">
          <img
            src={wmdLogo}
            alt="WMD Company Logo"
            className="tv-company-logo__img"
          />
        </div>
      </div>
    </div>
  );
}

export default TvControls;
