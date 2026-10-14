// src/utils/fetchSheet.js
import Papa from 'papaparse';

// Google Sheet configuration
export const SHEET_ID = '11ww5CiQYESF4E513Sxrx789uLmokkFdw';
export const SHEET_GID = '1281119238'; // Tab: "Data for TV"
export const SHEET_TAB_NAME = 'Data for TV';

/**
 * Parses numeric strings with commas, currency signs, or percentages into numbers.
 */
export function parseNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats numbers into currency / Malaysian Ringgit style (RM / 1,234.56).
 */
export function formatCurrency(amount, includeSymbol = true) {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `RM ${formatted}` : formatted;
}

/**
 * Formats percentages into 1 or 2 decimal places with % sign.
 */
export function formatPercent(val) {
  const num = Number(val) || 0;
  return `${num.toFixed(1)}%`;
}

/**
 * Normalizes an object's keys to uppercase trimmed strings
 */
function normalizeRow(rawRow) {
  const normalized = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim().toUpperCase();
    normalized[cleanKey] = rawRow[key];
  }
  return normalized;
}

/**
 * Fetches the Google Sheet CSV and transforms into standardized row objects.
 */
export async function fetchSheetData() {
  // Use direct export URL with cache-busting timestamp
  const timestamp = Date.now();
  const directExportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}&_t=${timestamp}`;
  const fallbackUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}&_t=${timestamp}`;

  let csvText = '';
  try {
    const response = await fetch(directExportUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (err) {
    console.warn('Direct export failed, trying fallback...', err);
    const response = await fetch(fallbackUrl);
    csvText = await response.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rawRows = results.data || [];
          const processed = [];
          const monthsSet = new Set();

          for (let i = 0; i < rawRows.length; i++) {
            const row = normalizeRow(rawRows[i]);

            const store = (row['STORE'] || '').trim();
            const person = (row['PERSON IN CHARGE'] || row['PERSON'] || '').trim();
            const month = (row['MONTH'] || '').trim().toUpperCase();

            // Skip empty placeholder rows or missing store/person
            if (!store && !person) continue;

            const target = parseNumber(row['TARGET']);
            const sales = parseNumber(row['SALES']);

            // Parse collection columns
            const collectedRaw = parseNumber(row['PAYMENT COLLECTED'] || row['COLLECTED'] || row['RECEIVED']);
            const pendingRaw = parseNumber(row['PAYMENT PENDING'] || row['PENDING']);

            // If collected and pending are not filled in sheet, pending defaults to sales amount
            const hasExplicitCollection = row['PAYMENT COLLECTED'] !== undefined && row['PAYMENT COLLECTED'] !== '' ||
                                          row['PAYMENT PENDING'] !== undefined && row['PAYMENT PENDING'] !== '';

            const collected = collectedRaw;
            // When not explicitly keyed in sheet, pending payment defaults to sales invoiced
            const pending = hasExplicitCollection ? pendingRaw : (sales > 0 ? sales : 0);

            // Collection target / total receivable = collected + pending (or sales if 0)
            const collectionTotal = collected + pending > 0 ? (collected + pending) : sales;
            const collectionRate = collectionTotal > 0 ? (collected / collectionTotal) * 100 : 0;

            const salesPercent = target > 0 ? (sales / target) * 100 : 0;
            const remainingSales = Math.max(0, target - sales);

            if (month) monthsSet.add(month);

            processed.push({
              id: `${store}-${person}-${month}-${i}`,
              store: store || 'Unknown Store',
              person: person || 'Unassigned',
              month: month || 'OCT',
              target,
              sales,
              salesPercent,
              remainingSales,
              collected,
              pending,
              collectionTotal,
              collectionRate,
              hasExplicitCollection,
            });
          }

          // Order months: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
          const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'JULY', 'AUG', 'SEP', 'SEPT', 'OCT', 'NOV', 'DEC'];
          const availableMonths = Array.from(monthsSet).sort((a, b) => {
            const ia = monthOrder.indexOf(a);
            const ib = monthOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            return a.localeCompare(b);
          });

          resolve({
            rows: processed,
            availableMonths: availableMonths.length > 0 ? availableMonths : ['OCT'],
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (err) => reject(err),
    });
  });
}
