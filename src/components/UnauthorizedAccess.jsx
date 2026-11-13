// src/components/UnauthorizedAccess.jsx
import React, { useEffect, useState } from 'react';
import wmdLogo from '../assets/wmd-logo.jpg';
import { DEFAULT_MAIN_PORTAL_URL } from '../utils/ssoAuth';
import './UnauthorizedAccess.css';

function UnauthorizedAccess({ portalUrl = DEFAULT_MAIN_PORTAL_URL }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.replace(portalUrl);
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, portalUrl]);

  const handleRedirect = () => {
    window.location.replace(portalUrl);
  };

  return (
    <div className="unauth-wrapper">
      <div className="unauth-card">
        {/* Company Logo Header */}
        <div className="unauth-logo-box">
          <img
            src={wmdLogo}
            alt="WMD Company Logo"
            className="unauth-logo-img"
          />
        </div>

        {/* Lock Icon Badge */}
        <div className="unauth-badge-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="unauth-title">Access Restricted</h1>

        <p className="unauth-desc">
          Individual direct access to the <strong>Sales Dashboard</strong> is disabled. 
          Please sign in through the <strong>MainApp Portal</strong> to launch this workspace.
        </p>

        <div
          style={{
            marginBottom: '22px',
            padding: '9px 16px',
            borderRadius: '20px',
            background: 'rgba(191, 148, 75, 0.15)',
            border: '1px solid rgba(191, 148, 75, 0.35)',
            color: '#bf944b',
            fontSize: '0.825rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#bf944b',
            }}
          />
          <span>Redirecting to MainApp Portal in <strong>{countdown}s</strong>...</span>
        </div>

        <button
          type="button"
          onClick={handleRedirect}
          className="unauth-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Open MainApp Portal Now</span>
        </button>

        <div className="unauth-footer">
          <span>🔒 WMD Central Single Sign-On (SSO) Protected</span>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedAccess;
