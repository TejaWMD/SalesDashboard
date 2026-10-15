// src/utils/fetchSheet.js
import Papa from 'papaparse';

// Google Sheet configurations
export const SALES_SHEET = {
  id: '11ww5CiQYESF4E513Sxrx789uLmokkFdw',
  gid: '1281119238',
  tab: 'Data for TV',
};

export const PAYMENT_SHEET = {
  id: '1z2lgK4l9GKiykqMPJk_UF9NzQnzUJIPOiLhv0qfeVm4',
  gid: '1645199720',
  tab: 'SUMMARY OCTOBER TEJA',
};

export const ONLINE_SHEET = {
  id: '1Ca_p2pDurpAjeO0hdCeAqTPpcLO2EMZ86emzvhYXlJY',
  gid: '388466216',
  tab: 'OKTOBER 2026',
};

// Backward-compatibility aliases
export const SHEET_ID = SALES_SHEET.id;
export const SHEET_GID = SALES_SHEET.gid;
export const SHEET_TAB_NAME = SALES_SHEET.tab;

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
 * 1. Fetches Sales Data from Sheet 1 ("Data for TV" tab)
 * Columns: Store, Person in Charge, Month, Target, Sales, S vs T %
 */
export async function fetchSalesData() {
  const timestamp = Date.now();
  const directExportUrl = `https://docs.google.com/spreadsheets/d/${SALES_SHEET.id}/export?format=csv&gid=${SALES_SHEET.gid}&_t=${timestamp}`;
  const fallbackUrl = `https://docs.google.com/spreadsheets/d/${SALES_SHEET.id}/gviz/tq?tqx=out:csv&gid=${SALES_SHEET.gid}&_t=${timestamp}`;

  let csvText = '';
  try {
    const response = await fetch(directExportUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (err) {
    console.warn('Direct export failed for Sales, trying gviz fallback...', err);
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

/**
 * Fetches Payment Data from Google Sheets.
 *
 * Source columns:
 * A = Customer
 * B = Account Manager
 * E = Payment Collected
 * J = Payment Pending
 *
 * No receivable field is created or returned.
 */
export async function fetchPaymentData() {
  const timestamp = Date.now();
  const encodedTab = encodeURIComponent(PAYMENT_SHEET.tab);

  const gvizUrl =
    `https://docs.google.com/spreadsheets/d/${PAYMENT_SHEET.id}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodedTab}&_t=${timestamp}`;

  const directExportUrl =
    `https://docs.google.com/spreadsheets/d/${PAYMENT_SHEET.id}` +
    `/export?format=csv&sheet=${encodedTab}&_t=${timestamp}`;

  let csvText = '';

  try {
    const response = await fetch(gvizUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    csvText = await response.text();
  } catch (error) {
    console.warn(
      'Google Visualization request failed. Trying CSV export...',
      error
    );

    const response = await fetch(directExportUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `Payment sheet request failed: HTTP ${response.status}`
      );
    }

    csvText = await response.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: 'greedy',

      complete: (results) => {
        try {
          const rawRows = results.data || [];

          if (rawRows.length <= 1) {
            resolve({
              rows: [],
              picList: [],
              summary: {
                totalCollected: null,
                totalPending: null,
                overallCollectionRate: null,
                overallPendingRate: null,
                totalCustomers: 0,
              },
            });
            return;
          }

          const processed = [];
          const picMap = {};

          let totalCollected = 0;
          let totalPending = 0;
          let hasCollected = false;
          let hasPending = false;

          // Skip the header row.
          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i] || [];

            // Column A: Customer
            const customer = String(row[0] || '').trim();

            // Column B: Account Manager
            const person = String(row[1] || '').trim();

            // Skip rows without a customer or account manager.
            if (!customer && !person) continue;

            // Column E: Payment Collected
            const collectedVal = parseSheetValue(row[4]);

            // Column J: Payment Pending
            const pendingVal = parseSheetValue(row[9]);

            const collected = collectedVal.isBlank
              ? 0
              : (collectedVal.num ?? 0);

            const pending = pendingVal.isBlank
              ? 0
              : (pendingVal.num ?? 0);

            if (!collectedVal.isBlank) hasCollected = true;
            if (!pendingVal.isBlank) hasPending = true;

            totalCollected += collected;
            totalPending += pending;

            /*
             * Collection and pending rates are calculated directly
             * from the collected and pending amounts.
             * No receivable property is stored in the data.
             */
            const combinedAmount = collected + pending;

            const collectionRate =
              combinedAmount > 0
                ? (collected / combinedAmount) * 100
                : null;

            const pendingRate =
              combinedAmount > 0
                ? (pending / combinedAmount) * 100
                : null;

            const accountManager = person || 'Unassigned';

            if (!picMap[accountManager]) {
              picMap[accountManager] = {
                name: accountManager,
                collected: 0,
                pending: 0,
                customerCount: 0,
              };
            }

            // Group amounts by account manager.
            picMap[accountManager].collected += collected;
            picMap[accountManager].pending += pending;
            picMap[accountManager].customerCount += 1;

            processed.push({
              id: `pay-${customer}-${person}-${i}`,

              customer: customer || 'Unknown Customer',
              person: accountManager,

              collected: collectedVal.isBlank
                ? null
                : collectedVal.num,

              pending: pendingVal.isBlank
                ? null
                : pendingVal.num,

              collectionRate,
              pendingRate,

              collectedRaw: collectedVal.raw,
              pendingRaw: pendingVal.raw,

              isCollectedBlank: collectedVal.isBlank,
              isPendingBlank: pendingVal.isBlank,
            });
          }

          // Calculate overall payment rates.
          const combinedTotal = totalCollected + totalPending;

          const overallCollectionRate =
            combinedTotal > 0
              ? (totalCollected / combinedTotal) * 100
              : null;

          const overallPendingRate =
            combinedTotal > 0
              ? (totalPending / combinedTotal) * 100
              : null;

          // Build account manager analysis.
          const picList = Object.values(picMap).map((pic) => {
            const combined = pic.collected + pic.pending;

            const collectionPercent =
              combined > 0
                ? (pic.collected / combined) * 100
                : null;

            const pendingPercent =
              combined > 0
                ? (pic.pending / combined) * 100
                : null;

            let status = 'neutral';
            let statusLabel = 'Awaiting';

            if (collectionPercent !== null) {
              if (collectionPercent >= 90) {
                status = 'success';
                statusLabel = 'Excellent';
              } else if (collectionPercent >= 60) {
                status = 'primary';
                statusLabel = 'Good Progress';
              } else if (collectionPercent >= 30) {
                status = 'warning';
                statusLabel = 'Pending Followup';
              } else {
                status = 'danger';
                statusLabel = 'Action Needed';
              }
            }

            return {
              ...pic,
              collectionPercent,
              pendingPercent,
              status,
              statusLabel,
            };
          });

          // Rank account managers by collection rate.
          picList.sort((a, b) => {
            if (a.collectionPercent === null) return 1;
            if (b.collectionPercent === null) return -1;

            return (
              b.collectionPercent - a.collectionPercent ||
              a.name.localeCompare(b.name)
            );
          });

          const ratedPics = picList.filter(
            (pic) => pic.collectionPercent !== null
          );

          const highestPic = ratedPics[0];
          const lowestPic = ratedPics[ratedPics.length - 1];

          const rankedPicList = picList.map((pic) => ({
            ...pic,
            performanceHighlight:
              pic === highestPic
                ? 'best'
                : pic === lowestPic && lowestPic !== highestPic
                  ? 'worst'
                  : null,
          }));

          resolve({
            rows: processed,
            picList: rankedPicList,

            summary: {
              totalCollected: hasCollected
                ? totalCollected
                : null,

              totalPending: hasPending
                ? totalPending
                : null,

              overallCollectionRate,
              overallPendingRate,
              totalCustomers: processed.length,
            },
          });
        } catch (error) {
          reject(error);
        }
      },

      error: (error) => reject(error),
    });
  });
}

