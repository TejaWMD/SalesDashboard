// src/components/PaymentUpdateTable.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import './PaymentUpdateTable.css';

function PaymentUpdateTable({
  data = { rows: [], columns: [], sections: [], customers: [] },
  isLoading = false,
}) {
  const {
    rows = [],
    columns = ['Week 1', 'Week 2', 'Week 3'],
    sections = ['ALL', 'IKA', 'LKA', 'SKA', 'GT'],
    customers = [],
  } = data;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [isTvAutoScroll, setIsTvAutoScroll] = useState(false);

  const scrollContainerRef = useRef(null);

  // Distinct customer list for the customer filter dropdown
  const customerList = useMemo(() => {
    if (customers && customers.length > 0) return customers;
    return Array.from(new Set(rows.map((r) => r.customer).filter(Boolean))).sort();
  }, [customers, rows]);

  // Section row counts for pills
  const sectionCounts = useMemo(() => {
    const counts = { ALL: rows.length };
    rows.forEach((r) => {
      if (r.section) {
        counts[r.section] = (counts[r.section] || 0) + 1;
      }
    });
    return counts;
  }, [rows]);

  // Filtered rows based on Search Bar, Section Pill, and Customer Dropdown
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Section filter
      if (selectedSection !== 'ALL' && row.section !== selectedSection) {
        return false;
      }

      // 2. Customer filter
      if (selectedCustomer !== 'ALL' && row.customer !== selectedCustomer) {
        return false;
      }

      // 3. Search query filter across all 5 columns
      if (searchTerm) {
        const query = searchTerm.toLowerCase().trim();
        const cust = (row.customer || '').toLowerCase();
        const outlet = (row.outlet || '').toLowerCase();
        const u1 = (row.update1 || '').toLowerCase();
        const u2 = (row.update2 || '').toLowerCase();
        const u3 = (row.update3 || '').toLowerCase();

        return (
          cust.includes(query) ||
          outlet.includes(query) ||
          u1.includes(query) ||
          u2.includes(query) ||
          u3.includes(query)
        );
      }

      return true;
    });
  }, [rows, selectedSection, selectedCustomer, searchTerm]);

  // TV Display Smooth Auto-scroll
  useEffect(() => {
    if (!isTvAutoScroll) return;

    let intervalId = null;
    let direction = 1;
    const scrollStep = 1;
    const scrollDelay = 40;

    intervalId = setInterval(() => {
      if (!scrollContainerRef.current) return;
      const el = scrollContainerRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;

      if (maxScroll <= 0) return;

      if (el.scrollTop >= maxScroll) {
        direction = -1;
      } else if (el.scrollTop <= 0) {
        direction = 1;
      }

      el.scrollTop += scrollStep * direction;
    }, scrollDelay);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTvAutoScroll]);

  // Helper to highlight payment status keywords cleanly
  const renderUpdateContent = (text) => {
    if (!text || text.trim() === '') {
      return <span className="pu-dash">-</span>;
    }

    const lower = text.toLowerCase();
    const isReceived =
      lower.includes('received payment') ||
      lower.includes('receive payment') ||
      lower.includes('full payment') ||
      lower.includes('done full payment') ||
      lower.includes('fully settle');
    const isPending =
      lower.includes('pending') ||
      lower.includes('not due yet') ||
      lower.includes('follow up') ||
      lower.includes('waiting');

    return (
      <div
        className={`pu-update-text ${
          isReceived ? 'pu-update--received' : isPending ? 'pu-update--pending' : ''
        }`}
      >
        {text}
      </div>
    );
  };

  return (
    <div className="pu-dashboard">
      {/* Top Filter & Controls Bar */}
      <div className="pu-top-bar">
        <div className="pu-title-group">
          <h2 className="pu-title">PAYMENT UPDATE TRACKING</h2>
          {/* <span className="pu-subtitle">
            Weekly 3-Week Status Updates Across Outlets
          </span> */}
        </div>

        <div className="pu-controls-actions">
          {/* Search Box */}
          <div className="pu-search-box">
            <span className="pu-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="pu-search-input"
              placeholder="Search customer, outlet, update..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search payment updates"
            />
            {searchTerm && (
              <button
                type="button"
                className="pu-clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Section Filter Pills */}
          <div className="pu-section-pills" role="tablist" aria-label="Section Filter">
            {sections.map((sec) => (
              <button
                key={sec}
                type="button"
                role="tab"
                aria-selected={selectedSection === sec}
                className={`pu-section-pill ${selectedSection === sec ? 'active' : ''}`}
                onClick={() => setSelectedSection(sec)}
              >
                {sec}
                <span className="pu-pill-count">
                  {sectionCounts[sec] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Customer Dropdown Filter */}
          <div className="pu-customer-select-wrap">
            <select
              className="pu-customer-select"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              aria-label="Filter by Customer"
            >
              <option value="ALL">All Customers ({customerList.length})</option>
              {customerList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Results Badge
          <div className="pu-results-badge">
            <strong>{filteredRows.length}</strong> outlets
          </div> */}

          {/* TV Auto-Scroll Button
          <button
            type="button"
            className={`pu-scroll-toggle ${isTvAutoScroll ? 'active' : ''}`}
            onClick={() => setIsTvAutoScroll((prev) => !prev)}
            title="Toggle smooth auto-scrolling for TV display"
          >
            {isTvAutoScroll ? '⏸ TV Pause' : '▶ TV Scroll'}
          </button> */}
        </div>
      </div>

      {/* Main 5-Column Data Table */}
      <div className="pu-table-wrapper" ref={scrollContainerRef}>
        <table className="pu-master-table">
          <thead>
            <tr>
              {/* Column 1: Customer Name (Col A) */}
              <th className="pu-col-customer">CUSTOMER NAME</th>

              {/* Column 2: Outlet Name (Col B) */}
              <th className="pu-col-outlet">OUTLET NAME</th>

              {/* Column 3: Update 1 */}
              <th className="pu-col-update pu-col-u1">
                <div className="pu-th-content">
                  <span className="pu-th-tag">WEEK 1</span>
                  <span className="pu-th-title">{columns[0] || 'Update 1'}</span>
                </div>
              </th>

              {/* Column 4: Update 2 */}
              <th className="pu-col-update pu-col-u2">
                <div className="pu-th-content">
                  <span className="pu-th-tag">WEEK 2</span>
                  <span className="pu-th-title">{columns[1] || 'Update 2'}</span>
                </div>
              </th>

              {/* Column 5: Update 3 */}
              <th className="pu-col-update pu-col-u3">
                <div className="pu-th-content">
                  <span className="pu-th-tag">WEEK 3</span>
                  <span className="pu-th-title">{columns[2] || 'Update 3'}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="pu-empty-cell">
                  <div className="pu-spinner" />
                  <span>Loading payment updates from Google Sheets...</span>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="pu-empty-cell">
                  <span>No matching payment updates found.</span>
                  {(searchTerm || selectedCustomer !== 'ALL' || selectedSection !== 'ALL') && (
                    <button
                      type="button"
                      className="pu-reset-filters-btn"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCustomer('ALL');
                        setSelectedSection('ALL');
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                // Check if current row starts a new customer block to visually group
                const isFirstOfCustomer =
                  idx === 0 || filteredRows[idx - 1].customer !== row.customer;

                return (
                  <tr
                    key={row.id}
                    className={`pu-table-row ${isFirstOfCustomer ? 'pu-row--new-customer' : ''}`}
                  >
                    {/* Column 1: Customer Name */}
                    <td className="pu-cell-customer">
                      <div className="pu-customer-pill" title={row.customer}>
                        <span className="pu-customer-icon" aria-hidden="true">🏢</span>
                        <span className="pu-customer-name">{row.customer}</span>
                        {row.section && (
                          <span className="pu-section-tag">{row.section}</span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Outlet Name */}
                    <td className="pu-cell-outlet">
                      <div className="pu-outlet-name" title={row.outlet}>
                        {row.outlet}
                      </div>
                    </td>

                    {/* Column 3: Update 1 */}
                    <td className="pu-cell-update pu-cell-u1">
                      {renderUpdateContent(row.update1)}
                    </td>

                    {/* Column 4: Update 2 */}
                    <td className="pu-cell-update pu-cell-u2">
                      {renderUpdateContent(row.update2)}
                    </td>

                    {/* Column 5: Update 3 */}
                    <td className="pu-cell-update pu-cell-u3">
                      {renderUpdateContent(row.update3)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PaymentUpdateTable;
