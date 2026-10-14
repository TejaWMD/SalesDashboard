// src/components/TableDashboard.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency, formatPercent } from '../utils/fetchSheet';
import './TableDashboard.css';

function TableDashboard({ rows }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('ALL');
  const [sortBy, setSortBy] = useState('store');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isTvAutoScroll, setIsTvAutoScroll] = useState(false);

  const scrollContainerRef = useRef(null);

  // Distinct persons for filter dropdown
  const uniquePersons = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.person))).filter(Boolean);
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
          const matchStore = row.store.toLowerCase().includes(term);
          const matchPerson = row.person.toLowerCase().includes(term);
          if (!matchStore && !matchPerson) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Handle nulls/blanks so they sort to bottom
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [rows, searchTerm, selectedPerson, sortBy, sortOrder]);

  // Computed summary for the filtered set
  const filteredSummary = useMemo(() => {
    let targetTotal = 0;
    let salesTotal = 0;
    let pendingTotal = 0;
    let collectedTotal = 0;

    let targetCount = 0;
    let salesCount = 0;
    let pendingCount = 0;
    let collectedCount = 0;

    filteredRows.forEach((r) => {
      if (r.target !== null) {
        targetTotal += r.target;
        targetCount++;
      }
      if (r.sales !== null) {
        salesTotal += r.sales;
        salesCount++;
      }
      if (r.pending !== null) {
        pendingTotal += r.pending;
        pendingCount++;
      }
      if (r.collected !== null) {
        collectedTotal += r.collected;
        collectedCount++;
      }
    });

    const overallPct = targetTotal > 0 ? (salesTotal / targetTotal) * 100 : null;

    return {
      targetTotal: targetCount > 0 ? targetTotal : null,
      salesTotal: salesCount > 0 ? salesTotal : null,
      pendingTotal: pendingCount > 0 ? pendingTotal : null,
      collectedTotal: collectedCount > 0 ? collectedTotal : null,
      overallPct,
    };
  }, [filteredRows]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder(column === 'store' || column === 'person' ? 'asc' : 'desc');
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
        // Pause briefly at bottom then jump back to top
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
          <h2 className="table-title">Master Outlets Performance Table</h2>
          <span className="table-subtitle">
            Displaying {filteredRows.length} of {rows.length} stores • Google Sheet: Data for TV
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
              placeholder="Search store or PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="table-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="table-clear-search"
                onClick={() => setSearchTerm('')}
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
            <option value="ALL">All Persons in Charge ({uniquePersons.length})</option>
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
        <table className="master-data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('store')} className="sortable text-left">
                STORE {sortBy === 'store' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('person')} className="sortable text-left">
                PERSON IN CHARGE {sortBy === 'person' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('month')} className="sortable text-center">
                MONTH {sortBy === 'month' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('target')} className="sortable text-right">
                TARGET {sortBy === 'target' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('sales')} className="sortable text-right">
                SALES {sortBy === 'sales' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('salesPercent')} className="sortable text-right">
                S vs T % {sortBy === 'salesPercent' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('pending')} className="sortable text-right">
                PAYMENT PENDING {sortBy === 'pending' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('collected')} className="sortable text-right">
                PAYMENT COLLECTED {sortBy === 'collected' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty-row">
                  No records match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, i) => {
                const sVsTPct = r.salesPercent;
                let pctClass = 'text-dim';
                if (sVsTPct !== null) {
                  if (sVsTPct >= 100) pctClass = 'pct-exceeded';
                  else if (sVsTPct >= 70) pctClass = 'pct-on-track';
                  else if (sVsTPct >= 40) pctClass = 'pct-in-progress';
                  else pctClass = 'pct-lagging';
                }

                return (
                  <tr key={r.id || i}>
                    <td className="store-name-cell font-semibold">
                      {r.store}
                    </td>
                    <td>
                      <span className="pic-badge">{r.person}</span>
                    </td>
                    <td className="text-center font-mono text-muted">{r.month}</td>
                    <td className="text-right font-mono text-primary font-bold">
                      {formatCurrency(r.target)}
                    </td>
                    <td className="text-right font-mono font-bold text-success">
                      {formatCurrency(r.sales)}
                    </td>
                    <td className={`text-right font-mono font-bold ${pctClass}`}>
                      {formatPercent(r.salesPercent)}
                    </td>
                    <td className="text-right font-mono text-danger font-bold">
                      {formatCurrency(r.pending)}
                    </td>
                    <td className="text-right font-mono text-success font-bold">
                      {formatCurrency(r.collected)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="table-summary-row">
                <td colSpan="3" className="font-bold text-left">
                  SUMMARY TOTALS ({filteredRows.length} Outlets)
                </td>
                <td className="text-right font-mono font-bold text-primary">
                  {formatCurrency(filteredSummary.targetTotal)}
                </td>
                <td className="text-right font-mono font-bold text-success">
                  {formatCurrency(filteredSummary.salesTotal)}
                </td>
                <td className="text-right font-mono font-bold text-amber">
                  {formatPercent(filteredSummary.overallPct)}
                </td>
                <td className="text-right font-mono font-bold text-danger">
                  {formatCurrency(filteredSummary.pendingTotal)}
                </td>
                <td className="text-right font-mono font-bold text-success">
                  {formatCurrency(filteredSummary.collectedTotal)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default TableDashboard;
