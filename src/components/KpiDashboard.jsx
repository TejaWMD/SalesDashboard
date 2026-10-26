// src/components/KpiDashboard.jsx
import React, { useMemo } from 'react';
import {
  formatCurrency,
  formatPercent,
} from '../utils/fetchSheet';
import './KpiDashboard.css';

// AM Visual Metadata & Roles
const AM_PROFILES = {
  DIRECTOR: {
    displayName: 'DIRECTOR',
    role: 'Director / Key Accounts',
    avatar: 'D',
    accentColor: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  },
  LOSHNY: {
    displayName: 'LOSHNY',
    role: 'Senior Account Manager',
    avatar: 'L',
    accentColor: '#f43f5e',
    gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)',
  },
  KAVITA: {
    displayName: 'KAVITA',
    role: 'Senior Account Manager',
    avatar: 'K',
    accentColor: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
  },
  SHAKTI: {
    displayName: 'SHAKTI',
    role: 'Key Account Manager',
    avatar: 'S',
    accentColor: '#10b981',
    gradient: 'linear-gradient(135deg, #059669, #34d399)',
  },
  LINDA: {
    displayName: 'LINDA',
    role: 'Key Account Manager',
    avatar: 'L',
    accentColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706, #fbbf24)',
  },
};

const DEFAULT_5_AMS = ['DIRECTOR', 'LOSHNY', 'KAVITA', 'SHAKTI', 'LINDA'];

const getKpiStatus = (rate) => {
  if (rate === null || rate === undefined) {
    return { key: 'neutral', label: 'No Data', class: 'status-neutral' };
  }
  if (rate >= 90) {
    return { key: 'excellent', label: 'Outstanding', class: 'status-excellent' };
  }
  if (rate >= 70) {
    return { key: 'good', label: 'On Track', class: 'status-good' };
  }
  if (rate >= 40) {
    return { key: 'progress', label: 'In Progress', class: 'status-progress' };
  }
  return { key: 'danger', label: 'Needs Push', class: 'status-danger' };
};

const clamp = (val) => Math.max(0, Math.min(100, val || 0));

