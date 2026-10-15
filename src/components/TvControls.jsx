// src/components/TvControls.jsx
import React from 'react';
import './TvControls.css';

function TvControls({
  selectedMonth,
  onMonthChange,
  availableMonths,
  activeView,
  onViewChange,
  lastUpdated,
  onManualRefresh,
  isLoading,
  isFullscreen,
  onToggleFullscreen,
  onLockDashboard,
}) {
  return (
    <div className="tv-controls">
      {/* Left controls: Month selector & Quick View switch */}
      <div className="tv-controls__group tv-controls__left">
        {activeView === 'sales' ? (
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

        {/* View mode switcher: Sales, Collection, Online Sales */}
        <div className="tv-view-switcher">
          <button
            type="button"
            className={`tv-view-btn ${activeView === 'sales' ? 'active' : ''}`}
            onClick={() => onViewChange('sales')}
            title="Sales Dashboard: Target vs Actual Sales, PIC Scorecards & Charts"
          >
            💰 Sales
          </button>
          <button
            type="button"
            className={`tv-view-btn ${activeView === 'collection' ? 'active' : ''}`}
            onClick={() => onViewChange('collection')}
            title="Collection Dashboard: Payment Collected vs Pending & AM Performance"
          >
            💵 Collection
          </button>
          <button
            type="button"
            className={`tv-view-btn ${activeView === 'online' ? 'active' : ''}`}
            onClick={() => onViewChange('online')}
            title="Online Sales Dashboard: Shopee & TikTok Ecommerce Performance"
          >
            🛒 Online Sales
          </button>
        </div>

        {/* Live Status indicator */}
        <div className="tv-controls__sync-status">
          <span className={`tv-controls__live-dot ${isLoading ? 'pulsing' : ''}`} />
          <span className="tv-controls__last-sync">
            {isLoading ? 'Syncing...' : `Live Synced: ${lastUpdated || 'Just now'}`}
          </span>
        </div>
      </div>

      {/* Right controls: Refresh, Fullscreen, Lock */}
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

        {/* Lock / Logout PIN Button */}
        <button
          type="button"
          className="tv-btn tv-btn--lock"
          onClick={onLockDashboard}
          title="Lock Dashboard (Return to PIN Screen)"
        >
          <svg className="tv-btn__icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Lock</span>
        </button>
      </div>
    </div>
  );
}

export default TvControls;
