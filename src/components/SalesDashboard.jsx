// src/components/SalesDashboard.jsx
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

// Colour band for a percentage (same thresholds as the card status)
const rateStatus = (v) => {
  if (v === null || v === undefined) return 'neutral';
  if (v >= 100) return 'success';
  if (v >= 70) return 'primary';
  if (v >= 40) return 'warning';
  return 'danger';
};
const clampPct = (v) => Math.max(0, Math.min(100, v || 0));

function SalesDashboard({ rows }) {
  // Aggregate metrics across rows for selected month
  const summary = useMemo(() => {
    let totalTarget = 0;
    let hasTarget = false;
    let totalSales = 0;
    let hasSales = false;

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

      const p = row.person || 'Unassigned';
      if (!picMap[p]) {
        picMap[p] = {
          name: p,
          target: 0,
          sales: 0,
          hasTarget: false,
          hasSales: false,
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
    });

    const overallSalesPercent = hasTarget && totalTarget > 0 ? (totalSales / totalTarget) * 100 : null;
    const totalRemaining = hasTarget ? Math.max(0, totalTarget - totalSales) : 0;

    const picList = Object.values(picMap).map((p) => {
      const pct = p.hasTarget && p.target > 0 ? (p.sales / p.target) * 100 : null;
      const rem = p.hasTarget ? Math.max(0, p.target - p.sales) : 0;

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
        remaining: rem,
        status,
        statusLabel,
      };
    });

    const sortedPicList = picList.sort((a, b) => {
      if (a.percent === null) return b.percent === null ? a.name.localeCompare(b.name) : 1;
      if (b.percent === null) return -1;
      return b.percent - a.percent || a.name.localeCompare(b.name);
    });

    const ratedPicList = sortedPicList.filter((pic) => pic.percent !== null);
    const highestPic = ratedPicList[0];
    const lowestPic = ratedPicList[ratedPicList.length - 1];
    const rankedPicList = sortedPicList.map((pic) => ({
      ...pic,
      performanceHighlight: pic === highestPic
        ? 'best'
        : pic === lowestPic && lowestPic !== highestPic
          ? 'worst'
          : null,
    }));

    // Top 5 performing stores by actual sales
    const topStores = [...rows]
      .filter((r) => r.sales !== null && r.sales > 0)
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 8);

    return {
      totalTarget: hasTarget ? totalTarget : null,
      totalSales: hasSales ? totalSales : null,
      overallSalesPercent,
      totalRemaining,
      totalStores: rows.length,
      picList: rankedPicList,
      topStores,
      topPic: highestPic || null,
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
          backgroundColor: 'rgba(0, 155, 214, 0.45)',
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

  // Chart 2: Quota Achievement Rate (%) by Person in Charge
  const achievementChartData = useMemo(() => {
    const labels = summary.picList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Achievement %',
          data: summary.picList.map((p) => (p.percent !== null ? Number(p.percent.toFixed(1)) : 0)),
          backgroundColor: summary.picList.map((p) =>
            p.percent >= 100
              ? 'rgba(86, 142, 70, 0.9)'
              : p.percent >= 70
              ? 'rgba(0, 155, 214, 0.9)'
              : p.percent >= 40
              ? 'rgba(248, 245, 75, 0.95)'
              : 'rgba(229, 67, 48, 0.9)'
          ),
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
          color: '#cbd5e1',
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
        ticks: { color: '#94a3b8', font: { size: 10, weight: '700' } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: '600' },
          callback: (val) => formatCompactCurrency(val),
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  };

  const percentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c0b0c',
        titleColor: '#f8f54b',
        bodyColor: '#ffffff',
        borderColor: 'rgba(248, 245, 75, 0.35)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `Achievement: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 10, weight: '700' } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: '600' },
          callback: (val) => `${val}%`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  };

  return (
    <div className="tv-overview">
      {/* Top KPI Cards (Following Overview coding and features) */}
      <div className="tv-overview__kpis">
        <KpiCard
          title="Total Target"
          value={formatCurrency(summary.totalTarget)}
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
          status={
            summary.overallSalesPercent !== null && summary.overallSalesPercent >= 70
              ? 'success'
              : 'warning'
          }
          icon="💰"
        />
        <KpiCard
          title="Sales vs Target Rate"
          value={formatPercent(summary.overallSalesPercent)}
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
          title="Remaining Target"
          value={formatCurrency(summary.totalRemaining)}
          badge={
            summary.totalRemaining === 0 && summary.totalSales > 0
              ? 'Target Hit!'
              : `Quota Balance`
          }
          status={summary.totalRemaining === 0 ? 'success' : 'purple'}
          icon="⏳"
        />
        <KpiCard
          title="Total Outlets Managed"
          value={summary.totalStores}
          subtitle={`${summary.picList.length} Team Leaders active`}
          status="default"
          icon="🏪"
        />
        <KpiCard
          title="Top Performing Leader"
          value={summary.topPic ? summary.topPic.name : '-'}
          badge={summary.topPic && summary.topPic.percent !== null ? `${summary.topPic.percent.toFixed(1)}% Rate` : undefined}
          status="success"
          icon="🏆"
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
              <div
                key={pic.name}
                className={`tv-pic-card tv-pic-card--${pic.status}${pic.performanceHighlight ? ` tv-pic-card--highlight-${pic.performanceHighlight}` : ''}`}
              >
                <div className="tv-pic-card__top">
                  <div className="tv-pic-card__identity">
                    <span className="tv-pic-card__avatar">{pic.name[0]}</span>
                    <div>
                      <h3 className="tv-pic-card__name">{pic.name}</h3>
                      <span className="tv-pic-card__meta">{pic.storeCount} Stores Managed</span>
                    </div>
                  </div>

                  <div className="tv-pic-card__pills">
                    {[
                      { label: 'Achieved', value: pic.percent },
                    ].map((c) => (
                      <div key={c.label} className="tv-pill" style={{ width: '130px' }}>
                        <div
                          className={`tv-pill__fill tv-pill__fill--${rateStatus(c.value)}`}
                          style={{ width: `${clampPct(c.value)}%` }}
                        />
                        <span className="tv-pill__label">{c.label}</span>
                        <span className="tv-pill__value">{formatPercent(c.value)}</span>
                      </div>
                    ))}
                  </div>
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
                    <span className="tv-metric-label">Actual Sales:</span>
                    <span className="tv-metric-value text-success font-bold">
                      {formatCurrency(pic.sales)}
                    </span>
                  </div>
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Remaining:</span>
                    <span className="tv-metric-value text-warning font-bold">
                      {formatCurrency(pic.remaining)}
                    </span>
                  </div>
                  <div className="tv-metric-item">
                    <span className="tv-metric-label">Rate:</span>
                    <span className="tv-metric-value font-bold">
                      {formatPercent(pic.percent)}
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
              <h2 className="tv-panel-title">Sales Target vs Actual by PIC</h2>
              <span className="tv-panel-subtitle">Target (Blue) vs Sales (Green)</span>
            </div>
            <div className="tv-chart-container">
              <Bar data={salesChartData} options={compactChartOptions} />
            </div>
          </div>

          <div className="tv-chart-box">
            <div className="tv-panel-header">
              <h2 className="tv-panel-title">Sales vs Target Achievement Rate (%)</h2>
              <span className="tv-panel-subtitle">Target Fulfillment by Team Member</span>
            </div>
            <div className="tv-chart-container">
              <Bar data={achievementChartData} options={percentChartOptions} />
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
              <div key={st.id || i} className="tv-ticker-chip">
                <span className="tv-ticker-rank">#{i + 1}</span>
                <span className="tv-ticker-store" title={st.store}>
                  {st.store}
                </span>
                <span className="tv-ticker-pic" title={st.person}>
                  ({st.person})
                </span>
                <span className="tv-ticker-val">{formatCurrency(st.sales)}</span>
                {st.salesPercent !== null && (
                  <span className="tv-ticker-pct">
                    [{st.salesPercent.toFixed(0)}%]
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="tv-ticker-chip">
              Awaiting active sales input for this month
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;
