// src/utils/fetchPaymentUpdate.js
import Papa from 'papaparse';
import {
  PAYMENT_UPDATE_SHEET,
  ACTIVE_UPDATE_COLUMNS,
  columnLetterToIndex,
} from '../config/paymentUpdateConfig';

/**
 * Fetches and parses the PAYMENT UPDATE tab (gid: 451510300).
 *
 * Requirements:
 * 1. Exactly 5 columns: Column A (Customer Name), Column B (Outlet Name), and the 3 weekly updates.
 * 2. Each customer name is treated individually, displaying their outlet names and respective updates.
 * 3. If for any customer name, the other 4 columns are empty, that row is removed and not shown.
 * 4. Customer names, outlet names, and their respective updates are properly extracted and displayed.
 */
export async function fetchPaymentUpdateData() {
  const timestamp = Date.now();
  const directExportUrl = `https://docs.google.com/spreadsheets/d/${PAYMENT_UPDATE_SHEET.id}/export?format=csv&gid=${PAYMENT_UPDATE_SHEET.gid}&_t=${timestamp}`;
  const fallbackUrl = `https://docs.google.com/spreadsheets/d/${PAYMENT_UPDATE_SHEET.id}/gviz/tq?tqx=out:csv&gid=${PAYMENT_UPDATE_SHEET.gid}&_t=${timestamp}`;

  let csvText = '';
  try {
    const response = await fetch(directExportUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (err) {
    console.warn('Direct export failed for Payment Update, trying fallback...', err);
    const response = await fetch(fallbackUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fallback HTTP ${response.status}`);
    csvText = await response.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        try {
          const rawRows = results.data || [];
          if (!rawRows || rawRows.length === 0) {
            resolve({ rows: [], columns: ['Week 1', 'Week 2', 'Week 3'], sections: ['ALL'], customers: [] });
            return;
          }

          // Resolve target update column indices from config (defaults to N=13, O=14, P=15)
          const targetCols = (
            ACTIVE_UPDATE_COLUMNS && ACTIVE_UPDATE_COLUMNS.length === 3
          )
            ? ACTIVE_UPDATE_COLUMNS.map(columnLetterToIndex)
            : [13, 14, 15];

          // Determine column headers for the 3 chosen columns
          // Look for date patterns (e.g. "17/10 - 24/10/2026") or "UPDATE" in early rows
          let headerCol1 = '';
          let headerCol2 = '';
          let headerCol3 = '';

          for (let r = 0; r < Math.min(rawRows.length, 60); r++) {
            const row = rawRows[r] || [];
            const v1 = String(row[targetCols[0]] || '').trim();
            const v2 = String(row[targetCols[1]] || '').trim();
            const v3 = String(row[targetCols[2]] || '').trim();

            // Check if string contains date range or specific week date
            if (v1 && !headerCol1 && (v1.includes('/') || v1.toUpperCase().includes('UPDATE'))) {
              headerCol1 = v1.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            }
            if (v2 && !headerCol2 && (v2.includes('/') || v2.toUpperCase().includes('UPDATE'))) {
              headerCol2 = v2.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            }
            if (v3 && !headerCol3 && (v3.includes('/') || v3.toUpperCase().includes('UPDATE'))) {
              headerCol3 = v3.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            }
          }

          // Clean header text if it's very long (take first line or date segment)
          const cleanHeader = (h, fallback) => {
            if (!h) return fallback;
            const match = h.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*-\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
            if (match) return match[0];
            return h.split('\n')[0].slice(0, 30);
          };

          const columns = [
            cleanHeader(headerCol1, `Week 1 (Col ${targetCols[0] + 1})`),
            cleanHeader(headerCol2, `Week 2 (Col ${targetCols[1] + 1})`),
            cleanHeader(headerCol3, `Week 3 (Col ${targetCols[2] + 1})`),
          ];

          let currentSection = 'IKA';
          let currentCustomer = '';
          const processed = [];
          const sectionsSet = new Set(['ALL', 'IKA']);
          const customersSet = new Set();

          for (let i = 0; i < rawRows.length; i++) {
            const r = rawRows[i] || [];
            const rawA = String(r[0] || '').trim();
            const rawB = String(r[1] || '').trim();

            // Detect section headers (IKA, LKA, SKA, GT)
            if (rawA.includes("IKA (SEP'26)") || rawA === 'IKA') {
              currentSection = 'IKA';
              sectionsSet.add('IKA');
              currentCustomer = '';
              continue;
            }
            if (rawA.includes("LKA (SEP'26)") || rawA === 'LKA') {
              currentSection = 'LKA';
              sectionsSet.add('LKA');
              currentCustomer = '';
              continue;
            }
            if (rawA.includes("SKA (SEP'26)") || rawA === 'SKA') {
              currentSection = 'SKA';
              sectionsSet.add('SKA');
              currentCustomer = '';
              continue;
            }
            if (rawA === 'GT' || rawA.startsWith('GT-')) {
              currentSection = 'GT';
              sectionsSet.add('GT');
              currentCustomer = '';
              if (rawA === 'GT') continue;
            }

            // Skip sheet titles & repeated column header rows
            if (rawA.includes('LKA,IKA, SKA') || rawA === 'LKA,IKA, SKA, GT') continue;
            if (rawA.toUpperCase() === 'CUSTOMER NAME' || rawB.toUpperCase() === 'OUTLET NAME') continue;

            const u1 = r[targetCols[0]] !== undefined ? String(r[targetCols[0]]).trim() : '';
            const u2 = r[targetCols[1]] !== undefined ? String(r[targetCols[1]]).trim() : '';
            const u3 = r[targetCols[2]] !== undefined ? String(r[targetCols[2]]).trim() : '';

            // Ignore rows that are completely blank across all 5 relevant columns
            if (!rawA && !rawB && !u1 && !u2 && !u3) {
              continue;
            }

            // Customer Name detection from Column A
            if (rawA) {
              // Clean trailing punctuation like " :-" or ": -"
              currentCustomer = rawA.replace(/[:-\s]+$/, '').trim();

              // Rule 3: "if for any customer name, the other 4 columns are empty, please remove that row and no need to show that.."
              const other4Empty = !rawB && !u1 && !u2 && !u3;
              if (other4Empty) {
                // Header-only row used purely to establish customer context
                continue;
              }
            }

            // If both Column A and Column B are empty, skip row
            if (!rawA && !rawB) {
              continue;
            }

            // If Column B simply repeats the customer name and has no updates at all, skip redundant line
            const cleanB = rawB.replace(/[:-\s]+$/, '').trim();
            if (
              cleanB &&
              currentCustomer &&
              cleanB.toUpperCase() === currentCustomer.toUpperCase() &&
              !u1 && !u2 && !u3
            ) {
              continue;
            }

            const outletName = rawB || currentCustomer;
            const customerName = currentCustomer || outletName;

            if (customerName) {
              customersSet.add(customerName);
            }

            processed.push({
              id: `pu-row-${i + 1}`,
              rowNumber: i + 1,
              section: currentSection,
              customer: customerName,
              outlet: outletName,
              update1: u1,
              update2: u2,
              update3: u3,
            });
          }

          resolve({
            rows: processed,
            columns,
            sections: Array.from(sectionsSet),
            customers: Array.from(customersSet).sort(),
            targetIndices: targetCols,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (err) => reject(err),
    });
  });
}
