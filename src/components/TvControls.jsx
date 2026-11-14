// src/components/TvControls.jsx
import React from 'react';
import wmdLogo from '../assets/wmd-logo.jpg';
import './TvControls.css';

function TvControls({
  selectedMonth,
  onMonthChange,
  availableMonths,
  onlineTabs = [],
  selectedOnlineTab = '',
  onOnlineTabChange,
  collectionMonths = [],
  selectedCollectionGid = '',
  onCollectionMonthChange,
  activeView,
  activeSubTab,
  onSubTabChange,
  lastUpdated,
  onManualRefresh,
  isLoading,
  isFullscreen,
  onToggleFullscreen,
  onReturnToMainApp,
}) {
  const showHeaderTabs = activeView === 'sales' || activeView === 'collection';

  return (
    <div className="tv-controls">
      {/* Left controls: Month selector & Dashboard/Table Tabs */}
      <div className="tv-controls__group tv-controls__left">
        {activeView === 'sales' || activeView === 'kpi' ? (
          <div className="tv-controls__item">
            <label htmlFor="month-select" className="tv-controls__label">
              Month
            </label>
            <select
              id="month-select"
              aria-label="Select sales month"
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
        ) : activeView === 'online' && onlineTabs.length > 0 ? (
          <div className="tv-controls__item">
            <label htmlFor="online-month-select" className="tv-controls__label">
              Month
            </label>
            <select
              id="online-month-select"
              aria-label="Select online month"
              className="tv-controls__select"
              value={selectedOnlineTab}
              onChange={(e) => onOnlineTabChange(e.target.value)}
            >
              {onlineTabs.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ) : activeView === 'collection' && collectionMonths.length > 0 ? (
          <div className="tv-controls__item">
            <label htmlFor="collection-month-select" className="tv-controls__label">
              Month
            </label>
            <select
              id="collection-month-select"
              aria-label="Select collection month"
              className="tv-controls__select"
              value={selectedCollectionGid}
              onChange={(e) => onCollectionMonthChange(e.target.value)}
            >
              {collectionMonths.map((m) => (
                <option key={m.gid} value={m.gid}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Header Tabs for Sales & Collection: Dashboard vs Table */}
        {showHeaderTabs && (
          <div className="tv-view-switcher" role="tablist" aria-label="View Mode Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'dashboard'}
              className={`tv-view-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onSubTabChange('dashboard')}
              title="Dashboard View"
            >
              Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'table'}
              className={`tv-view-btn ${activeSubTab === 'table' ? 'active' : ''}`}
              onClick={() => onSubTabChange('table')}
              title="Table View"
            >
              Table
            </button>
            {activeView === 'collection' && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'payment-update'}
                className={`tv-view-btn ${activeSubTab === 'payment-update' ? 'active' : ''}`}
                onClick={() => onSubTabChange('payment-update')}
                title="Payment Updates"
              >
                Updates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right controls: Live sync, Refresh, Fullscreen (desktop/TV), WMD Logo (desktop/TV) */}
      <div className="tv-controls__group tv-controls__right">
        <div
          className="tv-controls__sync-status"
          title={isLoading ? 'Syncing Google Sheets...' : `Last synced: ${lastUpdated || 'Just now'}`}
        >
          <span className={`tv-controls__live-dot ${isLoading ? 'pulsing' : ''}`} />
          <span className="tv-controls__last-sync">
            {isLoading ? 'Syncing...' : lastUpdated || 'Live'}
          </span>
        </div>

        {/* Manual Refresh Button (icon-only) */}
        <button
          type="button"
          className="tv-btn tv-btn--icon tv-btn--refresh"
          onClick={onManualRefresh}
          disabled={isLoading}
          title="Refresh data"
          aria-label="Refresh data"
        >
          <svg
            className={`tv-btn__icon ${isLoading ? 'spin' : ''}`}
            width="15"
            height="15"
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
        </button>

        {/* Fullscreen Button (desktop/TV only) */}
        <button
          type="button"
          className="tv-btn tv-btn--icon tv-btn--fullscreen"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg className="tv-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg className="tv-btn__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </button>

        {/* WMD Company Logo Button -> Return to MainApp Homepage (desktop/TV) */}
        <button
          type="button"
          className="tv-company-logo tv-company-logo--btn"
          onClick={onReturnToMainApp}
          title="Main Portal"
          aria-label="Return to Main Portal"
        >
          <img
            src={wmdLogo}
            alt="WMD Logo"
            className="tv-company-logo__img"
          />
        </button>
      </div>
    </div>
  );
}

export default TvControls;