function KpiDashboard({ salesRows = [], paymentData = {} }) {
  const { picList: paymentPics = [], rows: paymentRows = [] } = paymentData || {};

  // Compute aggregated Sales & Collection data for the 5 Account Managers
  const amCardsData = useMemo(() => {
    // 1. Sales Aggregates per AM
    const salesMap = {};
    salesRows.forEach((row) => {
      const name = (row.person || 'Unassigned').trim().toUpperCase();
      if (!salesMap[name]) {
        salesMap[name] = {
          target: 0,
          sales: 0,
          storeCount: 0,
        };
      }
      if (row.target !== null && !isNaN(row.target)) {
        salesMap[name].target += row.target;
      }
      if (row.sales !== null && !isNaN(row.sales)) {
        salesMap[name].sales += row.sales;
      }
      salesMap[name].storeCount += 1;
    });

    // 2. Collection Aggregates per AM
    const collectionMap = {};
    paymentPics.forEach((pic) => {
      const name = (pic.name || '').trim().toUpperCase();
      collectionMap[name] = {
        target: pic.target ?? 0,
        collected: pic.collected ?? 0,
        pending: pic.pending ?? 0,
        rate: pic.collectionPercent ?? null,
        customerCount: pic.customerCount ?? 0,
      };
    });

    // Fallback if paymentPics is empty but rows exist
    if (paymentPics.length === 0 && paymentRows.length > 0) {
      paymentRows.forEach((row) => {
        const name = (row.person || 'Unassigned').trim().toUpperCase();
        if (!collectionMap[name]) {
          collectionMap[name] = {
            target: 0,
            collected: 0,
            pending: 0,
            rate: null,
            customerCount: 0,
          };
        }
        if (row.target) collectionMap[name].target += row.target;
        if (row.collected) collectionMap[name].collected += row.collected;
        if (row.pending) collectionMap[name].pending += row.pending;
        collectionMap[name].customerCount += 1;
      });
      Object.keys(collectionMap).forEach((name) => {
        const c = collectionMap[name];
        c.rate = c.target > 0 ? (c.collected / c.target) * 100 : null;
      });
    }

    // 3. Build List of the 5 Account Managers
    const amList = DEFAULT_5_AMS.map((name) => {
      const profile = AM_PROFILES[name] || {
        displayName: name,
        role: 'Account Manager',
        avatar: name[0],
        accentColor: '#38bdf8',
        gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)',
      };

      const s = salesMap[name] || { target: 0, sales: 0, storeCount: 0 };
      const c = collectionMap[name] || {
        target: 0,
        collected: 0,
        pending: 0,
        rate: null,
        customerCount: 0,
      };

      const salesRate = s.target > 0 ? (s.sales / s.target) * 100 : 0;
      const collectionRate =
        c.target > 0
          ? (c.collected / c.target) * 100
          : c.collected + c.pending > 0
            ? (c.collected / (c.collected + c.pending)) * 100
            : 0;

      const salesRemaining = Math.max(0, s.target - s.sales);
      const collectionPending = c.pending > 0 ? c.pending : Math.max(0, c.target - c.collected);

      // Average KPI = (Sales KPI + Collection KPI) / 2
      const averageKpi = (salesRate + collectionRate) / 2;

      return {
        id: name.toLowerCase(),
        name,
        profile,
        // Sales metrics
        salesTarget: s.target,
        salesActual: s.sales,
        salesRemaining,
        salesRate,
        storeCount: s.storeCount,
        // Collection metrics
        collectionTarget: c.target,
        collectionCollected: c.collected,
        collectionPending,
        collectionRate,
        customerCount: c.customerCount,
        // Combined metrics
        averageKpi,
        salesStatus: getKpiStatus(salesRate),
        collectionStatus: getKpiStatus(collectionRate),
        averageStatus: getKpiStatus(averageKpi),
      };
    });

    // 4. Sort and assign ranks
    const rankedList = [...amList].sort((a, b) => b.averageKpi - a.averageKpi);
    return rankedList.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [salesRows, paymentPics, paymentRows]);

  return (
    <div className="kpi-page">
      <div className="kpi-am-grid">
        {amCardsData.map((am) => {
          const rankClass =
            am.rank === 1
              ? 'rank-gold'
              : am.rank === 2
                ? 'rank-silver'
                : am.rank === 3
                  ? 'rank-bronze'
                  : 'rank-standard';

          const rankIcon =
            am.rank === 1 ? '🥇 #1' : am.rank === 2 ? '🥈 #2' : am.rank === 3 ? '🥉 #3' : `#${am.rank}`;

          return (
            <div
              key={am.id}
              className={`kpi-card-box kpi-card-box--${am.id}`}
              style={{ '--am-accent': am.profile.accentColor }}
            >
              {/* Card Header */}
              <div className="kpi-card-header">
                <div className="kpi-card-header__left">
                  <div
                    className="kpi-am-avatar"
                    style={{ background: am.profile.gradient }}
                  >
                    <span>{am.profile.avatar}</span>
                  </div>
                  <div className="kpi-am-details">
                    <h3 className="kpi-am-name">{am.name}</h3>
                    <span className="kpi-am-role">{am.profile.role}</span>
                  </div>
                </div>

                <div className="kpi-card-header__right">
                  <span className={`kpi-rank-badge ${rankClass}`}>{rankIcon}</span>
                </div>
              </div>

              {/* Main Average KPI Banner (Horizontal Bar) */}
              <div className="kpi-average-banner">
                <div className="kpi-average-banner__info">
                  <span className="kpi-average-banner__title">AVERAGE KPI</span>
                  <span className={`kpi-status-badge ${am.averageStatus.class}`}>
                    {am.averageStatus.label}
                  </span>
                </div>

                <div className="kpi-average-banner__bar-wrap">
                  <div className="kpi-average-bar-track">
                    <div
                      className="kpi-average-bar-fill"
                      style={{
                        width: `${clamp(am.averageKpi)}%`,
                        background: am.profile.gradient,
                      }}
                    />
                  </div>
                </div>

                <div className="kpi-average-banner__score">
                  <span className="kpi-average-score__number">
                    {am.averageKpi.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Dual KPI Metrics: Sales KPI (Left) vs Collection KPI (Right) */}
              <div className="kpi-dual-grid">
                {/* Sales KPI Column */}
                <div className="kpi-metric-col kpi-metric-col--sales">
                  <div className="kpi-metric-col__header">
                    <div className="kpi-metric-col__title-wrap">
                      <span className="kpi-col-icon">💰</span>
                      <span className="kpi-col-title">Sales KPI</span>
                    </div>
                    <span className="kpi-col-rate text-blue font-bold">
                      {formatPercent(am.salesRate)}
                    </span>
                  </div>

                  <div className="kpi-progress-track">
                    <div
                      className="kpi-progress-fill kpi-progress-fill--blue"
                      style={{ width: `${clamp(am.salesRate)}%` }}
                    />
                  </div>

                  <div className="kpi-numbers-list">
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Target:</span>
                      <span className="kpi-num-val font-mono font-bold text-primary">
                        {formatCurrency(am.salesTarget)}
                      </span>
                    </div>
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Actual:</span>
                      <span className="kpi-num-val font-mono font-bold text-success">
                        {formatCurrency(am.salesActual)}
                      </span>
                    </div>
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Remaining:</span>
                      <span className="kpi-num-val font-mono font-bold text-warning">
                        {formatCurrency(am.salesRemaining)}
                      </span>
                    </div>
                  </div>

                  <div className="kpi-scope-tag">
                    <span>🏪 {am.storeCount} Outlets Managed</span>
                  </div>
                </div>

                {/* Collection KPI Column */}
                <div className="kpi-metric-col kpi-metric-col--collection">
                  <div className="kpi-metric-col__header">
                    <div className="kpi-metric-col__title-wrap">
                      <span className="kpi-col-icon">💵</span>
                      <span className="kpi-col-title">Collection KPI</span>
                    </div>
                    <span className="kpi-col-rate text-green font-bold">
                      {formatPercent(am.collectionRate)}
                    </span>
                  </div>

                  <div className="kpi-progress-track">
                    <div
                      className="kpi-progress-fill kpi-progress-fill--green"
                      style={{ width: `${clamp(am.collectionRate)}%` }}
                    />
                  </div>

                  <div className="kpi-numbers-list">
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Target:</span>
                      <span className="kpi-num-val font-mono font-bold text-primary">
                        {formatCurrency(am.collectionTarget)}
                      </span>
                    </div>
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Collected:</span>
                      <span className="kpi-num-val font-mono font-bold text-success">
                        {formatCurrency(am.collectionCollected)}
                      </span>
                    </div>
                    <div className="kpi-number-row">
                      <span className="kpi-num-label">Pending:</span>
                      <span className="kpi-num-val font-mono font-bold text-danger">
                        {formatCurrency(am.collectionPending)}
                      </span>
                    </div>
                  </div>

                  <div className="kpi-scope-tag">
                    <span>🏬 {am.customerCount} Customers Managed</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default KpiDashboard;
