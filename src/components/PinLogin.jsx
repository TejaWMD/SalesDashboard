// src/components/PinLogin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './PinLogin.css';

// Configured Dashboard Access PIN
export const DASHBOARD_PIN = '040903';
export const AUTH_STORAGE_KEY = 'sales_dashboard_pin_auth';

function PinLogin({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Validate entered PIN against the configured 040903
  const submitPin = useCallback((pinToTest) => {
    if (pinToTest === DASHBOARD_PIN) {
      setErrorMsg('');
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, DASHBOARD_PIN);
      } catch (e) {
        console.warn('LocalStorage not available', e);
      }
      onSuccess();
    } else {
      setErrorMsg('Incorrect PIN. Please try again.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 700);
    }
  }, [onSuccess]);

  // Handle number click / keypress
  const handleDigit = useCallback((digit) => {
    setErrorMsg('');
    setPin((prev) => {
      if (prev.length >= 6) return prev;
      const next = prev + digit;
      if (next.length === 6) {
        // Auto-validate once 6 digits are entered
        setTimeout(() => submitPin(next), 150);
      }
      return next;
    });
  }, [submitPin]);

  const handleBackspace = useCallback(() => {
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setErrorMsg('');
    setPin('');
  }, []);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length > 0) {
          submitPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear, submitPin, pin]);

  return (
    <div className="pin-login-container">
      <div className={`pin-card ${isShaking ? 'pin-card--shake' : ''}`}>
        {/* Shield Icon Header */}
        <div className="pin-header">
          <div className="pin-icon-wrapper">
            <svg
              className="pin-shield-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <rect x="9" y="11" width="6" height="5" rx="1" />
              <path d="M10 11V9a2 2 0 1 1 4 0v2" />
            </svg>
          </div>
          <h1 className="pin-title">Executive Sales Dashboard</h1>
          <p className="pin-subtitle">
            Restricted Access Portal • Enter 6-Digit PIN
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="pin-display-wrapper">
          <div className="pin-dots">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pin.length;
              const char = pin[idx];
              return (
                <div
                  key={idx}
                  className={`pin-dot ${isFilled ? 'pin-dot--filled' : ''} ${
                    idx === pin.length ? 'pin-dot--active' : ''
                  }`}
                >
                  {isFilled && showPin ? char : isFilled ? '•' : ''}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="pin-reveal-toggle"
            onClick={() => setShowPin((prev) => !prev)}
            title={showPin ? 'Hide PIN' : 'Show PIN'}
          >
            {showPin ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Error message */}
        {errorMsg ? (
          <div className="pin-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="pin-instruction">Use on-screen keypad or keyboard</div>
        )}

        {/* Numeric Keypad */}
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              className="pin-key"
              onClick={() => handleDigit(String(num))}
            >
              <span className="pin-key__number">{num}</span>
            </button>
          ))}

          <button
            type="button"
            className="pin-key pin-key--action"
            onClick={handleClear}
            title="Clear all digits"
          >
            <span className="pin-key__action-text">CLEAR</span>
          </button>

          <button
            type="button"
            className="pin-key"
            onClick={() => handleDigit('0')}
          >
            <span className="pin-key__number">0</span>
          </button>

          <button
            type="button"
            className="pin-key pin-key--action"
            onClick={handleBackspace}
            title="Delete last digit"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="pin-submit-btn"
          disabled={pin.length === 0}
          onClick={() => submitPin(pin)}
        >
          <span>Unlock Dashboard</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <div className="pin-footer-info">
          <span>Optimized for Smart TV & Dashboard Monitors</span>
        </div>
      </div>
    </div>
  );
}

export default PinLogin;
