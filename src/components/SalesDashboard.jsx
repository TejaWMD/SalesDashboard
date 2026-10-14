// src/components/SalesDashboard.jsx
import React, { useMemo, useState } from 'react';
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
import { formatCurrency, formatPercent } from '../utils/fetchSheet';
import './SalesDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function SalesDashboard({ rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('ALL');
  const [quotaFilter, setQuotaFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('sales');
  const [sortOrder, setSortOrder] = useState('desc');

  // Compute overall KPI metrics
  const summary = useMemo(() => {
    let totalTarget = 0;
    let totalSales = 0;
    const personMap = {};

    rows.forEach((row) => {
      totalTarget += row.target;
      totalSales += row.sales;

      const p = row.person || 'Unassigned';
      if (!personMap[p]) {
        personMap[p] = {
          name: p,
          target: 0,
          sales: 0,
          outlets: 0,
        };
      }
      personMap[p].target += row.target;
      personMap[p].sales += row.sales;
      personMap[p].outlets += 1;
    });

    const percent = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;
    const remaining = Math.max(0, totalTarget - totalSales);

    // Compute metrics for each person
    const personsList = Object.values(personMap).map((p) => {
      const pPercent = p.target > 0 ? (p.sales / p.target) * 100 : 0;
      const pRemaining = Math.max(0, p.target - p.sales);
      let status = 'danger';
      let statusLabel = 'At Risk';
      if (pPercent >= 100) {
        status = 'success';
        statusLabel = 'Exceeded';
      } else if (pPercent >= 70) {
        status = 'primary';
        statusLabel = 'On Track';
      } else if (pPercent >= 40) {
        status = 'warning';
        statusLabel = 'In Progress';
      }

      return {
        ...p,
        percent: pPercent,
        remaining: pRemaining,
        status,
        statusLabel,
      };
    });

    return {
      totalTarget,
      totalSales,
      percent,
      remaining,
      totalOutlets: rows.length,
      personsList,
    };
  }, [rows]);

  // Chart: Target vs Sales by Person
  const comparisonChartData = useMemo(() => {
    const labels = summary.personsList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Target (RM)',
          data: summary.personsList.map((p) => p.target),
          backgroundColor: 'rgba(56, 189, 248, 0.75)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Actual Sales (RM)',
          data: summary.personsList.map((p) => p.sales),
          backgroundColor: 'rgba(52, 211, 153, 0.75)',
          borderColor: '#34d399',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [summary.personsList]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          font: { size: 12, weight: '600' },
          boxWidth: 14,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { weight: '600' } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (value) => `RM ${(value / 1000).toLocaleString()}k`,
        },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
      },
    },
  };

  // Top 8 Stores by Sales
  const topStoresChartData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => b.sales - a.sales).slice(0, 8);
    return {
      labels: sorted.map((s) => s.store),
      datasets: [
        {
          label: 'Sales (RM)',
          data: sorted.map((s) => s.sales),
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderColor: '#818cf8',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [rows]);

  // Filter and sort the table rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        // Search filter
        if (
          searchTerm &&
          !row.store.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !row.person.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        // Person filter
        if (selectedPerson !== 'ALL' && row.person !== selectedPerson) {
          return false;
        }
        // Quota filter
        if (quotaFilter === 'ACHIEVED' && row.salesPercent < 100) return false;
        if (quotaFilter === 'PROGRESS' && (row.salesPercent < 50 || row.salesPercent >= 100)) return false;
        if (quotaFilter === 'BEHIND' && row.salesPercent >= 50) return false;

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [rows, searchTerm, selectedPerson, quotaFilter, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const uniquePersons = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.person))).filter(Boolean);
  }, [rows]);

  return (
    <div className="sales-section">
      {/* KPI Cards Grid */}
      <div className="sales-kpi-grid">
        <KpiCard
          title="Total Sales Target"
          value={formatCurrency(summary.totalTarget)}
          subtitle="Monthly Quota Target"
          status="primary"
          icon="🎯"
        />
        <KpiCard
          title="Total Actual Sales"
          value={formatCurrency(summary.totalSales)}
          subtitle="Achieved to Date"
          badge={`${summary.percent.toFixed(1)}% Achieved`}
          status={summary.percent >= 70 ? 'success' : summary.percent >= 40 ? 'warning' : 'danger'}
          icon="💰"
        />
        <KpiCard
          title="% Quota Achieved"
          value={formatPercent(summary.percent)}
          subtitle={`Remaining: ${formatCurrency(summary.remaining)}`}
          status={summary.percent >= 70 ? 'success' : summary.percent >= 40 ? 'warning' : 'danger'}
          icon="📈"
        />
        <KpiCard
          title="Remaining Target"
          value={formatCurrency(summary.remaining)}
          subtitle={`Across ${summary.totalOutlets} Total Outlets`}
          status="purple"
          icon="⏳"
        />
        <KpiCard
          title="Total Outlets"
          value={summary.totalOutlets}
          subtitle={`${summary.personsList.length} Person(s) in Charge`}
          status="default"
          icon="🏪"
        />
      </div>

      {/* Person in Charge Cards */}
      <div className="section-block">
        <div className="section-block__header">
          <h2 className="section-block__title">Person in Charge Performance</h2>
          <span className="section-block__subtitle">Sales target achievement by PIC</span>
        </div>
        <div className="pic-grid">
          {summary.personsList.map((pic) => (
            <div key={pic.name} className={`pic-card pic-card--${pic.status}`}>
              <div className="pic-card__top">
                <div className="pic-card__name-wrap">
                  <span className="pic-card__avatar">{pic.name[0]}</span>
                  <div>
                    <h3 className="pic-card__name">{pic.name}</h3>
                    <span className="pic-card__outlets">{pic.outlets} Stores Managed</span>
                  </div>
                </div>
                <span className={`pic-card__badge pic-card__badge--${pic.status}`}>
                  {pic.statusLabel}
                </span>
              </div>

              <div className="pic-card__metrics">
                <div className="pic-card__metric">
                  <span className="pic-card__metric-label">Sales Achieved</span>
                  <span className="pic-card__metric-val pic-card__metric-val--actual">
                    {formatCurrency(pic.sales)}
                  </span>
                </div>
                <div className="pic-card__metric">
                  <span className="pic-card__metric-label">Target Quota</span>
                  <span className="pic-card__metric-val">{formatCurrency(pic.target)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pic-progress">
                <div className="pic-progress__bar-bg">
                  <div
                    className={`pic-progress__bar-fill pic-progress__bar-fill--${pic.status}`}
                    style={{ width: `${Math.min(100, pic.percent)}%` }}
                  />
                </div>
                <div className="pic-progress__info">
                  <span className="pic-progress__percent">{pic.percent.toFixed(1)}% Achieved</span>
                  <span className="pic-progress__rem">Rem: {formatCurrency(pic.remaining)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-card__title">Sales Target vs Actual by Person in Charge</h3>
          <div className="chart-card__canvas-wrapper">
            <Bar data={comparisonChartData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Top Outlets by Sales Performance</h3>
          <div className="chart-card__canvas-wrapper">
            <Bar
              data={topStoresChartData}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: { display: false },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Store Quota Performance Table */}
      <div className="section-block">
        <div className="section-block__header table-controls-header">
          <div>
            <h2 className="section-block__title">Store Quota Performance</h2>
            <span className="section-block__subtitle">
              Showing {filteredRows.length} of {rows.length} stores
            </span>
          </div>

          <div className="table-filters">
            <input
              type="text"
              placeholder="Search store or PIC..."
              className="table-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="table-filter-select"
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
            >
              <option value="ALL">All Persons</option>
              {uniquePersons.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className="table-filter-select"
              value={quotaFilter}
              onChange={(e) => setQuotaFilter(e.target.value)}
            >
              <option value="ALL">All Quota Status</option>
              <option value="ACHIEVED">100%+ Achieved</option>
              <option value="PROGRESS">50% - 99%</option>
              <option value="BEHIND">&lt; 50% Behind</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="quota-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('store')} className="sortable">
                  Store {sortBy === 'store' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('person')} className="sortable">
                  Person in Charge {sortBy === 'person' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('month')} className="sortable">
                  Month {sortBy === 'month' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('target')} className="sortable text-right">
                  Target (RM) {sortBy === 'target' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('sales')} className="sortable text-right">
                  Sales (RM) {sortBy === 'sales' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('remainingSales')} className="sortable text-right">
                  Remaining (RM) {sortBy === 'remainingSales' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('salesPercent')} className="sortable text-right" style={{ minWidth: '170px' }}>
                  % Achieved {sortBy === 'salesPercent' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No matching store records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const pct = r.salesPercent;
                  let statusClass = 'status-danger';
                  let badgeText = 'Behind';
                  if (pct >= 100) {
                    statusClass = 'status-success';
                    badgeText = 'Done';
                  } else if (pct >= 70) {
                    statusClass = 'status-primary';
                    badgeText = 'Good';
                  } else if (pct >= 40) {
                    statusClass = 'status-warning';
                    badgeText = 'Active';
                  }

                  return (
                    <tr key={r.id}>
                      <td className="store-cell font-semibold">{r.store}</td>
                      <td>
                        <span className="pic-tag">{r.person}</span>
                      </td>
                      <td>
                        <span className="month-tag">{r.month}</span>
                      </td>
                      <td className="text-right font-mono">{formatCurrency(r.target)}</td>
                      <td className="text-right font-mono font-bold text-success">
                        {formatCurrency(r.sales)}
                      </td>
                      <td className="text-right font-mono text-muted">
                        {formatCurrency(r.remainingSales)}
                      </td>
                      <td className="text-right">
                        <div className="table-progress-cell">
                          <span className={`status-badge ${statusClass}`}>{badgeText}</span>
                          <span className="percent-val font-mono font-bold">{pct.toFixed(1)}%</span>
                          <div className="mini-progress-bar">
                            <div
                              className={`mini-progress-fill ${statusClass}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;
