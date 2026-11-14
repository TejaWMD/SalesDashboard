// src/components/KpiDashboard.jsx
import React, { useMemo } from 'react';
import { formatCurrency, formatPercent } from '../utils/fetchSheet';
import './KpiDashboard.css';

const AM_PROFILES = {
  DIRECTOR: { avatar: 'D', emoji: '🦄', accent: '#a78bfa', soft: '#ede9fe', gradient: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' },
  LOSHNY:   { avatar: 'L', emoji: '🍓', accent: '#fb7185', soft: '#ffe4e6', gradient: 'linear-gradient(135deg, #fb7185, #fda4af)' },
  KAVITA:   { avatar: 'K', emoji: '🐬', accent: '#38bdf8', soft: '#e0f2fe', gradient: 'linear-gradient(135deg, #38bdf8, #7dd3fc)' },
  SHAKTI:   { avatar: 'S', emoji: '🌿', accent: '#34d399', soft: '#d1fae5', gradient: 'linear-gradient(135deg, #34d399, #6ee7b7)' },
  LINDA:    { avatar: 'L', emoji: '🍑', accent: '#fbbf24', soft: '#fef3c7', gradient: 'linear-gradient(135deg, #fbbf24, #fcd34d)' },
};

const FOUR_AMS = ['DIRECTOR', 'LINDA', 'KAVITA', 'SHAKTI'];
const clamp = (v) => Math.max(0, Math.min(100, v || 0));

const getMood = (rate) => {
  if (rate == null) return { label: 'No data', emoji: '💤', cls: 'neutral' };
  if (rate >= 90) return { label: 'Superstar', emoji: '🌟', cls: 'excellent' };
  if (rate >= 70) return { label: 'Great job', emoji: '✨', cls: 'good' };
  if (rate >= 40) return { label: 'Keep going', emoji: '🌱', cls: 'progress' };
  return { label: 'Push harder', emoji: '🔥', cls: 'danger' };
};

function KpiDashboard({ salesRows = [], paymentData = {} }) {
  const { picList: paymentPics = [], rows: paymentRows = [] } = paymentData || {};

  const amCardsData = useMemo(() => {
    const salesMap = {};
    salesRows.forEach((row) => {
      const name = (row.person || 'Unassigned').trim().toUpperCase();
      const m = (salesMap[name] ||= { target: 0, sales: 0, storeCount: 0 });
      if (row.target != null && !isNaN(row.target)) m.target += row.target;
      if (row.sales != null && !isNaN(row.sales)) m.sales += row.sales;
      m.storeCount += 1;
    });

    const collectionMap = {};
    paymentPics.forEach((pic) => {
      const name = (pic.name || '').trim().toUpperCase();
      collectionMap[name] = {
        target: pic.target ?? 0,
        collected: pic.collected ?? 0,
        pending: pic.pending ?? 0,
        customerCount: pic.customerCount ?? 0,
      };
    });
    if (paymentPics.length === 0 && paymentRows.length > 0) {
      paymentRows.forEach((row) => {
        const name = (row.person || 'Unassigned').trim().toUpperCase();
        const m = (collectionMap[name] ||= { target: 0, collected: 0, pending: 0, customerCount: 0 });
        if (row.target) m.target += row.target;
        if (row.collected) m.collected += row.collected;
        if (row.pending) m.pending += row.pending;
        m.customerCount += 1;
      });
    }

    const list = FOUR_AMS.map((name) => {
      const profile = AM_PROFILES[name] || {
        avatar: name[0], emoji: '🌟',
        accent: '#38bdf8', soft: '#e0f2fe',
        gradient: 'linear-gradient(135deg, #38bdf8, #7dd3fc)',
      };
      const s = salesMap[name] || { target: 0, sales: 0, storeCount: 0 };
      const c = collectionMap[name] || { target: 0, collected: 0, pending: 0, customerCount: 0 };

      const salesRate = s.target > 0 ? (s.sales / s.target) * 100 : 0;
      const collectionRate = c.target > 0
        ? (c.collected / c.target) * 100
        : c.collected + c.pending > 0
          ? (c.collected / (c.collected + c.pending)) * 100
          : 0;
      const averageKpi = (salesRate + collectionRate) / 2;

      return {
        id: name.toLowerCase(),
        name, profile,
        salesTarget: s.target, salesActual: s.sales,
        salesRate, storeCount: s.storeCount,
        collectionTarget: c.target, collectionCollected: c.collected,
        collectionPending: c.pending > 0 ? c.pending : Math.max(0, c.target - c.collected),
        collectionRate, customerCount: c.customerCount,
        averageKpi,
        mood: getMood(averageKpi),
      };
    });

    const ranked = [...list].sort((a, b) => b.averageKpi - a.averageKpi);
    return ranked.map((item, i) => ({ ...item, rank: i + 1 }));
  }, [salesRows, paymentPics, paymentRows]);

  return (
    <div className="kpi-page">
      <div className="bubble-grid">
        {amCardsData.map((am) => {
          const rankBadge =
            am.rank === 1 ? '🥇' : am.rank === 2 ? '🥈' : am.rank === 3 ? '🥉' : '💫';

          return (
            <article
              key={am.id}
              className="bubble-card"
              style={{
                '--accent': am.profile.accent,
                '--soft': am.profile.soft,
                '--grad': am.profile.gradient,
              }}
            >
              {/* Floating decorative bubbles */}
              <span className="deco-bubble deco-bubble--a" />
              <span className="deco-bubble deco-bubble--b" />
              <span className="deco-bubble deco-bubble--c" />

              {/* Header */}
              <header className="bubble-head">
                <div className="bubble-id">
                  <div className="bubble-name-wrap">
                    <h3 className="bubble-name">{am.name}</h3>
                    <span className="bubble-role">Account Manager</span>
                  </div>
                </div>
                <span className="bubble-rank">{rankBadge}</span>
              </header>

              {/* Hero donut */}
              <div className="bubble-hero">
                <div className="donut-wrap">
                  <svg className="donut" viewBox="0 0 120 120">
                    <circle className="donut-track" cx="60" cy="60" r="50" />
                    <circle
                      className="donut-fill"
                      cx="60" cy="60" r="50"
                      style={{
                        strokeDasharray: `${(clamp(am.averageKpi) / 100) * 314}`,
                        stroke: am.profile.accent,
                      }}
                    />
                  </svg>
                  <div className="donut-center">
                    <span className="donut-value">{am.averageKpi.toFixed(0)}</span>
                    <span className="donut-unit">%</span>
                  </div>
                </div>
                <div className="bubble-hero-side">
                  <span className="bubble-hero-label">Avg KPI</span>
                  <span className={`bubble-mood mood--${am.mood.cls}`}>
                    {am.mood.emoji} {am.mood.label}
                  </span>
                </div>
              </div>

              {/* Two KPI pills */}
              <div className="bubble-pills">
                <div className="pill pill--sales">
                  <div className="pill-top">
                    <span className="pill-icon">💰</span>
                    <span className="pill-title">Sales</span>
                    <span className="pill-rate">{formatPercent(am.salesRate)}</span>
                  </div>
                  <div className="pill-bar">
                    <div
                      className="pill-bar-fill pill-bar-fill--blue"
                      style={{ width: `${clamp(am.salesRate)}%` }}
                    />
                  </div>
                  <div className="pill-nums">
                    <span>🎯 {formatCurrency(am.salesTarget)}</span>
                    <span>✅ {formatCurrency(am.salesActual)}</span>
                  </div>
                </div>

                <div className="pill pill--collection">
                  <div className="pill-top">
                    <span className="pill-icon">💵</span>
                    <span className="pill-title">Collect</span>
                    <span className="pill-rate">{formatPercent(am.collectionRate)}</span>
                  </div>
                  <div className="pill-bar">
                    <div
                      className="pill-bar-fill pill-bar-fill--green"
                      style={{ width: `${clamp(am.collectionRate)}%` }}
                    />
                  </div>
                  <div className="pill-nums">
                    <span>🎯 {formatCurrency(am.collectionTarget)}</span>
                    <span>✅ {formatCurrency(am.collectionCollected)}</span>
                  </div>
                </div>
              </div>

              {/* Footer chips */}
              <footer className="bubble-foot">
                <span className="chip">🏪 {am.storeCount} outlets</span>
                <span className="chip">🫶 {am.customerCount} customers</span>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default KpiDashboard;