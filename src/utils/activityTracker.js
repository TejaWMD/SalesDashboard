// src/utils/activityTracker.js
import { AUTHORIZED_USERS, isAdminEmail } from '../components/PinLogin';

export const PRESENCE_STORAGE_KEY = 'wmd_dashboard_user_presence_v2';
export const ACTIVITY_LOGS_STORAGE_KEY = 'wmd_dashboard_activity_logs_v2';
export const CLEAR_TS_STORAGE_KEY = 'wmd_dashboard_logs_cleared_at_v2';
const BROADCAST_CHANNEL_NAME = 'wmd_dashboard_activity_sync_v2';

// Cloud Sync Endpoint: ntfy.envs.net (High-speed, open CORS, real-time SSE stream across all devices)
const NTFY_TOPIC = 'wmd_sales_dashboard_live_v2_981834';
const PRIMARY_NTFY_URL = `https://ntfy.envs.net/${NTFY_TOPIC}`;
const MSG_PREFIX = 'WMD_SYNC:';

// Users with a heartbeat within the last 90 seconds and status === 'online' are considered actively online
export const ONLINE_TIMEOUT_MS = 90000;
const MAX_LOG_ENTRIES = 300;

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

let eventSourceInstance = null;
let cloudPollTimer = null;
let isSyncingFromCloud = false;
let lastSyncAttemptMs = 0;

function notifySubscribers() {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ACTIVITY_UPDATED', timestamp: Date.now() });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wmd-activity-updated'));
    }
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
    case 'kpi': {
      const monthLabel = selectedMonth === 'ALL' ? 'All Months' : selectedMonth || 'OCT';
      return `Account Managers KPI (${monthLabel})`;
    }
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

export function getClearedAtTimestamp() {
  try {
    const val = Number(localStorage.getItem(CLEAR_TS_STORAGE_KEY) || 0);
    return isNaN(val) ? 0 : val;
  } catch {
    return 0;
  }
}

function setClearedAtTimestamp(tsMs) {
  try {
    const current = getClearedAtTimestamp();
    if (tsMs > current) {
      localStorage.setItem(CLEAR_TS_STORAGE_KEY, String(tsMs));
    }
  } catch {
    // Ignore
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
    if (!Array.isArray(parsed)) return [];
    const clearedAt = getClearedAtTimestamp();
    if (!clearedAt) return parsed;
    return parsed.filter((item) => {
      const itemMs = new Date(item.timestamp).getTime();
      return !isNaN(itemMs) && itemMs > clearedAt;
    });
  } catch {
    return [];
  }
}

function saveActivityLogs(logs) {
  try {
    const clearedAt = getClearedAtTimestamp();
    const filtered = clearedAt
      ? logs.filter((item) => new Date(item.timestamp).getTime() > clearedAt)
      : logs;
    localStorage.setItem(
      ACTIVITY_LOGS_STORAGE_KEY,
      JSON.stringify(filtered.slice(0, MAX_LOG_ENTRIES))
    );
  } catch (err) {
    console.warn('Could not save activity logs:', err);
  }
}

/**
 * Merges a single user's incoming presence object into the target presenceMap.
 * Handles clock skew accurately so users never prematurely drop to offline.
 */
