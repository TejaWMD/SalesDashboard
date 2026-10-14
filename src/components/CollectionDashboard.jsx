// src/components/CollectionDashboard.jsx
import React, { useMemo, useState } from 'react';
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
import { formatCurrency, formatPercent } from '../utils/fetchSheet';
import './CollectionDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function CollectionDashboard({ rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('pending');
  const [sortOrder, setSortOrder] = useState('desc');

  // Compute collection summaries
  const summary = useMemo(() => {
    let totalReceivable = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let pendingOutletsCount = 0;
    const personMap = {};

    rows.forEach((row) => {
      // If collection total is 0, use sales as expected collection
      const expected = row.collectionTotal > 0 ? row.collectionTotal : row.sales;
      totalReceivable += expected;
      totalCollected += row.collected;
      totalPending += row.pending;

      if (row.pending > 0) {
        pendingOutletsCount += 1;
      }

      const p = row.person || 'Unassigned';
      if (!personMap[p]) {
        personMap[p] = {
          name: p,
          receivable: 0,
          collected: 0,
          pending: 0,
          outlets: 0,
          pendingOutlets: 0,
        };
      }
      personMap[p].receivable += expected;
      personMap[p].collected += row.collected;
      personMap[p].pending += row.pending;
      personMap[p].outlets += 1;
      if (row.pending > 0) {
        personMap[p].pendingOutlets += 1;
      }
    });

    const percent = totalReceivable > 0 ? (totalCollected / totalReceivable) * 100 : 0;

    const personsList = Object.values(personMap).map((p) => {
      const pPercent = p.receivable > 0 ? (p.collected / p.receivable) * 100 : 0;
      let status = 'danger';
      let statusLabel = 'High Pending';
      if (pPercent >= 90) {
        status = 'success';
        statusLabel = 'Collected';
      } else if (pPercent >= 50) {
        status = 'primary';
        statusLabel = 'In Progress';
      } else if (p.collected > 0) {
        status = 'warning';
        statusLabel = 'Partial';
      }

      return {
        ...p,
        percent: pPercent,
        status,
        statusLabel,
      };
    });

    return {
      totalReceivable,
      totalCollected,
      totalPending,
      percent,
      totalOutlets: rows.length,
      pendingOutletsCount,
      personsList,
    };
  }, [rows]);

  // Chart: Payment Collected vs Pending by Person
  const comparisonChartData = useMemo(() => {
    const labels = summary.personsList.map((p) => p.name);
    return {
      labels,
      datasets: [
        {
          label: 'Collected (RM)',
          data: summary.personsList.map((p) => p.collected),
          backgroundColor: 'rgba(52, 211, 153, 0.75)',
          borderColor: '#34d399',
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: 'Pending (RM)',
          data: summary.personsList.map((p) => p.pending),
          backgroundColor: 'rgba(248, 113, 113, 0.75)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [summary.personsList]);

  // Doughnut Chart: Overall Collection breakdown
  const doughnutChartData = useMemo(() => {
    return {
      labels: ['Payment Collected', 'Payment Pending'],
      datasets: [
        {
          data: [summary.totalCollected, summary.totalPending],
          backgroundColor: ['rgba(52, 211, 153, 0.85)', 'rgba(248, 113, 113, 0.85)'],
          borderColor: ['#34d399', '#f87171'],
          borderWidth: 1,
        },
      ],
    };
  }, [summary.totalCollected, summary.totalPending]);

  const barChartOptions = {
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

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          font: { size: 12, weight: '600' },
          padding: 14,
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
            return ` ${context.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    cutout: '70%',
  };

  // Filter and sort collection rows
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
        // Status filter
        const isPaid = row.pending === 0 && row.collected > 0;
        const isPartial = row.pending > 0 && row.collected > 0;
        const isUnpaid = row.collected === 0;

        if (paymentStatusFilter === 'PAID' && !isPaid) return false;
        if (paymentStatusFilter === 'PARTIAL' && !isPartial) return false;
        if (paymentStatusFilter === 'PENDING' && !isUnpaid) return false;

        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(a[sortBy]);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [rows, searchTerm, selectedPerson, paymentStatusFilter, sortBy, sortOrder]);

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
    <div className="collection-section">
      {/* Collection KPI Cards */}
      <div className="collection-kpi-grid">
        <KpiCard
          title="Total Receivable / Target"
          value={formatCurrency(summary.totalReceivable)}
          subtitle="Total Due from Sales"
          status="primary"
          icon="📋"
        />
        <KpiCard
          title="Payment Collected"
          value={formatCurrency(summary.totalCollected)}
          subtitle="Funds Received & Settled"
          badge={`${summary.percent.toFixed(1)}% Collected`}
          status="success"
          icon="💵"
        />
        <KpiCard
          title="Payment Pending"
          value={formatCurrency(summary.totalPending)}
          subtitle="Outstanding to Collect"
          status={summary.totalPending > 0 ? 'danger' : 'success'}
          icon="⏳"
        />
        <KpiCard
          title="Collection Rate %"
          value={formatPercent(summary.percent)}
          subtitle={`${summary.pendingOutletsCount} Outlets with Pending Payment`}
          status={summary.percent >= 70 ? 'success' : summary.percent >= 40 ? 'warning' : 'danger'}
          icon="📊"
        />
        <KpiCard
          title="Pending Outlets"
          value={summary.pendingOutletsCount}
          subtitle={`Out of ${summary.totalOutlets} Total Outlets`}
          status={summary.pendingOutletsCount > 0 ? 'warning' : 'success'}
          icon="🏬"
        />
      </div>

      {/* Person in Charge Collection Breakdown */}
      <div className="section-block">
        <div className="section-block__header">
          <h2 className="section-block__title">Person in Charge Collection Status</h2>
          <span className="section-block__subtitle">Payment received vs pending by PIC</span>
        </div>
        <div className="pic-grid">
          {summary.personsList.map((pic) => (
            <div key={pic.name} className={`pic-card pic-card--${pic.status}`}>
              <div className="pic-card__top">
                <div className="pic-card__name-wrap">
                  <span className="pic-card__avatar pic-card__avatar--collection">{pic.name[0]}</span>
                  <div>
                    <h3 className="pic-card__name">{pic.name}</h3>
                    <span className="pic-card__outlets">
                      {pic.pendingOutlets} / {pic.outlets} Outlets Pending
                    </span>
                  </div>
                </div>
                <span className={`pic-card__badge pic-card__badge--${pic.status}`}>
                  {pic.statusLabel}
                </span>
              </div>

              <div className="pic-card__metrics">
                <div className="pic-card__metric">
                  <span className="pic-card__metric-label">Collected</span>
                  <span className="pic-card__metric-val pic-card__metric-val--actual">
                    {formatCurrency(pic.collected)}
                  </span>
                </div>
                <div className="pic-card__metric">
                  <span className="pic-card__metric-label">Pending</span>
                  <span className="pic-card__metric-val text-danger">
                    {formatCurrency(pic.pending)}
                  </span>
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
                  <span className="pic-progress__percent">{pic.percent.toFixed(1)}% Collected</span>
                  <span className="pic-progress__rem">Total: {formatCurrency(pic.receivable)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-card__title">Payment Collected vs Pending by Person</h3>
          <div className="chart-card__canvas-wrapper">
            <Bar data={comparisonChartData} options={barChartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3 className="chart-card__title">Overall Payment Settlement Breakdown</h3>
          <div className="chart-card__canvas-wrapper">
            <Doughnut data={doughnutChartData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Collection Details Table */}
      <div className="section-block">
        <div className="section-block__header table-controls-header">
          <div>
            <h2 className="section-block__title">Collection Tracking & Outlets</h2>
            <span className="section-block__subtitle">
              Showing {filteredRows.length} of {rows.length} store payment records
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
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="ALL">All Payment Status</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="PENDING">Pending / Unpaid</option>
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
                <th onClick={() => handleSort('collectionTotal')} className="sortable text-right">
                  Receivable / Sales (RM) {sortBy === 'collectionTotal' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('collected')} className="sortable text-right">
                  Collected (RM) {sortBy === 'collected' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('pending')} className="sortable text-right">
                  Pending (RM) {sortBy === 'pending' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => handleSort('collectionRate')} className="sortable text-right" style={{ minWidth: '170px' }}>
                  Status / % {sortBy === 'collectionRate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="table-empty">
                    No matching collection records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const rate = r.collectionRate;
                  const isPaid = r.pending === 0 && r.collected > 0;
                  const isPartial = r.pending > 0 && r.collected > 0;

                  let statusBadgeClass = 'status-danger';
                  let statusText = 'Pending';
                  if (isPaid) {
                    statusBadgeClass = 'status-success';
                    statusText = 'Paid Full';
                  } else if (isPartial) {
                    statusBadgeClass = 'status-warning';
                    statusText = 'Partial';
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
                      <td className="text-right font-mono">{formatCurrency(r.collectionTotal || r.sales)}</td>
                      <td className="text-right font-mono font-bold text-success">
                        {formatCurrency(r.collected)}
                      </td>
                      <td className="text-right font-mono font-bold text-danger">
                        {formatCurrency(r.pending)}
                      </td>
                      <td className="text-right">
                        <div className="table-progress-cell">
                          <span className={`status-badge ${statusBadgeClass}`}>{statusText}</span>
                          <span className="percent-val font-mono font-bold">{rate.toFixed(1)}%</span>
                          <div className="mini-progress-bar">
                            <div
                              className={`mini-progress-fill ${statusBadgeClass}`}
                              style={{ width: `${Math.min(100, rate)}%` }}
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

export default CollectionDashboard;
