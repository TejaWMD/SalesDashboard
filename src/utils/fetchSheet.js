// src/utils/fetchSheet.js
import axios from 'axios';
import Papa from 'papaparse';

// Google Sheet ID extracted from the shared link
const SHEET_ID = '11ww5CiQYESF4E513Sxrx789uLmokkFdw';
// Sheet name as shown in the tab
const SHEET_NAME = 'Data for TV';

/**
 * Fetches the Google Sheet as CSV and parses it into an array of objects.
 * The first row is assumed to contain column headers.
 */
export async function fetchSheetData() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;
  const response = await axios.get(url);
  const csv = response.data;
  return new Promise((resolve, reject) => {
    Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });
}
