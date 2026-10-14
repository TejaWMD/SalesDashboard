// src/components/CombinedDashboard.jsx
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
import './CombinedDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function CombinedDashboard({ rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('ALL');
  const [sortBy, setSortBy] = useState('sales');
  const [sortOrder, setSortOrder] = useState('desc');

  // Compute combined metrics
  const summary = useMemo(() => {
    let totalTarget = 0;
    let totalSales = 0;
    let totalCollected = 0;
    let totalPending = 0;
    const personMap = {};

    rows.forEach((row) => {
      totalTarget += row.target;
      totalSales += row.sales;
      totalCollected += row.collected;
      totalPending += row.pending;

      const p = row.person || 'Unassigned';
      if (!personMap[p]) {
        personMap[p] = {
          name: p,
          target: 0,
          sales: 0,
          collected: 0,
          pending: 0,
          outlets: 0,
        };
      }
      personMap[p].target += row.target;
      personMap[p].sales += row.sales;
      personMap[p].collected += row.collected;
      personMap[p].pending += row.pending;
      personMap[p].outlets += 1;
    });

    const salesPercent = totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0;
    const remainingSales = Math.max(0, totalTarget - totalSales);
    const collectionTotal = totalCollected + totalPending > 0 ? (totalCollected + totalPending) : totalSales;
    const collectionPercent = collectionTotal > 0 ? (totalCollected / collectionTotal) * 100 : 0;

    const personsList = Object.values(personMap).map((p) => {
      const pSalesPct = p.target > 0 ? (p.sales / p.target) * 100 : 0;
      const pCollTotal = p.collected + p.pending > 0 ? (p.collected + p.pending) : p.sales;
      const pCollPct = pCollTotal > 0 ? (p.collected / pCollTotal) * 100 : 0;

      return {
        ...p,
        salesPercent: pSalesPct,
        collectionPercent: pCollPct,
        remainingSales: Math.max(0, p.target - p.sales),
      };
    });

    return {
      totalTarget,
      totalSales,
      salesPercent,
      remainingSales,
      totalCollected,
      totalPending,
      collectionPercent,
      totalOutlets: rows.length,
      personsList,
    };
  }, [rows]);

  // Combined Chart: Target, Sales, Collected, Pending by Person
  const combinedChartData = useMemo(() => {
    const labels = summary.personsList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Sales Target (RM)',
          data: summary.personsList.map((p) => p.target),
          backgroundColor: 'rgba(56, 189, 248, 0.75)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Actual Sales (RM)',
          data: summary.personsList.map((p) => p.sales),
          backgroundColor: 'rgba(52, 211, 153, 0.75)',
          borderColor: '#34d399',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Payment Collected (RM)',
          data: summary.personsList.map((p) => p.collected),
          backgroundColor: 'rgba(129, 140, 248, 0.75)',
          borderColor: '#818cf8',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Payment Pending (RM)',
          data: summary.personsList.map((p) => p.pending),
          backgroundColor: 'rgba(248, 113, 113, 0.75)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 4,
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

  // Filter and sort combined table rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (
          searchTerm &&
          !row.store.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !row.person.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        if (selectedPerson !== 'ALL' && row.person !== selectedPerson) {
          return false;
        }
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
  }, [rows, searchTerm, selectedPerson, sortBy, sortOrder]);

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
    <div className="combined-section">
      {/* Executive Overview KPI Grid */}
      <div className="combined-kpi-grid">
        <KpiCard
          title="Total Sales Target"
          value={formatCurrency(summary.totalTarget)}
          subtitle="Monthly Sales Target"
          status="primary"
          icon="🎯"
        />
        <KpiCard
          title="Actual Sales Achieved"
          value={formatCurrency(summary.totalSales)}
          badge={`${summary.salesPercent.toFixed(1)}% Achieved`}
          subtitle={`Remaining: ${formatCurrency(summary.remainingSales)}`}
          status={summary.salesPercent >= 70 ? 'success' : 'warning'}
          icon="💰"
        />
        <KpiCard
          title="Payment Collected"
          value={formatCurrency(summary.totalCollected)}
          badge={`${summary.collectionPercent.toFixed(1)}% Settled`}
          subtitle="Received to Date"
          status="success"
          icon="💵"
        />
        <KpiCard
          title="Payment Pending"
          value={formatCurrency(summary.totalPending)}
          subtitle="Outstanding Balance"
          status={summary.totalPending > 0 ? 'danger' : 'success'}
          icon="⏳"
        />
        <KpiCard
          title="Total Outlets"
          value={summary.totalOutlets}
          subtitle={`${summary.personsList.length} Person(s) in Charge`}
          status="purple"
          icon="🏪"
        />
      </div>

      {/* Person Summary Cards (Sales & Collection Combined) */}
      <div className="section-block">
        <div className="section-block__header">
          <h2 className="section-block__title">Executive Summary by Person in Charge</h2>
          <span className="section-block__subtitle">Dual performance tracking: Sales vs Collection</span>
        </div>
        <div className="pic-combined-grid">
          {summary.personsList.map((pic) => (
            <div key={pic.name} className="pic-combined-card">
              <div className="pic-combined-card__header">
                <span className="pic-card__avatar">{pic.name[0]}</span>
                <div>
                  <h3 className="pic-card__name">{pic.name}</h3>
                  <span className="pic-card__outlets">{pic.outlets} Stores Managed</span>
                </div>
              </div>

              <div className="pic-combined-card__columns">
                {/* Sales Column */}
                <div className="pic-combined-col">
                  <span className="pic-combined-col__heading">Sales Performance</span>
                  <div className="pic-combined-metric">
                    <span className="label">Target:</span>
                    <span className="val">{formatCurrency(pic.target)}</span>
                  </div>
                  <div className="pic-combined-metric">
                    <span className="label">Actual:</span>
                    <span className="val text-success">{formatCurrency(pic.sales)}</span>
                  </div>
                  <div className="mini-progress-bar" style={{ width: '100%', height: '5px', marginTop: '6px' }}>
                    <div
                      className="mini-progress-fill status-primary"
                      style={{ width: `${Math.min(100, pic.salesPercent)}%` }}
                    />
                  </div>
                  <span className="pic-combined-pct">{pic.salesPercent.toFixed(1)}% of Quota</span>
                </div>

                {/* Collection Column */}
                <div className="pic-combined-col">
                  <span className="pic-combined-col__heading">Collection Tracking</span>
                  <div className="pic-combined-metric">
                    <span className="label">Collected:</span>
                    <span className="val text-success">{formatCurrency(pic.collected)}</span>
                  </div>
                  <div className="pic-combined-metric">
                    <span className="label">Pending:</span>
                    <span className="val text-danger">{formatCurrency(pic.pending)}</span>
                  </div>
                  <div className="mini-progress-bar" style={{ width: '100%', height: '5px', marginTop: '6px' }}>
                    <div
                      className="mini-progress-fill status-success"
                      style={{ width: `${Math.min(100, pic.collectionPercent)}%` }}
                    />
                  </div>
                  <span className="pic-combined-pct">{pic.collectionPercent.toFixed(1)}% Settled</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Combined Comparison Chart */}
      <div className="section-block">
        <h2 className="section-block__title" style={{ marginBottom: '14px' }}>
          Sales & Collection Comparison by Person in Charge
        </h2>
        <div style={{ height: '340px', position: 'relative' }}>
          <Bar data={combinedChartData} options={chartOptions} />
        </div>
      </div>

      {/* Unified Outlets Table */}
      <div className="section-block">
        <div className="section-block__header table-controls-header">
          <div>
            <h2 className="section-block__title">Master Outlets Performance (Sales & Collection)</h2>
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
                  PIC {sortBy === 'person' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('target')} className="sortable text-right">
                  Target (RM) {sortBy === 'target' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('sales')} className="sortable text-right">
                  Sales (RM) {sortBy === 'sales' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('salesPercent')} className="sortable text-right">
                  Sales % {sortBy === 'salesPercent' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('collected')} className="sortable text-right">
                  Collected (RM) {sortBy === 'collected' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('pending')} className="sortable text-right">
                  Pending (RM) {sortBy === 'pending' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="text-right">Collection Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="table-empty">
                    No matching store records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const isPaid = r.pending === 0 && r.collected > 0;
                  const isPartial = r.pending > 0 && r.collected > 0;

                  return (
                    <tr key={r.id}>
                      <td className="store-cell font-semibold">{r.store}</td>
                      <td>
                        <span className="pic-tag">{r.person}</span>
                      </td>
                      <td className="text-right font-mono">{formatCurrency(r.target)}</td>
                      <td className="text-right font-mono font-bold text-success">
                        {formatCurrency(r.sales)}
                      </td>
                      <td className="text-right font-mono font-bold">
                        {r.salesPercent.toFixed(1)}%
                      </td>
                      <td className="text-right font-mono text-success">
                        {formatCurrency(r.collected)}
                      </td>
                      <td className="text-right font-mono text-danger">
                        {formatCurrency(r.pending)}
                      </td>
                      <td className="text-right">
                        {isPaid ? (
                          <span className="status-badge status-success">Settled</span>
                        ) : isPartial ? (
                          <span className="status-badge status-warning">Partial</span>
                        ) : (
                          <span className="status-badge status-danger">Pending</span>
                        )}
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

export default CombinedDashboard;
