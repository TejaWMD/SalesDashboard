// src/utils/fetchSheet.js
import Papa from 'papaparse';

// Google Sheet configuration
export const SHEET_ID = '11ww5CiQYESF4E513Sxrx789uLmokkFdw';
export const SHEET_GID = '1281119238'; // Tab: "Data for TV"
export const SHEET_TAB_NAME = 'Data for TV';

/**
 * Standard 12-month calendar order
 */
export const MONTH_ORDER = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/**
 * Normalizes month strings so variations like "JULY" and "SEPT"
 * map to standard 3-letter codes ("JUL", "SEP")
 */
export function normalizeMonth(monthStr) {
  if (!monthStr) return '';
  const clean = String(monthStr).trim().toUpperCase();
  if (clean === 'JULY') return 'JUL';
  if (clean === 'SEPT') return 'SEP';
  return clean;
}

/**
 * Parses a cell value from Google Sheets.
 * Accurately differentiates between an empty/blank cell and a zero value.
 */
export function parseSheetValue(val) {
  if (val === null || val === undefined) {
    return { raw: '', num: null, isBlank: true };
  }
  const str = String(val).trim();
  if (str === '') {
    return { raw: '', num: null, isBlank: true };
  }

  // Remove commas, currency symbols, percentage signs
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-') {
    return { raw: str, num: null, isBlank: true };
  }

  const num = parseFloat(cleaned);
  return {
    raw: str,
    num: isNaN(num) ? null : num,
    isBlank: isNaN(num),
  };
}

/**
 * Formats numbers into Malaysian Ringgit style (RM 1,234.56).
 * Returns empty/dash if the cell is blank / null.
 */
export function formatCurrency(amount, includeSymbol = true, blankPlaceholder = '-') {
  if (amount === null || amount === undefined) return blankPlaceholder;
  const num = Number(amount);
  if (isNaN(num)) return blankPlaceholder;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `RM ${formatted}` : formatted;
}

/**
 * Compact currency for KPI cards / charts (e.g. RM 1.2M, RM 45.2k).
 */
export function formatCompactCurrency(amount) {
  if (amount === null || amount === undefined) return '-';
  const num = Number(amount);
  if (isNaN(num)) return '-';
  if (Math.abs(num) >= 1000000) {
    return `RM ${(num / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `RM ${(num / 1000).toFixed(1)}k`;
  }
  return `RM ${num.toFixed(0)}`;
}

/**
 * Formats percentages into 1 decimal place with % sign.
 * Returns blankPlaceholder if the cell is blank / null.
 */
export function formatPercent(val, blankPlaceholder = '-') {
  if (val === null || val === undefined) return blankPlaceholder;
  if (typeof val === 'string' && val.includes('%')) {
    const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) return `${parsed.toFixed(1)}%`;
    return val;
  }
  const num = Number(val);
  if (isNaN(num)) return blankPlaceholder;
  return `${num.toFixed(1)}%`;
}

/**
 * Normalizes an object's keys to uppercase trimmed strings
 */
function normalizeRowKeys(rawRow) {
  const normalized = {};
  for (const key of Object.keys(rawRow)) {
    const cleanKey = key.trim().toUpperCase();
    normalized[cleanKey] = rawRow[key];
  }
  return normalized;
}

/**
 * Fetches the Google Sheet CSV and transforms into standardized row objects.
 * Accurately maps Columns A to H:
 * Column A: STORE
 * Column B: PERSON IN CHARGE
 * Column C: MONTH
 * Column D: TARGET
 * Column E: SALES
 * Column F: S vs T PERCENTAGE
 * Column G: PAYMENT PENDING
 * Column H: PAYMENT COLLECTED
 */
export async function fetchSheetData() {
  const timestamp = Date.now();
  // Using direct export URL with cache-busting timestamp
  const directExportUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}&_t=${timestamp}`;
  const fallbackUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}&_t=${timestamp}`;

  let csvText = '';
  try {
    const response = await fetch(directExportUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (err) {
    console.warn('Direct export failed, trying gviz fallback...', err);
    const response = await fetch(fallbackUrl, { cache: 'no-store' });
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
            const row = normalizeRowKeys(rawRows[i]);

            // Column A: STORE
            const store = (row['STORE'] || '').trim();

            // Column B: PERSON IN CHARGE
            const person = (
              row['PERSON IN CHARGE'] ||
              row['PIC'] ||
              row['PERSON'] ||
              ''
            ).trim();

            // Column C: MONTH
            const rawMonth = (row['MONTH'] || '').trim();
            const month = normalizeMonth(rawMonth);

            // Skip empty placeholder rows where both store and person are blank
            if (!store && !person) continue;

            // Column D: TARGET
            const targetVal = parseSheetValue(row['TARGET']);

            // Column E: SALES
            const salesVal = parseSheetValue(row['SALES']);

            // Column F: S vs T PERCENTAGE
            const sVsTVal = parseSheetValue(
              row['S vs T PERCENTAGE'] ||
              row['S VS T PERCENTAGE'] ||
              row['PERCENTAGE']
            );

            // Column G: PAYMENT PENDING
            const pendingVal = parseSheetValue(
              row['PAYMENT PENDING'] ||
              row['PENDING']
            );

            // Column H: PAYMENT COLLECTED
            const collectedVal = parseSheetValue(
              row['PAYMENT COLLECTED'] ||
              row['COLLECTED'] ||
              row['RECEIVED']
            );

            // Calculate percentage if not explicitly present in sheet but target & sales exist
            let salesPercent = null;
            if (!sVsTVal.isBlank) {
              salesPercent = sVsTVal.num;
            } else if (!salesVal.isBlank && !targetVal.isBlank && targetVal.num > 0) {
              salesPercent = (salesVal.num / targetVal.num) * 100;
            }

            // Collection rate if both or either payment numbers exist
            let collectionRate = null;
            const collectedNum = collectedVal.isBlank ? null : collectedVal.num;
            const pendingNum = pendingVal.isBlank ? null : pendingVal.num;
            if (collectedNum !== null || pendingNum !== null) {
              const c = collectedNum || 0;
              const p = pendingNum || 0;
              const totalBilled = c + p;
              if (totalBilled > 0) {
                collectionRate = (c / totalBilled) * 100;
              }
            }

            if (month) monthsSet.add(month);

            processed.push({
              id: `${store}-${person}-${month}-${i}`,
              store: store || 'Unknown Store',
              person: person || 'Unassigned',
              month: month || 'OCT',

              // Numbers (null if blank in sheet)
              target: targetVal.isBlank ? null : targetVal.num,
              sales: salesVal.isBlank ? null : salesVal.num,
              salesPercent,
              pending: pendingVal.isBlank ? null : pendingVal.num,
              collected: collectedVal.isBlank ? null : collectedVal.num,
              collectionRate,

              // Raw text values as entered in sheet
              targetRaw: targetVal.raw,
              salesRaw: salesVal.raw,
              sVsTRaw: sVsTVal.raw,
              pendingRaw: pendingVal.raw,
              collectedRaw: collectedVal.raw,

              // Explicit blank flags
              isTargetBlank: targetVal.isBlank,
              isSalesBlank: salesVal.isBlank,
              isPercentBlank: sVsTVal.isBlank && salesPercent === null,
              isPendingBlank: pendingVal.isBlank,
              isCollectedBlank: collectedVal.isBlank,
            });
          }

          // Sort months according to standard calendar order
          const availableMonths = Array.from(monthsSet).sort((a, b) => {
            const ia = MONTH_ORDER.indexOf(a);
            const ib = MONTH_ORDER.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
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
