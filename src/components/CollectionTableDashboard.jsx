// src/components/CollectionTableDashboard.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency, formatPercent } from '../utils/fetchSheet';
import './TableDashboard.css';

function CollectionTableDashboard({ rows = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('ALL');
  const [sortBy, setSortBy] = useState('customer');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isTvAutoScroll, setIsTvAutoScroll] = useState(false);

  const scrollContainerRef = useRef(null);

  // Distinct account managers (PICs) for filter dropdown
  const uniquePersons = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.person))).filter(Boolean).sort();
  }, [rows]);

  // Filtered & sorted rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        if (selectedPerson !== 'ALL' && row.person !== selectedPerson) {
          return false;
        }
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchCustomer = (row.customer || '').toLowerCase().includes(term);
          const matchPerson = (row.person || '').toLowerCase().includes(term);
          if (!matchCustomer && !matchPerson) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle nulls/blanks so they sort to bottom
        if (valA === null && valB === null) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [rows, searchTerm, selectedPerson, sortBy, sortOrder]);

  // Computed summary totals for filtered rows
  const filteredSummary = useMemo(() => {
    let targetTotal = 0;
    let collectedTotal = 0;
    let pendingTotal = 0;
    let targetCount = 0;
    let collectedCount = 0;
    let pendingCount = 0;

    filteredRows.forEach((r) => {
      if (r.target !== null && r.target !== undefined) {
        targetTotal += r.target;
        targetCount++;
      }
      if (r.collected !== null && r.collected !== undefined) {
        collectedTotal += r.collected;
        collectedCount++;
      }
      if (r.pending !== null && r.pending !== undefined) {
        pendingTotal += r.pending;
        pendingCount++;
      }
    });

    const overallRate =
      targetTotal > 0
        ? (collectedTotal / targetTotal) * 100
        : (collectedTotal + pendingTotal) > 0
          ? (collectedTotal / (collectedTotal + pendingTotal)) * 100
          : null;

    return {
      targetTotal: targetCount > 0 ? targetTotal : null,
      collectedTotal: collectedCount > 0 ? collectedTotal : null,
      pendingTotal: pendingCount > 0 ? pendingTotal : null,
      overallRate,
    };
  }, [filteredRows]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'customer' || column === 'person' ? 'asc' : 'desc');
    }
  };

  // TV Smooth Auto-Scroll Feature for unattended TV screens
  useEffect(() => {
    if (!isTvAutoScroll) return;
    const el = scrollContainerRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (!el) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
        setTimeout(() => {
          if (el) el.scrollTop = 0;
        }, 1200);
      } else {
        el.scrollTop += 1.5;
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isTvAutoScroll]);

  return (
    <div className="table-dashboard">
      {/* Top Filter and Controls Bar */}
      <div className="table-top-bar">
        <div className="table-info">
          <h2 className="table-title">Customer Collection Tracking Table</h2>
          <span className="table-subtitle">
            Showing {filteredRows.length} of {rows.length} customers
          </span>
        </div>

        <div className="table-actions">
          {/* Search box */}
          <div className="table-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search customer or PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="table-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="table-clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* PIC Filter Dropdown */}
          <select
            className="table-pic-select"
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
          >
            <option value="ALL">All Account Managers ({uniquePersons.length})</option>
            {uniquePersons.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* TV Auto-Scroll Button */}
          <button
            type="button"
            className={`tv-scroll-toggle ${isTvAutoScroll ? 'active' : ''}`}
            onClick={() => setIsTvAutoScroll((prev) => !prev)}
            title="Auto-scroll table smoothly on TV screen"
          >
            <span className="tv-scroll-icon">{isTvAutoScroll ? '⏸' : '▶'}</span>
            <span>{isTvAutoScroll ? 'Auto-Scroll ON' : 'TV Auto-Scroll'}</span>
          </button>
        </div>
      </div>

      {/* Table Container fitting 100vh on TV */}
      <div className="table-scroll-wrapper" ref={scrollContainerRef}>
        <table className="master-data-table collection-data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('customer')} className="sortable text-left">
                CUSTOMER {sortBy === 'customer' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th onClick={() => handleSort('person')} className="sortable text-left">
                ACCOUNT MANAGERS {sortBy === 'person' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th onClick={() => handleSort('target')} className="sortable text-right">
                TARGET {sortBy === 'target' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th onClick={() => handleSort('collected')} className="sortable text-right">
                PAYMENT COLLECTED {sortBy === 'collected' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th onClick={() => handleSort('pending')} className="sortable text-right">
                PAYMENT PENDING {sortBy === 'pending' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
              <th onClick={() => handleSort('collectionRate')} className="sortable text-right">
                RATE % {sortBy === 'collectionRate' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="6" className="table-empty-row">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => {
                const ratePct = r.collectionRate;
                let pctClass = 'text-dim';
                if (ratePct !== null && ratePct !== undefined) {
                  if (ratePct >= 90) pctClass = 'pct-exceeded';
                  else if (ratePct >= 60) pctClass = 'pct-on-track';
                  else if (ratePct >= 30) pctClass = 'pct-in-progress';
                  else pctClass = 'pct-lagging';
                }

                return (
                  <tr key={r.id || i}>
                    <td className="store-name-cell font-semibold">
                      {r.customer}
                    </td>
                    <td>
                      <span className="pic-badge">{r.person}</span>
                    </td>
                    <td className="text-right font-mono text-primary font-bold">
                      {formatCurrency(r.target)}
                    </td>
                    <td className="text-right font-mono font-bold text-success">
                      {formatCurrency(r.collected)}
                    </td>
                    <td className="text-right font-mono font-bold text-danger">
                      {formatCurrency(r.pending)}
                    </td>
                    <td className={`text-right font-mono font-bold ${pctClass}`}>
                      {formatPercent(ratePct)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="table-summary-row">
                <td colSpan="2" className="font-bold text-left">
                  SUMMARY TOTALS ({filteredRows.length} Customers)
                </td>
                <td className="text-right font-mono text-primary font-bold">
                  {formatCurrency(filteredSummary.targetTotal)}
                </td>
                <td className="text-right font-mono font-bold text-success">
                  {formatCurrency(filteredSummary.collectedTotal)}
                </td>
                <td className="text-right font-mono font-bold text-danger">
                  {formatCurrency(filteredSummary.pendingTotal)}
                </td>
                <td className="text-right font-mono font-bold text-accent">
                  {formatPercent(filteredSummary.overallRate)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default CollectionTableDashboard;
