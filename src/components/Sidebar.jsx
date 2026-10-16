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
        </nav>

        {/* Bottom Footer Info
        <div className="app-sidebar__footer">
          <div className="app-sidebar__status" title="Live Google Sheets Connected">
            <span className="app-sidebar__status-dot" />
            <span className="app-sidebar__status-text">LIVE TV PORTAL</span>
          </div>
        </div> */}
      </aside>
    </>
  );
}

export default Sidebar;
