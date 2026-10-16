// src/utils/activityTracker.js
import { AUTHORIZED_USERS, isAdminEmail } from '../components/PinLogin';

export const PRESENCE_STORAGE_KEY = 'wmd_dashboard_user_presence_v1';
export const ACTIVITY_LOGS_STORAGE_KEY = 'wmd_dashboard_activity_logs_v1';
const BROADCAST_CHANNEL_NAME = 'wmd_dashboard_activity_sync';

// Users with a heartbeat within the last 45 seconds and status === 'online' are considered actively online
export const ONLINE_TIMEOUT_MS = 45000;
const MAX_LOG_ENTRIES = 500;

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

function notifySubscribers() {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ACTIVITY_UPDATED', timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('wmd-activity-updated'));
  } catch {
    // Ignore broadcast errors
  }
}

/**
 * Formats view + subTab + month into a human-readable location string
 */
export function formatDashboardLocation(activeView, salesSubTab, collectionSubTab, selectedMonth) {
  switch (activeView) {
    case 'homepage':
      return 'Homepage (Account Managers)';
    case 'sales': {
      const mode = salesSubTab === 'table' ? 'Table View' : 'Dashboard View';
      const monthLabel = selectedMonth === 'ALL' ? 'All Months' : selectedMonth || 'OCT';
      return `Sales Performance • ${mode} (${monthLabel})`;
    }
    case 'collection': {
      const mode = collectionSubTab === 'table' ? 'Table View' : 'Dashboard View';
      return `Collection Tracking • ${mode}`;
    }
    case 'online':
      return 'Online Sales (Shopee & TikTok)';
    case 'admin':
      return 'Admin Activity Tracker';
    default:
      return 'Dashboard';
  }
}

/**
 * Reads the stored presence dictionary from localStorage
 */
export function getStoredPresenceMap() {
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves the presence dictionary to localStorage
 */
function savePresenceMap(map) {
  try {
    localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save presence map:', err);
  }
}

/**
 * Reads the stored chronological activity log array from localStorage
 */
export function getActivityLogs() {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves the activity log array to localStorage
 */
function saveActivityLogs(logs) {
  try {
    localStorage.setItem(
      ACTIVITY_LOGS_STORAGE_KEY,
      JSON.stringify(logs.slice(0, MAX_LOG_ENTRIES))
    );
  } catch (err) {
    console.warn('Could not save activity logs:', err);
  }
}

/**
 * Records a user action and updates their live presence state
 */
export function recordUserActivity({
  email,
  actionType = 'NAVIGATION',
  location = 'Homepage (Account Managers)',
  details = '',
  status = 'online',
  skipLog = false,
}) {
  if (!email) return;
  const cleanEmail = String(email).trim().toLowerCase();
  const role = isAdminEmail(cleanEmail) ? 'admin' : 'user';
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const presenceMap = getStoredPresenceMap();
  const prev = presenceMap[cleanEmail] || {};

  const isLogin = actionType === 'LOGIN';
  const isLogout = actionType === 'LOGOUT';

  presenceMap[cleanEmail] = {
    email: cleanEmail,
    role,
    status: isLogout ? 'offline' : status,
    currentLocation: isLogout ? prev.currentLocation || location : location,
    lastAction: details || prev.lastAction || 'Viewing Dashboard',
    lastActionType: actionType,
    lastAccessedAt: nowIso,
    lastHeartbeatMs: isLogout ? 0 : nowMs,
    lastLoginAt: isLogin ? nowIso : prev.lastLoginAt || nowIso,
    lastLogoutAt: isLogout ? nowIso : prev.lastLogoutAt || null,
    totalLogins: isLogin ? (prev.totalLogins || 0) + 1 : prev.totalLogins || 1,
    totalActions: skipLog ? prev.totalActions || 1 : (prev.totalActions || 0) + 1,
  };

  savePresenceMap(presenceMap);

  if (!skipLog) {
    const logs = getActivityLogs();
    const newEntry = {
      id: `${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: nowIso,
      email: cleanEmail,
      role,
      actionType,
      location,
      details: details || `Accessed ${location}`,
    };
    logs.unshift(newEntry);
    saveActivityLogs(logs);
  }

  notifySubscribers();
}

/**
 * Updates only the heartbeat & current location for an active user (every 15s)
 */
export function sendUserHeartbeat(email, location, currentActivityDesc) {
  if (!email) return;
  recordUserActivity({
    email,
    actionType: 'HEARTBEAT',
    location,
    details: currentActivityDesc,
    status: 'online',
    skipLog: true,
  });
}

/**
 * Returns a complete list of all AUTHORIZED_USERS merged with their real-time tracking state
 */
export function getAllTrackedUsers() {
  const presenceMap = getStoredPresenceMap();
  const nowMs = Date.now();

  return AUTHORIZED_USERS.map((authUser) => {
    const cleanEmail = authUser.email.toLowerCase();
    const tracked = presenceMap[cleanEmail] || null;
    const role = isAdminEmail(cleanEmail) ? 'admin' : 'user';

    if (!tracked) {
      return {
        email: cleanEmail,
        role,
        isOnline: false,
        status: 'never',
        currentLocation: 'Not accessed yet',
        lastAction: 'No recorded activity yet',
        lastActionType: null,
        lastAccessedAt: null,
        lastLoginAt: null,
        lastLogoutAt: null,
        totalLogins: 0,
        totalActions: 0,
      };
    }

    const isRecentHeartbeat =
      tracked.status === 'online' &&
      tracked.lastHeartbeatMs &&
      nowMs - tracked.lastHeartbeatMs <= ONLINE_TIMEOUT_MS;

    return {
      email: cleanEmail,
      role,
      isOnline: Boolean(isRecentHeartbeat),
      status: isRecentHeartbeat ? 'online' : 'offline',
      currentLocation: tracked.currentLocation || 'Homepage (Account Managers)',
      lastAction: tracked.lastAction || 'Viewing Dashboard',
      lastActionType: tracked.lastActionType || 'NAVIGATION',
      lastAccessedAt: tracked.lastAccessedAt || null,
      lastLoginAt: tracked.lastLoginAt || null,
      lastLogoutAt: tracked.lastLogoutAt || null,
      totalLogins: tracked.totalLogins || 0,
      totalActions: tracked.totalActions || 0,
    };
  });
}

/**
 * Clears activity log history (Admin maintenance action)
 */
export function clearActivityLogs(adminEmail) {
  try {
    localStorage.removeItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (adminEmail) {
      recordUserActivity({
        email: adminEmail,
        actionType: 'ADMIN_ACTION',
        location: 'Admin Activity Tracker',
        details: 'Cleared activity log history',
        status: 'online',
      });
    } else {
      notifySubscribers();
    }
  } catch (err) {
    console.warn('Failed to clear activity logs:', err);
  }
}

/**
 * Subscribe to real-time activity updates across tabs and within the current window
 */
export function subscribeToActivityUpdates(callback) {
  const handleStorage = (e) => {
    if (
      !e.key ||
      e.key === PRESENCE_STORAGE_KEY ||
      e.key === ACTIVITY_LOGS_STORAGE_KEY
    ) {
      callback();
    }
  };

  const handleCustom = () => callback();

  window.addEventListener('storage', handleStorage);
  window.addEventListener('wmd-activity-updated', handleCustom);

  let bcHandler = null;
  if (broadcastChannel) {
    bcHandler = () => callback();
    broadcastChannel.addEventListener('message', bcHandler);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('wmd-activity-updated', handleCustom);
    if (broadcastChannel && bcHandler) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
  };
}
