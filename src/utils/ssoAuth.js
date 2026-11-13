// src/utils/ssoAuth.js
// Single Sign-On (SSO) session handler for Sales Dashboard

export const SSO_SESSION_STORAGE_KEY = 'wmd_sales_sso_session';

export const DEFAULT_MAIN_PORTAL_URL = 
  typeof window !== 'undefined' && window.location.origin.includes('github.io')
    ? 'https://tejawmd.github.io/MainApp/'
    : 'http://localhost:5173/';

/**
 * Retrieves the validated SSO session from URL parameter or active sessionStorage.
 * If someone accesses the page directly without MainApp, this returns null.
 */
export function getSSOSession() {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check URL query string for sso_token (?sso_token=...)
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('sso_token');

    // 2. Also check URL hash fragment (#sso_token=...)
    if (!token && window.location.hash.includes('sso_token=')) {
      const match = window.location.hash.match(/sso_token=([^&]+)/);
      if (match) token = match[1];
    }

    if (token) {
      try {
        const decoded = decodeURIComponent(token);
        const jsonStr = decodeURIComponent(atob(decoded));
        const payload = JSON.parse(jsonStr);

        if (payload && payload.email) {
          // Store in sessionStorage (persists across reloads within this tab, destroyed when tab closes)
          sessionStorage.setItem(SSO_SESSION_STORAGE_KEY, JSON.stringify(payload));

          // Strip token from URL bar for clean UX
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          return payload;
        }
      } catch (err) {
        console.warn('Failed to parse incoming SSO token:', err);
      }
    }

    // 3. Check active sessionStorage
    const saved = sessionStorage.getItem(SSO_SESSION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error in getSSOSession:', e);
  }

  return null;
}

/**
 * Clears the active SSO session
 */
export function clearSSOSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SSO_SESSION_STORAGE_KEY);
    localStorage.removeItem('wmd_sales_dashboard_auth_email');
  } catch (e) {
    console.warn('Error clearing SSO session:', e);
  }
}

/**
 * Checks whether the current user is an Admin
 */
export function isSSOAdmin(session) {
  if (!session) return false;
  if (session.role === 'admin') return true;

  const email = String(session.email || '').trim().toLowerCase();
  return email === 'admin1@gmail.com' || email === 'wmgteja@gmail.com';
}
