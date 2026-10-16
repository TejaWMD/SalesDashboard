// src/components/PinLogin.jsx
import React, { useState } from 'react';
import wmdLogo from '../assets/wmd-logo.jpg';
import './PinLogin.css';

// ============================================================================
// 1. ADMIN ACCOUNTS (Full dashboard access + Admin Activity Tracker page)
// To add a new admin, simply add a new { email, password } object below:
// ============================================================================
export const ADMIN_USERS = [
  {
    email: 'admin1@gmail.com', // mani sir and teja
    password: '981834',
  },
];

// ============================================================================
// 2. STANDARD USER ACCOUNTS (Standard dashboard access)
// To add a new regular user, simply add a new { email, password } object below:
// ============================================================================
export const STANDARD_USERS = [
  {
    email: 'wmgteja@gmail.com',
    password: '180403',
  },
  {
    email: 'wmdklshakti@gmail.com',
    password: '374992',
  },
  {
    email: 'wmdklkavita@gmail.com',
    password: '459982',
  },
  {
    email: 'wmdlindakl@gmail.com',
    password: '100293',
  },
  {
    email: 'cs3@malayanfood.com',
    password: '665001',
  },
];

// Combined list of all authorized users with their assigned role ('admin' | 'user')
export const AUTHORIZED_USERS = [
  ...ADMIN_USERS.map((u) => ({ ...u, role: 'admin' })),
  ...STANDARD_USERS.map((u) => ({ ...u, role: 'user' })),
];

export const AUTH_STORAGE_KEY = 'wmd_sales_dashboard_auth_email';
// Kept for backward-compatibility imports if any
export const DASHBOARD_PIN = '040903';

export function getStoredUserEmail() {
  try {
    const savedEmail = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedEmail) return null;
    const matched = AUTHORIZED_USERS.find(
      (u) => u.email.toLowerCase() === savedEmail.trim().toLowerCase()
    );
    return matched ? matched.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isStoredAuthValid() {
  return Boolean(getStoredUserEmail());
}

export function isAdminEmail(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  return ADMIN_USERS.some((u) => u.email.toLowerCase() === clean);
}

function PinLogin({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter both your email and password.');
      triggerShake();
      return;
    }

    const matchedUser = AUTHORIZED_USERS.find(
      (user) =>
        user.email.toLowerCase() === cleanEmail &&
        user.password === cleanPassword
    );

    if (matchedUser) {
      setErrorMsg('');
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, matchedUser.email.toLowerCase());
      } catch (err) {
        console.warn('LocalStorage not available', err);
      }
      onSuccess(matchedUser.email);
    } else {
      setErrorMsg('Invalid email or password. Please try again.');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 650);
  };

  return (
    <div className="pin-login-container">
      <div className={`pin-card ${isShaking ? 'pin-card--shake' : ''}`}>
        {/* Company Logo Header at the top of the login card */}
        <div className="pin-header">
          <div className="pin-logo-wrapper">
            <img
              src={wmdLogo}
              alt="WMD Company Logo"
              className="pin-company-logo"
            />
          </div>
          <h1 className="pin-title">SALES & COLLECTION</h1>
          <p className="pin-subtitle">Sign in with your authorized email account</p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="pin-error-banner" role="alert">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Email & Password Login Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-email" className="login-label">
              EMAIL ADDRESS
            </label>
            <div className="login-input-wrapper">
              <svg
                className="login-input-icon"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => {
                  setErrorMsg('');
                  setEmail(e.target.value);
                }}
                autoComplete="email"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">
              PASSWORD
            </label>
            <div className="login-input-wrapper">
              <svg
                className="login-input-icon"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setErrorMsg('');
                  setPassword(e.target.value);
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="pin-submit-btn"
            disabled={!email.trim() || !password.trim()}
          >
            <span>Sign In to Dashboard</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default PinLogin;
