// src/components/TvControls.jsx
import React from 'react';
import './TvControls.css';

function TvControls({
  selectedMonth,
  onMonthChange,
  availableMonths,
  isTvCycleActive,
  onToggleTvCycle,
  cycleSecondsRemaining,
  cycleDuration,
  lastUpdated,
  onManualRefresh,
  isLoading,
  isFullscreen,
  onToggleFullscreen,
}) {
  const cycleProgress = cycleDuration > 0
    ? ((cycleDuration - cycleSecondsRemaining) / cycleDuration) * 100
    : 0;

  return (
    <div className="tv-controls">
      <div className="tv-controls__group tv-controls__left">
        {/* Month Filter */}
        <div className="tv-controls__item">
          <label htmlFor="month-select" className="tv-controls__label">Month:</label>
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

        {/* Live Status indicator */}
        <div className="tv-controls__sync-status">
          <span className={`tv-controls__live-dot ${isLoading ? 'pulsing' : ''}`} />
          <span className="tv-controls__last-sync">
            {isLoading ? 'Updating data...' : `Synced: ${lastUpdated || 'Just now'}`}
          </span>
        </div>
      </div>

      <div className="tv-controls__group tv-controls__right">
        {/* Manual Refresh Button */}
        <button
          className="tv-btn tv-btn--secondary"
          onClick={onManualRefresh}
          disabled={isLoading}
          title="Fetch latest data from Google Sheets"
        >
          <svg className={`tv-btn__icon ${isLoading ? 'spin' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Refresh</span>
        </button>

        {/* TV Auto-Cycle Mode Button */}
        <button
          className={`tv-btn ${isTvCycleActive ? 'tv-btn--active-cycle' : 'tv-btn--secondary'}`}
          onClick={onToggleTvCycle}
          title={isTvCycleActive ? 'Pause TV Carousel' : 'Start Auto-Rotating Slides for TV Display'}
        >
          <svg className="tv-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
          <span>{isTvCycleActive ? `TV Mode (${cycleSecondsRemaining}s)` : 'TV Auto-Cycle'}</span>
          {isTvCycleActive && (
            <span className="tv-btn__progress-bar" style={{ width: `${cycleProgress}%` }} />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          className="tv-btn tv-btn--secondary"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Best for TV)'}
        >
          {isFullscreen ? (
            <svg className="tv-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg className="tv-btn__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>
    </div>
  );
}

export default TvControls;
