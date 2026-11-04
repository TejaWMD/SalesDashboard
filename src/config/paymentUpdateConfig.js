// src/config/paymentUpdateConfig.js

/**
 * =========================================================================
 * GOOGLE SPREADSHEET CONFIGURATION FOR PAYMENT UPDATE
 * =========================================================================
 */
export const PAYMENT_UPDATE_SHEET = {
  id: '1z2lgK4l9GKiykqMPJk_UF9NzQnzUJIPOiLhv0qfeVm4',
  gid: '451510300',
  tab: 'PAYMENT UPDATE',
};

/**
 * Helper to convert Excel/Google Sheet column letter (e.g. 'A', 'B', 'N', 'AA')
 * to 0-based column index.
 * 'A' -> 0, 'B' -> 1, ..., 'N' -> 13, 'O' -> 14, 'P' -> 15, etc.
 */
export function columnLetterToIndex(column) {
  if (typeof column === 'number') return column;
  const str = String(column).trim().toUpperCase();
  let index = 0;
  for (let i = 0; i < str.length; i++) {
    index = index * 26 + (str.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * =========================================================================
 * EASY 3-WEEK COLUMN CONFIGURATION
 * =========================================================================
 * Every week, as new columns are added in Google Sheets, you can simply change
 * which 3 weekly columns are connected and displayed right here!
 *
 * You can write column letters (e.g. ['N', 'O', 'P']) or 0-based column numbers:
 *   Col A = 0  (CUSTOMER NAME)
 *   Col B = 1  (OUTLET NAME)
 *   Col N = 13 (17/10 - 24/10/2026)
 *   Col O = 14 (25/10 - 31/10/2026)
 *   Col P = 15 (01/11 - 07/11/2026)
 *
 * Current 3 weeks: ['N', 'O', 'P']
 * When next week is added, simply change this array to: ['O', 'P', 'Q']
 */
export const ACTIVE_UPDATE_COLUMNS = ['N', 'O', 'P'];

// Resolved 0-based indices
export const ACTIVE_UPDATE_COLUMN_INDICES = ACTIVE_UPDATE_COLUMNS.map(columnLetterToIndex);