/**
 * 3. Fetches Online Sales Data from Sheet 3 ("OKTOBER 2026" tab)
 * Requirement:
 * - Take sales value for now from C34 and D34
 * - C34: Shopee sales
 * - D34: TikTok sales
 * - Also parses daily sales rows for trends & charts
 */
export async function fetchOnlineData() {
  const timestamp = Date.now();
  const directExportUrl = `https://docs.google.com/spreadsheets/d/${ONLINE_SHEET.id}/export?format=csv&gid=${ONLINE_SHEET.gid}&_t=${timestamp}`;
  const fallbackUrl = `https://docs.google.com/spreadsheets/d/${ONLINE_SHEET.id}/gviz/tq?tqx=out:csv&gid=${ONLINE_SHEET.gid}&_t=${timestamp}`;

  let csvText = '';
  try {
    const response = await fetch(directExportUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    csvText = await response.text();
  } catch (err) {
    console.warn('Direct export failed for Online, trying gviz fallback...', err);
    const response = await fetch(fallbackUrl, { cache: 'no-store' });
    csvText = await response.text();
  }

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rawRows = results.data || [];
          let shopeeTotal = null;
          let tiktokTotal = null;
          let totalSales = null;
          const dailyRecords = [];

          for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r];
            const colB = (row[1] || '').trim().toUpperCase();

            // Look for TOTAL row (row 34 or marked TOTAL)
            if (colB === 'TOTAL' || r === 33) {
              const c34Val = parseSheetValue(row[2]); // Col C
              const d34Val = parseSheetValue(row[3]); // Col D
              const e34Val = parseSheetValue(row[4]); // Col E

              if (!c34Val.isBlank) shopeeTotal = c34Val.num;
              if (!d34Val.isBlank) tiktokTotal = d34Val.num;

              if (shopeeTotal !== null || tiktokTotal !== null) {
                totalSales = (shopeeTotal || 0) + (tiktokTotal || 0);
              } else if (!e34Val.isBlank) {
                totalSales = e34Val.num;
              }
            } else if (row[1] && (row[1].includes('/') || row[1].toLowerCase().includes('oct') || row[1].toLowerCase().includes('okt'))) {
              // Daily sales records (e.g. 1/10/2026)
              const date = (row[1] || '').trim();
              const shopee = parseSheetValue(row[2]);
              const tiktok = parseSheetValue(row[3]);
              const total = parseSheetValue(row[4]);

              const sNum = shopee.isBlank ? 0 : shopee.num;
              const tNum = tiktok.isBlank ? 0 : tiktok.num;
              const totNum = (!total.isBlank && total.num) ? total.num : (sNum + tNum);

              if (sNum > 0 || tNum > 0 || totNum > 0) {
                dailyRecords.push({
                  date,
                  shopee: sNum,
                  tiktok: tNum,
                  total: totNum,
                });
              }
            }
          }

          // If TOTAL row wasn't found in loop, calculate from daily
          if (shopeeTotal === null && tiktokTotal === null && dailyRecords.length > 0) {
            shopeeTotal = dailyRecords.reduce((acc, d) => acc + d.shopee, 0);
            tiktokTotal = dailyRecords.reduce((acc, d) => acc + d.tiktok, 0);
            totalSales = shopeeTotal + tiktokTotal;
          }

          const safeTotal = totalSales || ((shopeeTotal || 0) + (tiktokTotal || 0));
          const shopeePercent = safeTotal > 0 ? ((shopeeTotal || 0) / safeTotal) * 100 : 0;
          const tiktokPercent = safeTotal > 0 ? ((tiktokTotal || 0) / safeTotal) * 100 : 0;

          const activeDaysCount = dailyRecords.length;
          const dailyAverage = activeDaysCount > 0 ? safeTotal / activeDaysCount : 0;

          let peakDay = null;
          if (dailyRecords.length > 0) {
            peakDay = [...dailyRecords].sort((a, b) => b.total - a.total)[0];
          }

          resolve({
            shopeeTotal: shopeeTotal !== null ? shopeeTotal : 0,
            tiktokTotal: tiktokTotal !== null ? tiktokTotal : 0,
            totalSales: safeTotal,
            shopeePercent,
            tiktokPercent,
            dailyRecords,
            activeDaysCount,
            dailyAverage,
            peakDay,
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Backward compatibility alias for existing code
 */
export async function fetchSheetData() {
  return fetchSalesData();
}