function mergeUserPresenceEntry(
  targetMap,
  incoming,
  ageMsFromServer = null,
  serverTimeSec = null
) {
  if (!incoming || !incoming.email) return false;
  const cleanEmail = String(incoming.email).trim().toLowerCase();
  const existing = targetMap[cleanEmail];
  const nowMs = Date.now();

  const existingServerSec = existing?._serverTimeSec || 0;
  const incomingTimeMs = incoming.lastAccessedAt
    ? new Date(incoming.lastAccessedAt).getTime()
    : 0;
  const existingTimeMs = existing?.lastAccessedAt
    ? new Date(existing.lastAccessedAt).getTime()
    : 0;

  // Determine whether incoming record is newer or equal
  let isNewerOrEqual = false;
  if (!existing) {
    isNewerOrEqual = true;
  } else if (serverTimeSec && existingServerSec) {
    isNewerOrEqual = serverTimeSec >= existingServerSec;
  } else if (serverTimeSec && !existingServerSec) {
    isNewerOrEqual = true;
  } else {
    isNewerOrEqual = incomingTimeMs >= existingTimeMs - 2000;
  }

  // Calculate heartbeat timestamp relative to local clock
  let computedHeartbeatMs = 0;
  if (incoming.status === 'offline') {
    computedHeartbeatMs = 0;
  } else if (typeof ageMsFromServer === 'number' && ageMsFromServer >= 0) {
    // True elapsed time calculated against server timestamp
    computedHeartbeatMs = Math.max(0, nowMs - ageMsFromServer);
  } else if (incoming.lastHeartbeatMs && (nowMs - incoming.lastHeartbeatMs) < ONLINE_TIMEOUT_MS) {
    computedHeartbeatMs = incoming.lastHeartbeatMs;
  } else if (incomingTimeMs && (nowMs - incomingTimeMs) < ONLINE_TIMEOUT_MS) {
    computedHeartbeatMs = incomingTimeMs;
  } else if (existing?.lastHeartbeatMs && (nowMs - existing.lastHeartbeatMs) < ONLINE_TIMEOUT_MS) {
    // Keep existing valid recent heartbeat
    computedHeartbeatMs = existing.lastHeartbeatMs;
  } else {
    // Live arrival defaults to active now
    computedHeartbeatMs = nowMs;
  }

  if (isNewerOrEqual) {
    const normalizedIso =
      serverTimeSec && serverTimeSec > 0
        ? new Date(serverTimeSec * 1000).toISOString()
        : incoming.lastAccessedAt || new Date().toISOString();

    const isStillOnline =
      incoming.status !== 'offline' &&
      computedHeartbeatMs > 0 &&
      nowMs - computedHeartbeatMs <= ONLINE_TIMEOUT_MS;

    targetMap[cleanEmail] = {
      ...existing,
      ...incoming,
      email: cleanEmail,
      role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
      status: incoming.status === 'offline' ? 'offline' : (isStillOnline ? 'online' : 'offline'),
      lastAccessedAt: normalizedIso || existing?.lastAccessedAt,
      lastHeartbeatMs: incoming.status === 'offline' ? 0 : computedHeartbeatMs,
      _serverTimeSec: Math.max(serverTimeSec || 0, existingServerSec),
      lastLoginAt: incoming.lastLoginAt || existing?.lastLoginAt || normalizedIso,
      lastLogoutAt: incoming.status === 'offline' ? (incoming.lastLogoutAt || normalizedIso) : existing?.lastLogoutAt || null,
      totalLogins: Math.max(incoming.totalLogins || 0, existing?.totalLogins || 0),
      totalActions: Math.max(incoming.totalActions || 0, existing?.totalActions || 0),
    };
    return true;
  }

  // Even if older, preserve highest cumulative counters
  if (existing) {
    existing.totalLogins = Math.max(incoming.totalLogins || 0, existing.totalLogins || 0);
    existing.totalActions = Math.max(incoming.totalActions || 0, existing.totalActions || 0);
  }
  return false;
}

/**
 * Merges an array of incoming log entries with local logs (deduplicated by ID, newest first)
 */
function mergeLogEntries(existingLogs, incomingLogs) {
  if (!Array.isArray(incomingLogs) || incomingLogs.length === 0) return existingLogs;
  const clearedAt = getClearedAtTimestamp();
  const byId = new Map();

  existingLogs.forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });

  incomingLogs.forEach((item) => {
    if (!item || !item.id) return;
    const itemMs = new Date(item.timestamp).getTime();
    if (clearedAt && itemMs <= clearedAt) return;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  });

  const merged = Array.from(byId.values());
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return merged.slice(0, MAX_LOG_ENTRIES);
}

/**
 * Publishes an event packet to the real-time cloud stream with strict timeout
 */
async function publishCloudEvent(packet) {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    await fetch(PRIMARY_NTFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: `${MSG_PREFIX}${JSON.stringify(packet)}`,
      keepalive: true,
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);
  } catch {
    // Silently ignore transient network errors or aborts
  }
}

/**
 * Pulls and merges the latest events from the real-time ntfy cloud stream
 */
