// src/components/Sidebar.jsx
import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    id: 'homepage',
    label: 'Homepage',
    icon: '🏠',
    description: 'Account Managers',
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: '💰',
    description: 'Sales Performance',
  },
  {
    id: 'collection',
    label: 'Collection',
    icon: '💵',
    description: 'Collection Tracking',
  },
  {
    id: 'online',
    label: 'Online',
    icon: '🛒',
    description: 'Online Sales Performance',
  },
];

function Sidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  currentUserEmail,
  isAdmin,
  selectedMonth = 'OCT',
  availableMonths = ['OCT'],
  onMonthChange,
  onDownloadReport,
  isGeneratingReport = false,
}) {
  const handleSelect = (viewId) => {
    onViewChange(viewId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'sidebar-backdrop--visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={`app-sidebar ${isCollapsed ? 'app-sidebar--collapsed' : 'app-sidebar--expanded'} ${
          isMobileOpen ? 'app-sidebar--mobile-open' : ''
        }`}
        aria-label="Main Navigation"
      >
        {/* Top Header / Collapse Toggle */}
        <div className="app-sidebar__header">
          <div className="app-sidebar__brand">
            <span className="app-sidebar__brand-icon">📊</span>
            <span className="app-sidebar__brand-text">MENU</span>
          </div>

          <button
            type="button"
            className="app-sidebar__toggle-btn"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <svg
              className={`app-sidebar__toggle-svg ${isCollapsed ? 'rotated' : ''}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="app-sidebar__mobile-close"
            onClick={onCloseMobile}
            aria-label="Close Navigation Menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`app-sidebar__link ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.id)}
                title={item.description}
              >
                <span className="app-sidebar__link-icon">{item.icon}</span>
                <span className="app-sidebar__link-label">{item.label}</span>
                {isActive && <span className="app-sidebar__active-indicator" />}
              </button>
            );
          })}

          {/* Admin-Only Tracking & PDF Report Section */}
          {isAdmin && (
            <div className="app-sidebar__admin-section">
              <div className="app-sidebar__section-divider">
                <span>ADMIN ACCESS</span>
              </div>

              {/* Sub-header for Tracking */}
              <div className="app-sidebar__section-divider app-sidebar__section-divider--sub">
                <span>TRACKING</span>
              </div>

              {/* User Activity Tracker */}
              <button
                type="button"
                className={`app-sidebar__link app-sidebar__link--admin ${
                  activeView === 'admin' ? 'active' : ''
                }`}
                onClick={() => handleSelect('admin')}
                title="Track User Logins, Live Status & Dashboard Activity"
              >
                <span className="app-sidebar__link-icon">🛡️</span>
                <span className="app-sidebar__link-label">User Tracker</span>
                {activeView === 'admin' && (
                  <span className="app-sidebar__active-indicator" />
                )}
              </button>

              {/* Sub-header for Report */}
              <div className="app-sidebar__section-divider app-sidebar__section-divider--sub">
                <span>REPORT</span>
              </div>

              {/* Sales Month Selector for Executive Report */}
              {availableMonths && availableMonths.length > 0 && (
                <div
                  className="app-sidebar__month-picker-box"
                  title="Select Sales month for PDF report"
                >
                  <label htmlFor="sidebar-month-select" className="app-sidebar__month-label">
                    <span>SALES MONTH:</span>
                  </label>
                  <select
                    id="sidebar-month-select"
                    className="app-sidebar__month-select"
                    value={selectedMonth}
                    onChange={(e) => onMonthChange && onMonthChange(e.target.value)}
                  >
                    <option value="ALL">All Months</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Download Executive PDF Report Button */}
              <button
                type="button"
                className={`app-sidebar__link app-sidebar__link--report ${
                  isGeneratingReport ? 'loading' : ''
                }`}
                onClick={() => {
                  if (!isGeneratingReport && onDownloadReport) {
                    onDownloadReport();
                  }
                }}
                disabled={isGeneratingReport}
                title={`Download Sales & Collection Report as PDF (Sales Month: ${selectedMonth})`}
              >
                <span className="app-sidebar__link-icon">
                  {isGeneratingReport ? (
                    <span className="app-sidebar__spinner" />
                  ) : (
                    '📑'
                  )}
                </span>
                <span className="app-sidebar__link-label">
                  {isGeneratingReport ? 'Exporting PDF...' : 'Executive Report'}
                </span>
                <span
                  className="app-sidebar__report-badge"
                  title={`Current Sales Period: ${selectedMonth}`}
                >
                  {isGeneratingReport ? '...' : selectedMonth || 'PDF'}
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom Logged-In User Account Pill */}
        {currentUserEmail && (
          <div className="app-sidebar__footer">
            <div
              className={`app-sidebar__user-card ${
                isAdmin ? 'app-sidebar__user-card--admin' : ''
              }`}
              title={`Logged in as: ${currentUserEmail}${isAdmin ? ' (Admin)' : ''}`}
            >
              <div className="app-sidebar__user-avatar">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="app-sidebar__user-online-dot" />
              </div>
              <div className="app-sidebar__user-info">
                <span className="app-sidebar__user-role">
                  {isAdmin ? 'ADMIN ACCOUNT' : 'LOGGED IN'}
                </span>
                <span className="app-sidebar__user-email">{currentUserEmail}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default Sidebar;