// src/components/OnlineSalesDashboard.jsx
import React, { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import KpiCard from './KpiCard';
import { formatCurrency, formatPercent, formatCompactCurrency } from '../utils/fetchSheet';
import './OverviewDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function OnlineSalesDashboard({ data }) {
  const {
    shopeeTotal = 0,
    tiktokTotal = 0,
    totalSales = 0,
    shopeePercent = 0,
    tiktokPercent = 0,
    dailyRecords = [],
    activeDaysCount = 0,
    dailyAverage = 0,
    peakDay = null,
  } = data || {};

  // Best day for Shopee & TikTok individually
  const channelHighlights = useMemo(() => {
    let bestShopee = { date: '-', val: 0 };
    let bestTiktok = { date: '-', val: 0 };

    dailyRecords.forEach((d) => {
      if (d.shopee > bestShopee.val) bestShopee = { date: d.date, val: d.shopee };
      if (d.tiktok > bestTiktok.val) bestTiktok = { date: d.date, val: d.tiktok };
    });

    return { bestShopee, bestTiktok };
  }, [dailyRecords]);

  // Chart 1: Daily Revenue Trend (Shopee vs TikTok per day)
  const dailyTrendData = useMemo(() => {
    const labels = dailyRecords.map((d) => d.date.replace('/2026', ''));
    return {
      labels,
      datasets: [
        {
          label: 'Shopee (RM)',
          data: dailyRecords.map((d) => d.shopee),
          backgroundColor: 'rgba(249, 115, 22, 0.85)',
          borderColor: '#f97316',
          borderWidth: 1.5,
          borderRadius: 4,
        },
        {
          label: 'TikTok (RM)',
          data: dailyRecords.map((d) => d.tiktok),
          backgroundColor: 'rgba(0, 155, 214, 0.9)',
          borderColor: '#009bd6',
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    };
  }, [dailyRecords]);

  // Chart 2: Platform Total Comparison (C34 Shopee vs D34 TikTok)
  const platformComparisonData = useMemo(() => {
    return {
      labels: ['Shopee (C34)', 'TikTok Shop (D34)'],
      datasets: [
        {
          label: 'Sales Revenue (RM)',
          data: [shopeeTotal, tiktokTotal],
          backgroundColor: ['rgba(249, 115, 22, 0.85)', 'rgba(86, 142, 70, 0.9)'],
          borderColor: ['#f97316', '#568e46'],
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [shopeeTotal, tiktokTotal]);

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

  // Top daily records sorted for ticker
  const topDays = useMemo(() => {
    return [...dailyRecords].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [dailyRecords]);

  return (
    <div className="tv-overview">
      {/* Top KPI Cards */}
      <div className="tv-overview__kpis">
        <KpiCard
          title="Total Online Sales"
          value={formatCurrency(totalSales)}
          badge="Shopee + TikTok"
          status="primary"
          icon="🛒"
        />
        <KpiCard
          title="Shopee Total Sales"
          value={formatCurrency(shopeeTotal)}
          badge={`${shopeePercent.toFixed(1)}% Share (C34)`}
          status="warning"
          icon="🛍️"
        />
        <KpiCard
          title="TikTok Shop Total"
          value={formatCurrency(tiktokTotal)}
          badge={`${tiktokPercent.toFixed(1)}% Share (D34)`}
          status="success"
          icon="📱"
        />
        <KpiCard
          title="Daily Average Sales"
          value={formatCurrency(dailyAverage)}
          subtitle={`Across ${activeDaysCount} Days in Oct`}
          status="primary"
          icon="📅"
        />
        <KpiCard
          title="Highest Single Day"
          value={formatCurrency(peakDay?.total)}
          subtitle={peakDay ? `Peak on ${peakDay.date}` : '-'}
          status="success"
          icon="⚡"
        />
        <KpiCard
          title="Leading Platform"
          value={tiktokTotal >= shopeeTotal ? 'TikTok Shop' : 'Shopee'}
          badge={`${Math.max(tiktokPercent, shopeePercent).toFixed(1)}% Contribution`}
          status="success"
          icon="👑"
        />
      </div>

      {/* Main Grid: Channels Breakdown (Left) & Trend Charts (Right) */}
      <div className="tv-overview__main">
        {/* Left: Platform Cards */}
        <div className="tv-overview__left">
          <div className="tv-panel-header">
            <h2 className="tv-panel-title">E-commerce Platforms Breakdown</h2>
            <span className="tv-panel-subtitle">Sheet: OKTOBER 2026 (C34 & D34)</span>
          </div>

          <div className="tv-pic-list">
            {[
              {
                name: "Shopee Official Store",
                total: shopeeTotal,
                percent: shopeePercent,
                average: activeDaysCount > 0 ? shopeeTotal / activeDaysCount : 0,
                peak: channelHighlights.bestShopee,
                activeDays: activeDaysCount,
                letter: "S",
                color: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                cardClass: "tv-pic-card--warning",
                fillClass: "tv-pic-progress-fill--warning",
                textClass: "text-warning",
                shareClass: "text-lemon",
              },
              {
                name: "TikTok Shop",
                total: tiktokTotal,
                percent: tiktokPercent,
                average: activeDaysCount > 0 ? tiktokTotal / activeDaysCount : 0,
                peak: channelHighlights.bestTiktok,
                activeDays: activeDaysCount,
                letter: "T",
                color: "linear-gradient(135deg, #009bd6 0%, #007bb0 100%)",
                cardClass: "tv-pic-card--success tv-pic-card--highlight-best",
                fillClass: "tv-pic-progress-fill--success",
                textClass: "text-success",
                shareClass: "text-success",
              },
            ]
              .sort((a, b) => b.total - a.total)
              .map((platform) => (
                <div
                  key={platform.name}
                  className={`tv-pic-card ${platform.cardClass}`}
                >
                  <div className="tv-pic-card__top">
                    <div className="tv-pic-card__identity">
                      <span
                        className="tv-pic-card__avatar"
                        style={{ background: platform.color }}
                      >
                        {platform.letter}
                      </span>
                      <div>
                        <h3 className="tv-pic-card__name">{platform.name}</h3>
                        <span className="tv-pic-card__meta">
                          {platform.name === "Shopee Official Store"
                            ? "Value from C34"
                            : "Value from D34"}{" "}
                          • {platform.activeDays} Active Days
                        </span>
                      </div>
                    </div>

                    <div className="tv-pic-card__pills">
                      <div className="tv-pill" style={{ width: "130px" }}>
                        <div
                          className={`tv-pill__fill ${platform.fillClass}`}
                          style={{ width: `${platform.percent}%` }}
                        />
                        <span className="tv-pill__label">Share</span>
                        <span className="tv-pill__value">
                          {platform.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="tv-pic-card__metrics">
                    <div className="tv-metric-item">
                      <span className="tv-metric-label">Total Revenue:</span>
                      <span
                        className={`tv-metric-value ${platform.textClass} font-bold`}
                      >
                        {formatCurrency(platform.total)}
                      </span>
                    </div>

                    <div className="tv-metric-item">
                      <span className="tv-metric-label">Daily Average:</span>
                      <span className="tv-metric-value font-bold">
                        {formatCurrency(platform.average)}
                      </span>
                    </div>

                    <div className="tv-metric-item">
                      <span className="tv-metric-label">Peak Day:</span>
                      <span
                        className="tv-metric-value font-bold"
                        title={platform.peak.date}
                      >
                        {formatCurrency(platform.peak.val)}
                      </span>
                    </div>

                    <div className="tv-metric-item">
                      <span className="tv-metric-label">Share:</span>
                      <span
                        className={`tv-metric-value ${platform.shareClass} font-bold`}
                      >
                        {platform.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="tv-pic-progress-track">
                    <div
                      className={`tv-pic-progress-fill ${platform.fillClass}`}
                      style={{ width: `${platform.percent}%` }}
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
              <h2 className="tv-panel-title">Daily Sales Trend (Shopee vs TikTok)</h2>
              <span className="tv-panel-subtitle">October Daily Performance</span>
            </div>
            <div className="tv-chart-container">
              <Bar data={dailyTrendData} options={compactChartOptions} />
            </div>
          </div>

          <div className="tv-chart-box">
            <div className="tv-panel-header">
              <h2 className="tv-panel-title">Platform Total Revenue Comparison</h2>
              <span className="tv-panel-subtitle">Shopee (C34) vs TikTok Shop (D34)</span>
            </div>
            <div className="tv-chart-container">
              <Bar
                data={platformComparisonData}
                options={{
                  ...compactChartOptions,
                  plugins: {
                    ...compactChartOptions.plugins,
                    legend: { display: false },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker: Daily Peak Days */}
      <div className="tv-overview__bottom-ticker">
        <div className="tv-ticker-label">
          <span className="tv-ticker-dot" />
          <span>TOP REVENUE DAYS:</span>
        </div>
        <div className="tv-ticker-items">
          {topDays.length > 0 ? (
            topDays.map((d, i) => (
              <div key={d.date} className="tv-ticker-chip">
                <span className="tv-ticker-rank">#{i + 1}</span>
                <span className="tv-ticker-store">{d.date}</span>
                <span className="tv-ticker-val">{formatCurrency(d.total)}</span>
                <span className="tv-ticker-pic">
                  (Shopee: {formatCompactCurrency(d.shopee)} | TikTok: {formatCompactCurrency(d.tiktok)})
                </span>
              </div>
            ))
          ) : (
            <div className="tv-ticker-chip">
              Awaiting daily online sales records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnlineSalesDashboard;
