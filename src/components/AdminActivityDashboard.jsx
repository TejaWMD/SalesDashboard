// src/components/AdminActivityDashboard.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  getAllTrackedUsers,
  getActivityLogs,
  clearActivityLogs,
  subscribeToActivityUpdates,
  syncFromCloud,
} from '../utils/activityTracker';
import './AdminActivityDashboard.css';

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Never';

  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatExactDateTime(isoString) {
  if (!isoString) return 'No access recorded yet';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'No access recorded yet';
  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function getActionBadgeMeta(actionType) {
  switch (actionType) {
    case 'LOGIN':
      return { label: 'LOGIN', className: 'admin-action-badge--login' };
    case 'LOGOUT':
      return { label: 'LOGOUT', className: 'admin-action-badge--logout' };
    case 'NAVIGATION':
      return { label: 'PAGE VIEW', className: 'admin-action-badge--nav' };
    case 'SUBTAB_CHANGE':
      return { label: 'TAB SWITCH', className: 'admin-action-badge--tab' };
    case 'FILTER_CHANGE':
      return { label: 'FILTER', className: 'admin-action-badge--filter' };
    case 'DATA_REFRESH':
      return { label: 'REFRESH', className: 'admin-action-badge--refresh' };
    case 'FULLSCREEN_TOGGLE':
      return { label: 'DISPLAY', className: 'admin-action-badge--display' };
    case 'ADMIN_ACTION':
      return { label: 'ADMIN', className: 'admin-action-badge--admin' };
    default:
      return { label: actionType || 'ACTIVITY', className: 'admin-action-badge--nav' };
  }
}

function AdminActivityDashboard({ currentUserEmail }) {
  const [users, setUsers] = useState(() => getAllTrackedUsers());
  const [logs, setLogs] = useState(() => getActivityLogs());
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => Date.now());

  const refreshTrackerState = () => {
    setUsers(getAllTrackedUsers());
    setLogs(getActivityLogs());
  };

  const handleManualCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      await syncFromCloud();
      refreshTrackerState();
      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn('Manual cloud sync error:', err);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  useEffect(() => {
    handleManualCloudSync();
    const unsubscribe = subscribeToActivityUpdates(() => {
      refreshTrackerState();
      setLastSyncTime(Date.now());
    });

    // Local ticker: re-renders relative times ("Just now", "X s ago") and re-evaluates
    // active status every 2 seconds without waiting for network
    const ticker = setInterval(refreshTrackerState, 2000);

    // Periodic cloud poll every 8 seconds
    const cloudTimer = setInterval(() => {
      syncFromCloud()
        .then(() => {
          refreshTrackerState();
          setLastSyncTime(Date.now());
        })
        .catch(() => {});
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(ticker);
      clearInterval(cloudTimer);
    };
  }, []);

  const summaryStats = useMemo(() => {
    const totalAccounts = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    const standardCount = totalAccounts - adminCount;
    const onlineUsers = users.filter((u) => u.isOnline);
    const accessedUsers = users.filter((u) => u.lastAccessedAt);

    let mostRecentUser = null;
    users.forEach((u) => {
      if (!u.lastAccessedAt) return;
      if (
        !mostRecentUser ||
        new Date(u.lastAccessedAt).getTime() > new Date(mostRecentUser.lastAccessedAt).getTime()
      ) {
        mostRecentUser = u;
      }
    });

    return {
      totalAccounts,
      adminCount,
      standardCount,
      onlineCount: onlineUsers.length,
      onlineEmails: onlineUsers.map((u) => u.email),
      accessedCount: accessedUsers.length,
      totalLogsCount: logs.length,
      mostRecentUser,
    };
  }, [users, logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (selectedUserFilter !== 'ALL' && entry.email !== selectedUserFilter) {
        return false;
      }
      if (selectedActionFilter !== 'ALL' && entry.actionType !== selectedActionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchEmail = entry.email?.toLowerCase().includes(q);
        const matchLocation = entry.location?.toLowerCase().includes(q);
        const matchDetails = entry.details?.toLowerCase().includes(q);
        if (!matchEmail && !matchLocation && !matchDetails) return false;
      }
      return true;
    });
  }, [logs, selectedUserFilter, selectedActionFilter, searchQuery]);

  const handleClearLogs = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    clearActivityLogs(currentUserEmail);
    setConfirmClear(false);
    refreshTrackerState();
  };

  return (
    <div className="admin-tracker-page">
      {/* Top KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card admin-kpi-card--Online">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">CURRENTLY IN DASHBOARD</span>
            <span className="admin-kpi-card__icon">🟢</span>
          </div>
          <div className="admin-kpi-card__value">{summaryStats.onlineCount} Active</div>
          <div className="admin-kpi-card__sub">
            {summaryStats.onlineCount > 0
              ? summaryStats.onlineEmails.join(', ')
              : 'No active sessions detected'}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">AUTHORIZED ACCOUNTS</span>
            <span className="admin-kpi-card__icon">👥</span>
          </div>
          <div className="admin-kpi-card__value">{summaryStats.totalAccounts} Users</div>
          <div className="admin-kpi-card__sub">
            {summaryStats.adminCount} Admin • {summaryStats.standardCount} Standard Accounts
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">ACCOUNTS WITH HISTORY</span>
            <span className="admin-kpi-card__icon">🔐</span>
          </div>
          <div className="admin-kpi-card__value">
            {summaryStats.accessedCount} / {summaryStats.totalAccounts}
          </div>
          <div className="admin-kpi-card__sub">
            Users who have signed in at least once
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__top">
            <span className="admin-kpi-card__label">TRACKED ACTIVITY EVENTS</span>
            <span className="admin-kpi-card__icon">📋</span>
          </div>
          <div className="admin-kpi-card__value">{summaryStats.totalLogsCount}</div>
          <div className="admin-kpi-card__sub">
            {summaryStats.mostRecentUser
              ? `Latest: ${summaryStats.mostRecentUser.email} (${formatRelativeTime(
                  summaryStats.mostRecentUser.lastAccessedAt
                )})`
              : 'Real-time audit trail active'}
          </div>
        </div>
      </div>

      {/* Main Two-Column Content: Live User Status Table + Activity Audit Log */}
      <div className="admin-tracker-workspace">
        {/* Left Panel: All Authorized Users - Who's Doing What & Last Access */}
        <section className="admin-panel admin-panel--users">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">
                <span>👤</span> USER ACCESS & LIVE LOCATION STATUS
              </h2>
              {/* <p className="admin-panel__subtitle">
                Live multi-device cloud sync active • Click any account row to filter history
              </p> */}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {selectedUserFilter !== 'ALL' && (
                <button
                  type="button"
                  className="admin-reset-filter-btn"
                  onClick={() => setSelectedUserFilter('ALL')}
                >
                  Show All Users ✕
                </button>
              )}
              <button
                type="button"
                className="admin-reset-filter-btn"
                onClick={handleManualCloudSync}
                disabled={isSyncingCloud}
                title="Sync latest activity across all PCs, laptops & devices"
              >
                {isSyncingCloud ? 'Syncing...' : '☁️ Sync Devices'}
              </button>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>ACCOUNT EMAIL</th>
                  <th>STATUS</th>
                  <th>WHERE ARE THEY (PAGE / VIEW)</th>
                  <th>WHAT ARE THEY DOING</th>
                  <th>LAST ACCESSED</th>
                  <th className="text-right">LOGINS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isCurrentUser =
                    currentUserEmail &&
                    user.email.toLowerCase() === currentUserEmail.toLowerCase();
                  const isSelected = selectedUserFilter === user.email;

                  return (
                    <tr
                      key={user.email}
                      className={`admin-user-row ${isSelected ? 'admin-user-row--selected' : ''} ${
                        user.isOnline ? 'admin-user-row--online' : ''
                      }`}
                      onClick={() =>
                        setSelectedUserFilter((prev) =>
                          prev === user.email ? 'ALL' : user.email
                        )
                      }
                      title="Click to filter activity logs for this user"
                    >
                      <td>
                        <div className="admin-user-cell">
                          <span className="admin-user-email">{user.email}</span>
                          <div className="admin-user-badges">
                            <span
                              className={`admin-role-badge ${
                                user.role === 'admin'
                                  ? 'admin-role-badge--admin'
                                  : 'admin-role-badge--user'
                              }`}
                            >
                              {user.role === 'admin' ? 'ADMIN' : 'USER'}
                            </span>
                            {isCurrentUser && (
                              <span className="admin-you-badge">YOU</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        {user.isOnline ? (
                          <span className="admin-status-pill admin-status-pill--online">
                            <span className="admin-status-dot admin-status-dot--online" />
                            Active Now
                          </span>
                        ) : user.lastAccessedAt ? (
                          <span className="admin-status-pill admin-status-pill--offline">
                            <span className="admin-status-dot admin-status-dot--offline" />
                            Offline
                          </span>
                        ) : (
                          <span className="admin-status-pill admin-status-pill--never">
                            <span className="admin-status-dot admin-status-dot--never" />
                            Never Signed In
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="admin-location-cell">
                          <span className="admin-location-text">
                            {user.currentLocation}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="admin-action-desc">{user.lastAction}</span>
                      </td>

                      <td>
                        <div className="admin-time-cell">
                          <span className="admin-time-relative">
                            {formatRelativeTime(user.lastAccessedAt)}
                          </span>
                          <span className="admin-time-exact">
                            {formatExactDateTime(user.lastAccessedAt)}
                          </span>
                        </div>
                      </td>

                      <td className="text-right">
                        <span className="admin-login-count">{user.totalLogins}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Panel: Chronological Activity & Audit Feed */}
        <section className="admin-panel admin-panel--logs">
          <div className="admin-panel__header">
            <div>
              <h2 className="admin-panel__title">
                <span>🕒</span> REAL-TIME ACTIVITY LOG
              </h2>
              {/* <p className="admin-panel__subtitle">
                Every sign-in, page switch, filter change & action across the dashboard
              </p> */}
            </div>

            <button
              type="button"
              className={`admin-clear-btn ${confirmClear ? 'admin-clear-btn--confirm' : ''}`}
              onClick={handleClearLogs}
              title="Clear stored activity log history"
            >
              {confirmClear ? 'Click Again to Confirm' : 'Clear Logs'}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="admin-log-filters">
            <select
              className="admin-filter-select"
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              aria-label="Filter by User Account"
            >
              <option value="ALL">All Accounts ({users.length})</option>
              {users.map((u) => (
                <option key={u.email} value={u.email}>
                  {u.email} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>

            <select
              className="admin-filter-select"
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              aria-label="Filter by Action Type"
            >
              <option value="ALL">All Actions</option>
              <option value="LOGIN">Sign In</option>
              <option value="LOGOUT">Sign Out</option>
              <option value="NAVIGATION">Page Navigation</option>
              <option value="SUBTAB_CHANGE">Dashboard / Table Switch</option>
              <option value="FILTER_CHANGE">Month Filter</option>
              <option value="DATA_REFRESH">manual Refresh</option>
            </select>

            <input
              type="text"
              className="admin-filter-search"
              placeholder="Search email, page, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Activity Feed List */}
          <div className="admin-logs-list">
            {filteredLogs.length === 0 ? (
              <div className="admin-logs-empty">
                <p>No activity events match the current filters.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const badge = getActionBadgeMeta(log.actionType);
                return (
                  <div key={log.id} className="admin-log-item">
                    <div className="admin-log-item__top">
                      <div className="admin-log-item__user">
                        <span className={`admin-action-badge ${badge.className}`}>
                          {badge.label}
                        </span>
                        <span className="admin-log-item__email">{log.email}</span>
                        {log.role === 'admin' && (
                          <span className="admin-role-badge admin-role-badge--admin">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span
                        className="admin-log-item__time"
                        title={formatExactDateTime(log.timestamp)}
                      >
                        {formatRelativeTime(log.timestamp)} •{' '}
                        {formatExactDateTime(log.timestamp)}
                      </span>
                    </div>

                    <div className="admin-log-item__body">
                      <span className="admin-log-item__details">{log.details}</span>
                      <span className="admin-log-item__location">
                        📍 {log.location}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminActivityDashboard;
