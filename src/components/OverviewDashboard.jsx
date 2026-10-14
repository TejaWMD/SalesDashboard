// src/components/OverviewDashboard.jsx
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import KpiCard from './KpiCard';
import { formatCurrency, formatPercent, formatCompactCurrency } from '../utils/fetchSheet';
import './OverviewDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function OverviewDashboard({ rows }) {
  // Aggregate metrics across rows for selected month
  const summary = useMemo(() => {
    let totalTarget = 0;
    let hasTarget = false;
    let totalSales = 0;
    let hasSales = false;
    let totalCollected = 0;
    let hasCollected = false;
    let totalPending = 0;
    let hasPending = false;

    const picMap = {};

    rows.forEach((row) => {
      if (row.target !== null) {
        totalTarget += row.target;
        hasTarget = true;
      }
      if (row.sales !== null) {
        totalSales += row.sales;
        hasSales = true;
      }
      if (row.collected !== null) {
        totalCollected += row.collected;
        hasCollected = true;
      }
      if (row.pending !== null) {
        totalPending += row.pending;
        hasPending = true;
      }

      const p = row.person || 'Unassigned';
      if (!picMap[p]) {
        picMap[p] = {
          name: p,
          target: 0,
          sales: 0,
          collected: 0,
          pending: 0,
          hasTarget: false,
          hasSales: false,
          hasCollected: false,
          hasPending: false,
          storeCount: 0,
        };
      }

      picMap[p].storeCount += 1;
      if (row.target !== null) {
        picMap[p].target += row.target;
        picMap[p].hasTarget = true;
      }
      if (row.sales !== null) {
        picMap[p].sales += row.sales;
        picMap[p].hasSales = true;
      }
      if (row.collected !== null) {
        picMap[p].collected += row.collected;
        picMap[p].hasCollected = true;
      }
      if (row.pending !== null) {
        picMap[p].pending += row.pending;
        picMap[p].hasPending = true;
      }
    });

    const overallSalesPercent = hasTarget && totalTarget > 0 ? (totalSales / totalTarget) * 100 : null;
    const totalReceivable = totalCollected + totalPending;
    const overallCollectionPercent = totalReceivable > 0 ? (totalCollected / totalReceivable) * 100 : null;

    const picList = Object.values(picMap).map((p) => {
      const pct = p.hasTarget && p.target > 0 ? (p.sales / p.target) * 100 : null;
      const rec = p.collected + p.pending;
      const collPct = rec > 0 ? (p.collected / rec) * 100 : null;

      let status = 'neutral';
      let statusLabel = 'Awaiting';
      if (pct !== null) {
        if (pct >= 100) {
          status = 'success';
          statusLabel = 'Exceeded';
        } else if (pct >= 70) {
          status = 'primary';
          statusLabel = 'On Track';
        } else if (pct >= 40) {
          status = 'warning';
          statusLabel = 'In Progress';
        } else {
          status = 'danger';
          statusLabel = 'Needs Push';
        }
      }

      return {
        ...p,
        percent: pct,
        collectionPercent: collPct,
        status,
        statusLabel,
      };
    });

    // Top 5 performing stores by actual sales
    const topStores = [...rows]
      .filter((r) => r.sales !== null && r.sales > 0)
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 5);

    return {
      totalTarget: hasTarget ? totalTarget : null,
      totalSales: hasSales ? totalSales : null,
      overallSalesPercent,
      totalCollected: hasCollected ? totalCollected : null,
      totalPending: hasPending ? totalPending : null,
      overallCollectionPercent,
      totalStores: rows.length,
      picList,
      topStores,
    };
  }, [rows]);

  // Chart 1: Sales vs Target by Person in Charge
  const salesChartData = useMemo(() => {
    const labels = summary.picList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Target (RM)',
          data: summary.picList.map((p) => p.target || 0),
          backgroundColor: 'rgba(0, 155, 214, 0.4)',
          borderColor: '#009bd6',
          borderWidth: 1.5,
          borderRadius: 5,
        },
        {
          label: 'Sales (RM)',
          data: summary.picList.map((p) => p.sales || 0),
          backgroundColor: 'rgba(86, 142, 70, 0.9)',
          borderColor: '#568e46',
          borderWidth: 1.5,
          borderRadius: 5,
        },
      ],
    };
  }, [summary.picList]);

  // Chart 2: Collection vs Pending by Person in Charge
  const collectionChartData = useMemo(() => {
    const labels = summary.picList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Collected (RM)',
          data: summary.picList.map((p) => p.collected || 0),
          backgroundColor: 'rgba(86, 142, 70, 0.9)',
          borderColor: '#568e46',
          borderWidth: 1.5,
          borderRadius: 5,
        },
        {
          label: 'Pending (RM)',
          data: summary.picList.map((p) => p.pending || 0),
          backgroundColor: 'rgba(229, 67, 48, 0.85)',
          borderColor: '#e54330',
          borderWidth: 1.5,
          borderRadius: 5,
        },
      ],
    };
  }, [summary.picList]);

  const compactChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#f8fafc',
          font: { size: 11, weight: '700' },
          boxWidth: 12,
          padding: 8,
        },
      },
      tooltip: {
        backgroundColor: '#0c0b0c',
        titleColor: '#f8f54b',
        bodyColor: '#ffffff',
        borderColor: 'rgba(248, 245, 75, 0.35)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#cbd5e1', font: { size: 10, weight: '700' } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#cbd5e1',
          font: { size: 10, weight: '600' },
          callback: (val) => formatCompactCurrency(val),
        },
        grid: { color: 'rgba(255, 255, 255, 0.07)' },
      },
    },
  };

  return (
    <div className="tv-overview">
      {/* Top 5 KPI Cards (Compact Row for TV) */}
      <div className="tv-overview__kpis">
        <KpiCard
          title="Total Target"
          value={formatCurrency(summary.totalTarget)}
          subtitle="Monthly Sales Target"
          status="primary"
          icon="🎯"
        />
        <KpiCard
          title="Actual Sales"
          value={formatCurrency(summary.totalSales)}
          badge={
            summary.overallSalesPercent !== null
              ? `${summary.overallSalesPercent.toFixed(1)}% Achieved`
              : 'No Data'
          }
          subtitle="Total Invoiced"
          status={
            summary.overallSalesPercent !== null && summary.overallSalesPercent >= 70
              ? 'success'
              : 'warning'
          }
          icon="💰"
        />
        <KpiCard
          title="S vs T Rate"
          value={formatPercent(summary.overallSalesPercent)}
          subtitle={`Across ${summary.totalStores} Outlets`}
          status={
            summary.overallSalesPercent !== null && summary.overallSalesPercent >= 100
              ? 'success'
              : summary.overallSalesPercent !== null && summary.overallSalesPercent >= 70
              ? 'primary'
              : 'warning'
          }
          icon="📈"
        />
        <KpiCard
          title="Payment Collected"
          value={formatCurrency(summary.totalCollected)}
          badge={
            summary.overallCollectionPercent !== null
              ? `${summary.overallCollectionPercent.toFixed(1)}% Settled`
              : 'Pending Input'
          }
          subtitle="Cash Received"
          status="success"
          icon="💵"
        />
        <KpiCard
          title="Payment Pending"
          value={formatCurrency(summary.totalPending)}
          subtitle="Outstanding Amount"
          status={summary.totalPending && summary.totalPending > 0 ? 'danger' : 'neutral'}
          icon="⏳"
        />
      </div>

      {/* Main Grid: PIC Scorecards (Left) & Comparison Charts (Right) */}
      <div className="tv-overview__main">
        {/* Left: Person In Charge Scorecard Cards */}
        <div className="tv-overview__left">
          <div className="tv-panel-header">
            <h2 className="tv-panel-title">Person in Charge Performance</h2>
            <span className="tv-panel-subtitle">{summary.picList.length} Team Leaders</span>
          </div>

          <div className="tv-pic-list">
            {summary.picList.map((pic) => (
              <div key={pic.name} className={`tv-pic-card tv-pic-card--${pic.status}`}>
                <div className="tv-pic-card__top">
                  <div className="tv-pic-card__identity">
                    <span className="tv-pic-card__avatar">{pic.name[0]}</span>
                    <div>
                      <h3 className="tv-pic-card__name">{pic.name}</h3>
                      <span className="tv-pic-card__meta">{pic.storeCount} Stores Managed</span>
                    </div>
                  </div>
                  <span className={`tv-status-badge tv-status-badge--${pic.status}`}>
                    {pic.percent !== null ? `${pic.percent.toFixed(1)}%` : pic.statusLabel}
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="tv-pic-card__metrics">
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Target:</span>
                    <span className="tv-metric-value text-primary font-bold">
                      {formatCurrency(pic.target)}
                    </span>
                  </div>
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Sales:</span>
                    <span className="tv-metric-value text-success font-bold">
                      {formatCurrency(pic.sales)}
                    </span>
                  </div>
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Collected:</span>
                    <span className="tv-metric-value text-success font-bold">
                      {formatCurrency(pic.collected)}
                    </span>
                  </div>
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Pending:</span>
                    <span className="tv-metric-value text-danger font-bold">
                      {formatCurrency(pic.pending)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="tv-pic-progress-track">
                  <div
                    className={`tv-pic-progress-fill tv-pic-progress-fill--${pic.status}`}
                    style={{ width: `${Math.min(100, pic.percent || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dual TV Comparison Charts */}
        <div className="tv-overview__right">
          <div className="tv-chart-box">
            <div className="tv-panel-header">
              <h2 className="tv-panel-title">Sales vs Target by PIC</h2>
              <span className="tv-panel-subtitle">Target (Blue) vs Sales (Green)</span>
            </div>
            <div className="tv-chart-container">
              <Bar data={salesChartData} options={compactChartOptions} />
            </div>
          </div>

          <div className="tv-chart-box">
            <div className="tv-panel-header">
              <h2 className="tv-panel-title">Payment Collection Status</h2>
              <span className="tv-panel-subtitle">Collected (Green) vs Pending (Red)</span>
            </div>
            <div className="tv-chart-container">
              <Bar data={collectionChartData} options={compactChartOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker: Top Stores & Outlets Overview */}
      <div className="tv-overview__bottom-ticker">
        <div className="tv-ticker-label">
          <span className="tv-ticker-dot" />
          <span>TOP OUTLETS:</span>
        </div>
        <div className="tv-ticker-items">
          {summary.topStores.length > 0 ? (
            summary.topStores.map((st, i) => (
              <div key={st.id} className="tv-ticker-chip">
                <span className="tv-ticker-rank">#{i + 1}</span>
                <span className="tv-ticker-store">{st.store}</span>
                <span className="tv-ticker-pic">({st.person})</span>
                <span className="tv-ticker-val">{formatCurrency(st.sales)}</span>
                {st.salesPercent !== null && (
                  <span className="tv-ticker-pct">[{st.salesPercent.toFixed(0)}%]</span>
                )}
              </div>
            ))
          ) : (
            <div className="tv-ticker-chip">Awaiting active sales input for this month</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OverviewDashboard;
