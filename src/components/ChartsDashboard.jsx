// src/components/ChartsDashboard.jsx
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
import { formatCurrency, formatPercent, formatCompactCurrency } from '../utils/fetchSheet';
import './ChartsDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function ChartsDashboard({ rows }) {
  // Aggregate per Person in Charge
  const picStats = useMemo(() => {
    const map = {};

    rows.forEach((r) => {
      const p = r.person || 'Unassigned';
      if (!map[p]) {
        map[p] = {
          name: p,
          target: 0,
          sales: 0,
          collected: 0,
          pending: 0,
          storeCount: 0,
        };
      }
      map[p].storeCount += 1;
      if (r.target !== null) map[p].target += r.target;
      if (r.sales !== null) map[p].sales += r.sales;
      if (r.collected !== null) map[p].collected += r.collected;
      if (r.pending !== null) map[p].pending += r.pending;
    });

    return Object.values(map).map((p) => {
      const pct = p.target > 0 ? (p.sales / p.target) * 100 : 0;
      const rec = p.collected + p.pending;
      const collPct = rec > 0 ? (p.collected / rec) * 100 : 0;
      return {
        ...p,
        percent: pct,
        collectionPercent: collPct,
      };
    });
  }, [rows]);

  // Quota distribution of stores
  const storeDistribution = useMemo(() => {
    let exceeded = 0; // >= 100%
    let onTrack = 0;  // 70 - 99.9%
    let inProgress = 0; // 40 - 69.9%
    let lagging = 0;   // < 40%
    let noData = 0;

    rows.forEach((r) => {
      if (r.salesPercent === null && r.sales === null) {
        noData += 1;
      } else {
        const p = r.salesPercent || 0;
        if (p >= 100) exceeded += 1;
        else if (p >= 70) onTrack += 1;
        else if (p >= 40) inProgress += 1;
        else lagging += 1;
      }
    });

    return { exceeded, onTrack, inProgress, lagging, noData };
  }, [rows]);

  // Chart 1: Target vs Actual Sales
  const targetVsSalesData = useMemo(() => {
    const labels = picStats.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Target (RM)',
          data: picStats.map((p) => p.target),
          backgroundColor: 'rgba(0, 155, 214, 0.45)',
          borderColor: '#009bd6',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Actual Sales (RM)',
          data: picStats.map((p) => p.sales),
          backgroundColor: 'rgba(86, 142, 70, 0.9)',
          borderColor: '#568e46',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [picStats]);

  // Chart 2: S vs T Achievement % with benchmark colors
  const achievementPctData = useMemo(() => {
    const labels = picStats.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Achievement %',
          data: picStats.map((p) => Number(p.percent.toFixed(1))),
          backgroundColor: picStats.map((p) =>
            p.percent >= 100
              ? 'rgba(86, 142, 70, 0.9)'
              : p.percent >= 70
              ? 'rgba(0, 155, 214, 0.9)'
              : p.percent >= 40
              ? 'rgba(251, 180, 60, 0.9)'
              : 'rgba(229, 67, 48, 0.9)'
          ),
          borderRadius: 6,
        },
      ],
    };
  }, [picStats]);

  // Chart 3: Payment Collected vs Pending
  const collectionData = useMemo(() => {
    const labels = picStats.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Collected (RM)',
          data: picStats.map((p) => p.collected),
          backgroundColor: 'rgba(86, 142, 70, 0.9)',
          borderColor: '#568e46',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Pending (RM)',
          data: picStats.map((p) => p.pending),
          backgroundColor: 'rgba(229, 67, 48, 0.9)',
          borderColor: '#e54330',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [picStats]);

  // Chart 4: Store Distribution Doughnut
  const distributionData = useMemo(() => {
    return {
      labels: ['Exceeded (>=100%)', 'On Track (70-99%)', 'In Progress (40-69%)', 'Lagging (<40%)', 'Awaiting Data'],
      datasets: [
        {
          data: [
            storeDistribution.exceeded,
            storeDistribution.onTrack,
            storeDistribution.inProgress,
            storeDistribution.lagging,
            storeDistribution.noData,
          ],
          backgroundColor: [
            'rgba(86, 142, 70, 0.9)',
            'rgba(0, 155, 214, 0.9)',
            'rgba(251, 180, 60, 0.9)',
            'rgba(229, 67, 48, 0.9)',
            'rgba(148, 163, 184, 0.3)',
          ],
          borderColor: '#0c0b0c',
          borderWidth: 2,
        },
      ],
    };
  }, [storeDistribution]);

  const currencyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: '#f8fafc', font: { size: 11, weight: '700' } },
      },
      tooltip: {
        backgroundColor: '#0c0b0c',
        titleColor: '#fbb43c',
        bodyColor: '#ffffff',
        borderColor: 'rgba(251, 180, 60, 0.3)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#cbd5e1', font: { weight: '700', size: 11 } },
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

  const percentOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c0b0c',
        titleColor: '#fbb43c',
        bodyColor: '#ffffff',
        borderColor: 'rgba(251, 180, 60, 0.3)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `Quota Achieved: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#cbd5e1', font: { weight: '700', size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#cbd5e1',
          font: { size: 10, weight: '600' },
          callback: (val) => `${val}%`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.07)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#f8fafc',
          font: { size: 11, weight: '700' },
          boxWidth: 12,
          padding: 10,
        },
      },
    },
  };

  return (
    <div className="charts-dashboard">
      <div className="charts-grid">
        {/* Chart 1: Sales vs Target Comparison */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Sales Target vs Actual Sales by PIC</h3>
            <span className="chart-card__badge">Financial Value (RM)</span>
          </div>
          <div className="chart-card__body">
            <Bar data={targetVsSalesData} options={currencyOptions} />
          </div>
        </div>

        {/* Chart 2: S vs T Percentage Achievement */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">S vs T Quota Achievement Rate (%)</h3>
            <span className="chart-card__badge">Performance Ratio</span>
          </div>
          <div className="chart-card__body">
            <Bar data={achievementPctData} options={percentOptions} />
          </div>
        </div>

        {/* Chart 3: Collection Status Comparison */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Payment Collected vs Pending by PIC</h3>
            <span className="chart-card__badge">Cashflow Balance (RM)</span>
          </div>
          <div className="chart-card__body">
            <Bar data={collectionData} options={currencyOptions} />
          </div>
        </div>

        {/* Chart 4: Store Quota Tier Distribution */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Outlet Achievement Tier Distribution</h3>
            <span className="chart-card__badge">{rows.length} Total Stores</span>
          </div>
          <div className="chart-card__body">
            <Doughnut data={distributionData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartsDashboard;