export async function syncFromCloud() {
  const now = Date.now();
  if (isSyncingFromCloud && now - lastSyncAttemptMs < 4000) {
    return;
  }
  isSyncingFromCloud = true;
  lastSyncAttemptMs = now;

  try {
    const presenceMap = getStoredPresenceMap();
    let logs = getActivityLogs();

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

    try {
      const ntfyResp = await fetch(`${PRIMARY_NTFY_URL}/json?poll=1&since=12h`, {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (ntfyResp.ok) {
        const headerDateStr = ntfyResp.headers.get('date');
        const headerNowSec = headerDateStr
          ? Math.floor(new Date(headerDateStr).getTime() / 1000)
          : Math.floor(Date.now() / 1000);

        const text = await ntfyResp.text();
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        const parsedEvents = [];
        let maxServerTimeSec = headerNowSec || 0;

        lines.forEach((line) => {
          try {
            const envelope = JSON.parse(line);
            if (
              envelope &&
              envelope.event === 'message' &&
              typeof envelope.message === 'string' &&
              envelope.message.startsWith(MSG_PREFIX)
            ) {
              const payload = JSON.parse(envelope.message.slice(MSG_PREFIX.length));
              const serverTimeSec = Number(envelope.time || 0);
              if (serverTimeSec > maxServerTimeSec) {
                maxServerTimeSec = serverTimeSec;
              }
              parsedEvents.push({ serverTimeSec, payload });
            }
          } catch {
            // Skip invalid line
          }
        });

        const referenceNowSec = maxServerTimeSec > 0 ? maxServerTimeSec : headerNowSec;
        const incomingLogs = [];

        parsedEvents.forEach(({ serverTimeSec, payload }) => {
          if (!payload) return;

          if (payload.type === 'CLEAR_LOGS' && payload.clearedAtMs) {
            setClearedAtTimestamp(payload.clearedAtMs);
          }

          if (payload.presence) {
            const ageMs =
              serverTimeSec > 0
                ? Math.max(0, (referenceNowSec - serverTimeSec) * 1000)
                : 0;
            mergeUserPresenceEntry(
              presenceMap,
              payload.presence,
              ageMs,
              serverTimeSec
            );
          }

          if (payload.logEntry) {
            const normalizedLog =
              serverTimeSec > 0
                ? {
                    ...payload.logEntry,
                    timestamp: new Date(serverTimeSec * 1000).toISOString(),
                  }
                : payload.logEntry;
            incomingLogs.push(normalizedLog);
          }
        });

        if (incomingLogs.length > 0) {
          logs = mergeLogEntries(logs, incomingLogs);
        }
      }
    } catch {
      // Ignore network timeout
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    savePresenceMap(presenceMap);
    saveActivityLogs(logs);
    notifySubscribers();
  } finally {
    isSyncingFromCloud = false;
  }
}

/**
 * Starts real-time SSE listener + periodic cloud polling so cross-device updates arrive immediately
 */
export function startCloudActivitySync() {
  if (typeof window === 'undefined') return () => {};

  // Initial pull from cloud immediately
  syncFromCloud();

  // Open real-time Server-Sent Events connection to ntfy server
  if (!eventSourceInstance && typeof EventSource !== 'undefined') {
    try {
      eventSourceInstance = new EventSource(`${PRIMARY_NTFY_URL}/sse`);
      eventSourceInstance.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          if (
            envelope &&
            envelope.event === 'message' &&
            typeof envelope.message === 'string' &&
            envelope.message.startsWith(MSG_PREFIX)
          ) {
            const payload = JSON.parse(envelope.message.slice(MSG_PREFIX.length));
            const serverTimeSec = Number(envelope.time || Math.floor(Date.now() / 1000));
            const presenceMap = getStoredPresenceMap();
            let logs = getActivityLogs();

            if (payload.type === 'CLEAR_LOGS' && payload.clearedAtMs) {
              setClearedAtTimestamp(payload.clearedAtMs);
              logs = [];
            }

            if (payload.presence) {
              // Live SSE message arrived right now -> ageMs = 0
              mergeUserPresenceEntry(presenceMap, payload.presence, 0, serverTimeSec);
            }

            if (payload.logEntry) {
              const normalizedLog =
                serverTimeSec > 0
                  ? {
                      ...payload.logEntry,
                      timestamp: new Date(serverTimeSec * 1000).toISOString(),
                    }
                  : payload.logEntry;
              logs = mergeLogEntries(logs, [normalizedLog]);
            }

            savePresenceMap(presenceMap);
            saveActivityLogs(logs);
            notifySubscribers();
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSourceInstance.onerror = () => {
        // Browser automatically attempts SSE reconnection
      };
    } catch {
      eventSourceInstance = null;
    }
  }

  // Periodic background sync every 8 seconds
  if (!cloudPollTimer) {
    cloudPollTimer = setInterval(() => {
      syncFromCloud();
    }, 8000);
  }

  return () => {};
}

/**
 * Records a user action locally AND broadcasts it to all devices in the cloud
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
  const nowSec = Math.floor(nowMs / 1000);

  const presenceMap = getStoredPresenceMap();
  const prev = presenceMap[cleanEmail] || {};

  const isLogin = actionType === 'LOGIN';
  const isLogout = actionType === 'LOGOUT';

  const updatedPresence = {
    email: cleanEmail,
    role,
    status: isLogout ? 'offline' : status,
    currentLocation: isLogout ? prev.currentLocation || location : location,
    lastAction: details || prev.lastAction || 'Viewing Dashboard',
    lastActionType: actionType,
    lastAccessedAt: nowIso,
    lastHeartbeatMs: isLogout ? 0 : nowMs,
    _serverTimeSec: nowSec,
    lastLoginAt: isLogin ? nowIso : prev.lastLoginAt || nowIso,
    lastLogoutAt: isLogout ? nowIso : prev.lastLogoutAt || null,
    totalLogins: isLogin ? (prev.totalLogins || 0) + 1 : prev.totalLogins || 1,
    totalActions: skipLog ? prev.totalActions || 1 : (prev.totalActions || 0) + 1,
  };

  presenceMap[cleanEmail] = updatedPresence;
  savePresenceMap(presenceMap);

  let newEntry = null;
  if (!skipLog) {
    const logs = getActivityLogs();
    newEntry = {
      id: `${nowMs}-${cleanEmail.slice(0, 5)}-${Math.random().toString(36).slice(2, 7)}`,
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

  // Broadcast to cloud immediately so other PCs/laptops see it in real time
  publishCloudEvent({
    type: 'EVENT',
    presence: updatedPresence,
    logEntry: newEntry,
  });
}

/**
 * Updates the live presence heartbeat & current location for an active user
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

  const knownMap = new Map();

  // 1. Authorized users from configuration
  AUTHORIZED_USERS.forEach((authUser) => {
    const cleanEmail = authUser.email.trim().toLowerCase();
    knownMap.set(cleanEmail, {
      email: cleanEmail,
      role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
    });
  });

  // 2. Any additional accounts that have activity in presenceMap
  Object.keys(presenceMap).forEach((emailKey) => {
    const cleanEmail = String(emailKey).trim().toLowerCase();
    if (cleanEmail && !knownMap.has(cleanEmail)) {
      knownMap.set(cleanEmail, {
        email: cleanEmail,
        role: isAdminEmail(cleanEmail) ? 'admin' : 'user',
      });
    }
  });

  const list = Array.from(knownMap.values()).map((acc) => {
    const cleanEmail = acc.email;
    const tracked = presenceMap[cleanEmail] || null;
    const role = acc.role;

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

    const lastHb = tracked.lastHeartbeatMs || 0;
    const isRecentHeartbeat =
      tracked.status === 'online' &&
      lastHb > 0 &&
      nowMs - lastHb <= ONLINE_TIMEOUT_MS;

    return {
      email: cleanEmail,
      role,
      isOnline: Boolean(isRecentHeartbeat),
      status: isRecentHeartbeat
        ? 'online'
        : tracked.lastAccessedAt
        ? 'offline'
        : 'never',
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

  // Online accounts top, then admins, then alphabetical
  list.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
    return a.email.localeCompare(b.email);
  });

  return list;
}

/**
 * Clears activity log history across all devices (Admin maintenance action)
 */
export function clearActivityLogs(adminEmail) {
  try {
    const clearMs = Date.now();
    setClearedAtTimestamp(clearMs);
    localStorage.removeItem(ACTIVITY_LOGS_STORAGE_KEY);

    publishCloudEvent({
      type: 'CLEAR_LOGS',
      clearedAtMs: clearMs,
    });

    if (adminEmail) {
      setTimeout(() => {
        recordUserActivity({
          email: adminEmail,
          actionType: 'ADMIN_ACTION',
          location: 'Admin Activity Tracker',
          details: 'Cleared activity log history',
          status: 'online',
        });
      }, 50);
    } else {
      notifySubscribers();
    }
  } catch (err) {
    console.warn('Failed to clear activity logs:', err);
  }
}

/**
 * Subscribe to real-time activity updates across tabs, cloud SSE, and within the current window
 */
export function subscribeToActivityUpdates(callback) {
  startCloudActivitySync();

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
