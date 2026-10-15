// src/components/ChartsDashboard.jsx
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
import { formatCurrency, formatCompactCurrency } from '../utils/fetchSheet';
import './ChartsDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
      const pendPct = rec > 0 ? (p.pending / rec) * 100 : 0;
      return {
        ...p,
        percent: pct,
        collectionPercent: collPct,
        pendingPercent: pendPct,
      };
    });
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
              ? 'rgba(248, 245, 75, 0.95)'
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

  // Chart 4: Payment Collected vs Pending Rate (100% stacked)
  const collectionRateData = useMemo(() => {
    const labels = picStats.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Collected %',
          data: picStats.map((p) => Number(p.collectionPercent.toFixed(1))),
          backgroundColor: 'rgba(86, 142, 70, 0.9)',
          borderColor: '#568e46',
          borderWidth: 1.5,
          borderRadius: 6,
        },
        {
          label: 'Pending %',
          data: picStats.map((p) => Number(p.pendingPercent.toFixed(1))),
          backgroundColor: 'rgba(229, 67, 48, 0.9)',
          borderColor: '#e54330',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [picStats]);

  const tooltipBase = {
    backgroundColor: '#0c0b0c',
    titleColor: '#f8f54b',
    bodyColor: '#ffffff',
    borderColor: 'rgba(248, 245, 75, 0.35)',
    borderWidth: 1,
    padding: 10,
  };

  const currencyOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: '#5b5545', font: { size: 11, weight: '700' } },
      },
      tooltip: {
        ...tooltipBase,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#5b5545', font: { weight: '700', size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#5b5545',
          font: { size: 10, weight: '600' },
          callback: (val) => formatCompactCurrency(val),
        },
        grid: { color: 'rgba(91, 66, 0, 0.1)' },
      },
    },
  };

  const percentOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipBase,
        callbacks: {
          label: (ctx) => `Quota Achieved: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#5b5545', font: { weight: '700', size: 11 } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: '#5b5545',
          font: { size: 10, weight: '600' },
          callback: (val) => `${val}%`,
        },
        grid: { color: 'rgba(91, 66, 0, 0.1)' },
      },
    },
  };

  const collectionRateOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { color: '#5b5545', font: { size: 11, weight: '700' } },
      },
      tooltip: {
        ...tooltipBase,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: '#5b5545', font: { weight: '700', size: 11 } },
        grid: { display: false },
      },
      y: {
        stacked: true,
        min: 0,
        max: 100,
        ticks: {
          color: '#5b5545',
          font: { size: 10, weight: '600' },
          callback: (val) => `${val}%`,
        },
        grid: { color: 'rgba(91, 66, 0, 0.1)' },
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
          </div>
          <div className="chart-card__body">
            <Bar data={targetVsSalesData} options={currencyOptions} />
          </div>
        </div>

        {/* Chart 2: S vs T Percentage Achievement */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Sales vs Target Rate (%)</h3>
          </div>
          <div className="chart-card__body">
            <Bar data={achievementPctData} options={percentOptions} />
          </div>
        </div>

        {/* Chart 3: Collection Status Comparison */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Payment Collected vs Pending by PIC</h3>
          </div>
          <div className="chart-card__body">
            <Bar data={collectionData} options={currencyOptions} />
          </div>
        </div>

        {/* Chart 4: Collected vs Pending Rate */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h3 className="chart-card__title">Payment Collected vs Pending Rate (%)</h3>
          </div>
          <div className="chart-card__body">
            <Bar data={collectionRateData} options={collectionRateOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartsDashboard;