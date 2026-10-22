// src/components/CollectionDashboard.jsx

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

import {
  formatCurrency,
  formatPercent,
  formatCompactCurrency,
  getChartResponsiveFonts,
} from '../utils/fetchSheet';

import './OverviewDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const rateStatus = (value) => {
  if (value === null || value === undefined) return 'neutral';
  if (value >= 90) return 'success';
  if (value >= 60) return 'primary';
  if (value >= 30) return 'warning';
  return 'danger';
};

const clampPct = (value) =>
  Math.max(0, Math.min(100, value || 0));

function CollectionDashboard({ data }) {
  const [chartFonts, setChartFonts] = React.useState(getChartResponsiveFonts);

  React.useEffect(() => {
    const handleResize = () => setChartFonts(getChartResponsiveFonts());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    rows = [],
    picList = [],
    summary = {},
  } = data || {};

  // Calculate dashboard metrics without receivable fields.
  const computed = useMemo(() => {
    const pendingCustomerCount = rows.filter(
      (row) => row.pending !== null && row.pending > 0
    ).length;

    const totalCollected = summary.totalCollected ?? 0;
    const totalPending = summary.totalPending ?? 0;

    const overallCollectionRate =
      summary.overallCollectionRate ?? null;

    const overallPendingRate =
      summary.overallPendingRate ?? null;

    // Customers with the highest outstanding payments.
    const topPendingCustomers = [...rows]
      .filter(
        (row) => row.pending !== null && row.pending > 0
      )
      .sort(
        (a, b) => (b.pending || 0) - (a.pending || 0)
      )
      .slice(0, 8);

    const topAM = picList.find(
      (pic) => pic.performanceHighlight === 'best'
    );

    return {
      totalCollected,
      totalPending,
      overallCollectionRate,
      overallPendingRate,
      pendingCustomerCount,
      totalCustomers: summary.totalCustomers ?? rows.length,
      picList,
      topPendingCustomers,
      topAM: topAM || null,
    };
  }, [rows, picList, summary]);

  // Chart 1: Payment Collected vs Payment Pending.
  const comparisonChartData = useMemo(() => ({
    labels: computed.picList.map((pic) => pic.name),

    datasets: [
      {
        label: 'Payment Collected (RM)',

        data: computed.picList.map(
          (pic) => pic.collected || 0
        ),

        backgroundColor: 'rgba(86, 142, 70, 0.9)',
        borderColor: '#568e46',
        borderWidth: 1.5,
        borderRadius: 5,
      },

      {
        label: 'Payment Pending (RM)',

        data: computed.picList.map(
          (pic) => pic.pending || 0
        ),

        backgroundColor: 'rgba(229, 67, 48, 0.85)',
        borderColor: '#e54330',
        borderWidth: 1.5,
        borderRadius: 5,
      },
    ],
  }), [computed.picList]);

  // Chart 2: Payment Collected Rate by Account Manager.
  const collectionRateChartData = useMemo(() => ({
    labels: computed.picList.map((pic) => pic.name),

    datasets: [
      {
        label: 'Payment Collected Rate (%)',

        data: computed.picList.map((pic) =>
          pic.collectionPercent !== null
            ? Number(pic.collectionPercent.toFixed(1))
            : 0
        ),

        backgroundColor: computed.picList.map((pic) =>
          pic.collectionPercent >= 90
            ? 'rgba(86, 142, 70, 0.9)'
            : pic.collectionPercent >= 60
              ? 'rgba(0, 155, 214, 0.9)'
              : pic.collectionPercent >= 30
                ? 'rgba(248, 245, 75, 0.95)'
                : 'rgba(229, 67, 48, 0.9)'
        ),

        borderRadius: 5,
      },
    ],
  }), [computed.picList]);

  const compactChartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: 'top',
        align: 'end',

        labels: {
          color: '#cbd5e1',
          font: {
            size: chartFonts.legend,
            weight: '700',
          },
          boxWidth: chartFonts.boxWidth,
          padding: chartFonts.padding,
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
          label: (context) =>
            `${context.dataset.label}: ${formatCurrency(context.raw)}`,
        },
      },
    },

    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
          font: {
            size: chartFonts.tick,
            weight: '700',
          },
        },

        grid: {
          display: false,
        },
      },

      y: {
        ticks: {
          color: '#94a3b8',
          font: {
            size: chartFonts.tick,
            weight: '600',
          },

          callback: (value) =>
            formatCompactCurrency(value),
        },

        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  };

  const rateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false,
      },

      tooltip: {
        backgroundColor: '#0c0b0c',
        titleColor: '#f8f54b',
        bodyColor: '#ffffff',
        borderColor: 'rgba(248, 245, 75, 0.35)',
        borderWidth: 1,
        padding: 10,

        callbacks: {
          label: (context) =>
            `Payment Collected Rate: ${context.raw}%`,
        },
      },
    },

    scales: {
      x: {
        ticks: {
          color: '#94a3b8',
          font: {
            size: chartFonts.tick,
            weight: '700',
          },
        },

        grid: {
          display: false,
        },
      },

      y: {
        min: 0,
        max: 100,

        ticks: {
          color: '#94a3b8',
          font: {
            size: chartFonts.tick,
            weight: '600',
          },

          callback: (value) => `${value}%`,
        },

        grid: {
          color: 'rgba(255, 255, 255, 0.08)',
        },
      },
    },
  };

  return (
    <div className="tv-overview">

      {/* KPI Cards */}
      <div className="tv-overview__kpis">

        <KpiCard
          title="Payment Collected"
          value={formatCurrency(computed.totalCollected)}
          badge={
            computed.overallCollectionRate !== null
              ? `${computed.overallCollectionRate.toFixed(1)}% Collected`
              : 'No Data'
          }
          status="success"
          icon="💵"
        />

        <KpiCard
          title="Payment Pending"
          value={formatCurrency(computed.totalPending)}
          badge={`${computed.pendingCustomerCount} Customers Pending`}
          status={
            computed.totalPending > 0
              ? 'danger'
              : 'neutral'
          }
          icon="⏳"
        />

        <KpiCard
          title="Payment Collected Rate"
          value={formatPercent(computed.overallCollectionRate)}
          status={
            computed.overallCollectionRate !== null &&
              computed.overallCollectionRate >= 70
              ? 'success'
              : computed.overallCollectionRate !== null &&
                computed.overallCollectionRate >= 40
                ? 'primary'
                : 'warning'
          }
          icon="📊"
        />

        <KpiCard
          title="Payment Pending Rate"
          value={formatPercent(computed.overallPendingRate)}
          status={
            computed.overallPendingRate > 50
              ? 'danger'
              : 'warning'
          }
          icon="📉"
        />

        <KpiCard
          title="Customers"
          value={computed.totalCustomers}
          subtitle={`${computed.picList.length} Account Managers`}
          status="default"
          icon="🏬"
        />
        <KpiCard
          title="Top Account Manager"
          value={computed.topAM ? computed.topAM.name : '-'}
          badge={
            computed.topAM &&
              computed.topAM.collectionPercent !== null
              ? `${computed.topAM.collectionPercent.toFixed(1)}% Rate`
              : undefined
          }
          status="success"
          icon="🏆"
        />

      </div>

      {/* Main Dashboard */}
      <div className="tv-overview__main">

        {/* Account Manager Performance */}
        <div className="tv-overview__left">

          <div className="tv-panel-header">
            <h2 className="tv-panel-title">
              Account Manager Payment Performance
            </h2>

            <span className="tv-panel-subtitle">
              {computed.picList.length} Account Managers
            </span>
          </div>

          <div className="tv-pic-list">

            {computed.picList.map((pic) => (
              <div
                key={pic.name}
                className={
                  `tv-pic-card tv-pic-card--${pic.status}` +
                  (
                    pic.performanceHighlight
                      ? ` tv-pic-card--highlight-${pic.performanceHighlight}`
                      : ''
                  )
                }
              >

                <div className="tv-pic-card__top">

                  <div className="tv-pic-card__identity">

                    <span className="tv-pic-card__avatar">
                      {pic.name[0]}
                    </span>

                    <div>
                      <h3 className="tv-pic-card__name">
                        {pic.name}
                      </h3>

                      <span className="tv-pic-card__meta">
                        {pic.customerCount} Customers
                      </span>
                    </div>

                  </div>

                  <div className="tv-pic-card__pills">

                    {[
                      {
                        label: 'Collected',
                        value: pic.collectionPercent,
                      },
                      {
                        label: 'Pending',
                        value: pic.pendingPercent,
                      },
                    ].map((item) => (

                      <div
                        key={item.label}
                        className="tv-pill"
                      >

                        <div
                          className={
                            'tv-pill__fill tv-pill__fill--' +
                            (
                              item.label === 'Collected'
                                ? rateStatus(item.value)
                                : 'danger'
                            )
                          }
                          style={{
                            width: `${clampPct(item.value)}%`,
                          }}
                        />

                        <span className="tv-pill__label">
                          {item.label}
                        </span>

                        <span className="tv-pill__value">
                          {formatPercent(item.value)}
                        </span>

                      </div>

                    ))}

                  </div>

                </div>

                {/* Payment Metrics */}
                <div className="tv-pic-card__metrics">

                  <div className="tv-metric-item">
                    <span className="tv-metric-label">
                      Payment Collected:
                    </span>

                    <span className="tv-metric-value text-success font-bold">
                      {formatCurrency(pic.collected)}
                    </span>
                  </div>

                  <div className="tv-metric-item">
                    <span className="tv-metric-label">
                      Payment Pending:
                    </span>

                    <span className="tv-metric-value text-danger font-bold">
                      {formatCurrency(pic.pending)}
                    </span>
                  </div>

                  <div className="tv-metric-item">
                    <span className="tv-metric-label">
                      Collected Rate:
                    </span>

                    <span className="tv-metric-value font-bold">
                      {formatPercent(pic.collectionPercent)}
                    </span>
                  </div>

                  <div className="tv-metric-item">
                    <span className="tv-metric-label">
                      Pending Rate:
                    </span>

                    <span className="tv-metric-value font-bold">
                      {formatPercent(pic.pendingPercent)}
                    </span>
                  </div>

                </div>

                {/* Collection Progress */}
                <div className="tv-pic-progress-track">
                  <div
                    className={
                      `tv-pic-progress-fill tv-pic-progress-fill--${pic.status}`
                    }
                    style={{
                      width: `${clampPct(pic.collectionPercent)}%`,
                    }}
                  />
                </div>

              </div>
            ))}

          </div>
        </div>

        {/* Charts */}
        <div className="tv-overview__right">

          <div className="tv-chart-box">

            <div className="tv-panel-header">
              <h2 className="tv-panel-title">
                Payment Collected vs Pending by Account Manager
              </h2>

              <span className="tv-panel-subtitle">
                Collected (Green) vs Pending (Red)
              </span>
            </div>

            <div className="tv-chart-container">
              <Bar
                data={comparisonChartData}
                options={compactChartOptions}
              />
            </div>

          </div>

          <div className="tv-chart-box">

            <div className="tv-panel-header">
              <h2 className="tv-panel-title">
                Payment Collected Rate (%)
              </h2>

              {/* <span className="tv-panel-subtitle">
                Collected Rate by Account Manager
              </span> */}
            </div>

            <div className="tv-chart-container">
              <Bar
                data={collectionRateChartData}
                options={rateChartOptions}
              />
            </div>

          </div>

        </div>
      </div>

      {/* Top Pending Customers
      <div className="tv-overview__bottom-ticker">

        <div className="tv-ticker-label">

          <span
            className="tv-ticker-dot"
            style={{
              background: '#e54330',
              boxShadow: '0 0 8px #e54330',
            }}
          />

          <span>TOP PENDING CUSTOMERS:</span>

        </div>

        <div className="tv-ticker-items">

          {computed.topPendingCustomers.length > 0 ? (

            computed.topPendingCustomers.map((customer, index) => (

              <div
                key={customer.id || index}
                className="tv-ticker-chip"
              >

                <span
                  className="tv-ticker-rank"
                  style={{ color: '#ff7d6e' }}
                >
                  #{index + 1}
                </span>

                <span
                  className="tv-ticker-store"
                  title={customer.customer}
                >
                  {customer.customer}
                </span>

                <span
                  className="tv-ticker-pic"
                  title={customer.person}
                >
                  ({customer.person})
                </span>

                <span
                  className="tv-ticker-val"
                  style={{ color: '#ff7d6e' }}
                >
                  {formatCurrency(customer.pending)}
                </span>

                {customer.collectionRate !== null && (

                  <span
                    className="tv-ticker-pct"
                    style={{ color: '#79d863' }}
                  >
                    [{customer.collectionRate.toFixed(0)}% Collected]
                  </span>

                )}

              </div>

            ))

          ) : (

            <div className="tv-ticker-chip">
              No outstanding pending payments.
            </div>

          )}

        </div>
      </div> */}

    </div>
  );
}

export default CollectionDashboard;