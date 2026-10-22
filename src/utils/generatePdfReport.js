// src/utils/generatePdfReport.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import wmdLogoUrl from '../assets/wmd-logo.jpg';
import { formatCurrency, formatPercent } from './fetchSheet';

function renderTable(doc, options) {
  const runner = (typeof autoTable === 'function' ? autoTable : autoTable?.default) || doc.autoTable;
  if (typeof runner === 'function') {
    runner(doc, options);
  } else {
    console.error('autoTable runner not found on jsPDF instance');
  }
}

function loadImageData(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.9),
            aspectRatio: canvas.width / canvas.height,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export function computeSalesSummary(salesRows = [], selectedMonth = 'OCT') {
  const rows = selectedMonth === 'ALL'
    ? salesRows
    : salesRows.filter((r) => r.month === selectedMonth);

  let totalTarget = 0;
  let hasTarget = false;
  let totalSales = 0;
  let hasSales = false;
  const picMap = {};

  rows.forEach((row) => {
    if (row.target !== null && !isNaN(row.target)) {
      totalTarget += row.target;
      hasTarget = true;
    }
    if (row.sales !== null && !isNaN(row.sales)) {
      totalSales += row.sales;
      hasSales = true;
    }

    const p = row.person || 'Unassigned';
    if (!picMap[p]) {
      picMap[p] = {
        name: p,
        target: 0,
        sales: 0,
        hasTarget: false,
        hasSales: false,
        storeCount: 0,
      };
    }

    picMap[p].storeCount += 1;
    if (row.target !== null && !isNaN(row.target)) {
      picMap[p].target += row.target;
      picMap[p].hasTarget = true;
    }
    if (row.sales !== null && !isNaN(row.sales)) {
      picMap[p].sales += row.sales;
      picMap[p].hasSales = true;
    }
  });

  const overallSalesPercent = hasTarget && totalTarget > 0 ? (totalSales / totalTarget) * 100 : null;
  const totalRemaining = hasTarget ? Math.max(0, totalTarget - totalSales) : 0;

  const picList = Object.values(picMap).map((p) => {
    const pct = p.hasTarget && p.target > 0 ? (p.sales / p.target) * 100 : null;
    const rem = p.hasTarget ? Math.max(0, p.target - p.sales) : 0;

    let status = 'Awaiting';
    if (pct !== null) {
      if (pct >= 100) status = 'Exceeded';
      else if (pct >= 70) status = 'On Track';
      else if (pct >= 40) status = 'In Progress';
      else status = 'Needs Push';
    }

    return {
      ...p,
      percent: pct,
      remaining: rem,
      statusLabel: status,
    };
  });

  const sortedPicList = picList.sort((a, b) => {
    if (a.percent === null) return b.percent === null ? a.name.localeCompare(b.name) : 1;
    if (b.percent === null) return -1;
    return b.percent - a.percent || a.name.localeCompare(b.name);
  });

  const ratedPicList = sortedPicList.filter((pic) => pic.percent !== null);
  const highestPic = ratedPicList[0] || null;

  const topStores = [...rows]
    .filter((r) => r.sales !== null && r.sales > 0)
    .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 5);

  return {
    rows,
    totalTarget: hasTarget ? totalTarget : null,
    totalSales: hasSales ? totalSales : null,
    overallSalesPercent,
    totalRemaining,
    totalStores: rows.length,
    picList: sortedPicList,
    topStores,
    topPic: highestPic,
    selectedMonth,
  };
}

export async function generateExecutivePdfReport({
  salesRows = [],
  selectedMonth = 'OCT',
  paymentData = {},
  onlineData = {},
  currentUserEmail = '',
}) {
  const salesSummary = computeSalesSummary(salesRows, selectedMonth);

  const {
    rows: collectionRows = [],
    picList: collectionPicList = [],
    summary: collectionSummary = {},
  } = paymentData || {};

  const totalCollected = collectionSummary.totalCollected ?? 0;
  const totalPending = collectionSummary.totalPending ?? 0;
  const overallCollectionRate = collectionSummary.overallCollectionRate ?? null;
  const overallPendingRate = collectionSummary.overallPendingRate ?? null;
  const totalCustomers = collectionSummary.totalCustomers ?? collectionRows.length;

  const topPendingCustomers = [...collectionRows]
    .filter((r) => r.pending !== null && r.pending > 0)
    .sort((a, b) => (b.pending || 0) - (a.pending || 0))
    .slice(0, 4);

  const topCollectionAM = collectionPicList.find((p) => p.performanceHighlight === 'best') || collectionPicList[0] || null;

  const {
    shopeeTotal = 0,
    tiktokTotal = 0,
    totalSales: totalOnlineSales = 0,
    shopeePercent = 0,
    tiktokPercent = 0,
    activeDaysCount = 0,
    dailyAverage: dailyOnlineAverage = 0,
    peakDay = null,
    dailyRecords = [],
  } = onlineData || {};

  const topDays = [...dailyRecords].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 4);
  const combinedCommercialRevenue = (salesSummary.totalSales || 0) + (totalOnlineSales || 0);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  const logoInfo = await loadImageData(wmdLogoUrl);

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const COLOR_NAVY = [7, 43, 97];
  const COLOR_GOLD = [251, 229, 70];
  const COLOR_TEXT_DARK = [15, 23, 42];
  const COLOR_TEXT_MUTED = [100, 116, 139];
  const COLOR_GREEN = [22, 101, 52];
  const COLOR_RED = [153, 27, 27];
  const COLOR_CARD_BG = [248, 250, 252];
  const COLOR_BORDER = [226, 232, 240];

  const drawKpiCard = (x, y, w, h, label, value, subtext, statusColor = COLOR_NAVY) => {
    doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(x, y, 2.2, h, 0.8, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
    doc.text(label.toUpperCase(), x + 4.5, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(String(value), x + 4.5, y + 8);

    if (subtext) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
      doc.text(String(subtext), x + 4.5, y + 11.5);
    }
  };

  const drawSectionHeader = (y, number, title, badgeText) => {
    doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.roundedRect(marginX, y, contentWidth, 6, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${number}. ${title.toUpperCase()}`, marginX + 3.5, y + 4.2);

    if (badgeText) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
      doc.text(badgeText, marginX + contentWidth - 3.5, y + 4.2, { align: 'right' });
    }
  };

  const drawRunningHeader = (title) => {
    doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.rect(0, 0, pageWidth, 2.5, 'F');
    doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
    doc.rect(0, 2.5, pageWidth, 0.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('WMD SALES & COLLECTION REPORT', marginX, 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
    doc.text(`•  ${title}`, marginX + 58, 7.5);
    doc.text(`Period: ${selectedMonth.toUpperCase()} 2026`, marginX + contentWidth, 7.5, { align: 'right' });

    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, 9.8, marginX + contentWidth, 9.8);
  };

  // =========================================================================
  // PAGE 1: EXECUTIVE COVER & SALES PERFORMANCE
  // =========================================================================
  doc.setFillColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.rect(0, 0, pageWidth, 3.5, 'F');
  doc.setFillColor(COLOR_GOLD[0], COLOR_GOLD[1], COLOR_GOLD[2]);
  doc.rect(0, 3.5, pageWidth, 1, 'F');

  let curY = 10;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('WMD SALES & COLLECTION REPORT', marginX, curY + 3);

  // Logo / Header Right
  if (logoInfo?.dataUrl) {
    const logoH = 11;
    const logoW = logoH * (logoInfo.aspectRatio || 1.8);
    try {
      doc.addImage(logoInfo.dataUrl, 'JPEG', marginX + contentWidth - logoW, curY - 2, logoW, logoH);
    } catch {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
      doc.text('WMD VENTURES', marginX + contentWidth, curY + 3, { align: 'right' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
    doc.text('WMD VENTURES', marginX + contentWidth, curY + 3, { align: 'right' });
  }

  curY += 11;

  // Metadata Card
  doc.setFillColor(COLOR_CARD_BG[0], COLOR_CARD_BG[1], COLOR_CARD_BG[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, curY, contentWidth, 8, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text('REPORTING PERIOD:', marginX + 3, curY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(`${selectedMonth.toUpperCase()} 2026`, marginX + 3, curY + 6.3);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text('PREPARED FOR:', marginX + 44, curY + 3.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text('Director', marginX + 44, curY + 6.3);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text('GENERATED ON:', marginX + 92, curY + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(`${dateFormatted}, ${timeFormatted}`, marginX + 92, curY + 6.3);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
  doc.text('GENERATED BY:', marginX + 140, curY + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(currentUserEmail || 'Admin User', marginX + 140, curY + 6.3);

  curY += 10.5;

  // Master KPI Grid
  const cardW = (contentWidth - 4) / 3;
  const cardH = 13;

  drawKpiCard(marginX, curY, cardW, cardH, `Sales Target (${selectedMonth})`, formatCurrency(salesSummary.totalTarget), `${salesSummary.totalStores} Outlets Managed`, COLOR_NAVY);
  drawKpiCard(
    marginX + cardW + 2,
    curY,
    cardW,
    cardH,
    'Actual Sales Achieved',
    formatCurrency(salesSummary.totalSales),
    salesSummary.overallSalesPercent !== null ? `${salesSummary.overallSalesPercent.toFixed(1)}% Quota Fulfilled` : 'No Target Data',
    salesSummary.overallSalesPercent >= 70 ? COLOR_GREEN : [217, 119, 6]
  );
  drawKpiCard(
    marginX + (cardW + 2) * 2,
    curY,
    cardW,
    cardH,
    'Remaining Sales Balance',
    formatCurrency(salesSummary.totalRemaining),
    salesSummary.totalRemaining === 0 ? 'Target Hit 100%!' : 'Quota Balance',
    salesSummary.totalRemaining === 0 ? COLOR_GREEN : COLOR_NAVY
  );

  curY += cardH + 2;

  drawKpiCard(marginX, curY, cardW, cardH, 'Payment Collected', formatCurrency(totalCollected), overallCollectionRate !== null ? `${overallCollectionRate.toFixed(1)}% Inflow Rate` : '-', COLOR_GREEN);
  drawKpiCard(marginX + cardW + 2, curY, cardW, cardH, 'Payment Pending', formatCurrency(totalPending), overallPendingRate !== null ? `${overallPendingRate.toFixed(1)}% Exposure Rate` : '-', totalPending > 0 ? COLOR_RED : COLOR_GREEN);
  drawKpiCard(marginX + (cardW + 2) * 2, curY, cardW, cardH, 'Online E-Commerce Sales', formatCurrency(totalOnlineSales), `Shopee: ${shopeePercent.toFixed(0)}% | TikTok: ${tiktokPercent.toFixed(0)}%`, [13, 148, 136]);

  curY += cardH + 3;

  // Combined Commercial Revenue Banner
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, curY, contentWidth, 5.5, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('TOTAL COMMERCIAL REVENUE:', marginX + 3.5, curY + 3.8);
  doc.setFontSize(8);
  doc.text(formatCurrency(combinedCommercialRevenue), marginX + contentWidth - 3.5, curY + 3.8, { align: 'right' });

  curY += 8;

  // Section 1: Sales Performance
  drawSectionHeader(
    curY,
    '1',
    `Sales Performance by Account Manager (${selectedMonth.toUpperCase()})`,
    salesSummary.topPic ? `Top Performer: ${salesSummary.topPic.name} (${salesSummary.topPic.percent?.toFixed(1)}%)` : ''
  );

  curY += 8;

  const salesTableHead = [['#', 'Account Manager', 'Stores', 'Target (RM)', 'Actual Sales (RM)', 'Balance (RM)', 'Achievement %', 'Status']];
  const salesTableBody = salesSummary.picList.map((p, idx) => [
    idx + 1,
    p.name,
    p.storeCount,
    formatCurrency(p.target),
    formatCurrency(p.sales),
    formatCurrency(p.remaining),
    p.percent !== null ? `${p.percent.toFixed(1)}%` : '-',
    p.statusLabel,
  ]);

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: salesTableHead,
    body: salesTableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val === 'Exceeded') data.cell.styles.textColor = COLOR_GREEN;
        else if (val === 'Needs Push') data.cell.styles.textColor = COLOR_RED;
      }
    },
  });

  curY = doc.lastAutoTable.finalY + 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text(`Top Performing Retail Outlets (${selectedMonth.toUpperCase()}):`, marginX, curY + 2.5);

  curY += 4.5;

  const topStoresHead = [['#', 'Retail Outlet / Store', 'Account Manager', 'Sales Achieved (RM)', 'Quota Rate %']];
  const topStoresBody = salesSummary.topStores.map((st, i) => [
    i + 1,
    st.store,
    st.person,
    formatCurrency(st.sales),
    st.salesPercent !== null ? `${st.salesPercent.toFixed(1)}%` : '-',
  ]);

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: topStoresHead,
    body: topStoresBody.length > 0 ? topStoresBody : [['-', 'No store sales recorded for this month', '-', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [40, 70, 115],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 72, fontStyle: 'bold' },
      2: { cellWidth: 41 },
      3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 26, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // =========================================================================
  // PAGE 2: COLLECTION TRACKING & ONLINE E-COMMERCE
  // =========================================================================
  doc.addPage();
  drawRunningHeader('Collection Recovery & Online E-Commerce');

  curY = 13;

  // SECTION 2: COLLECTION TRACKING
  drawSectionHeader(curY, '2', 'Collection Tracking & Outstanding Payment Recovery');
  curY += 8;

  const colCardW = (contentWidth - 4.5) / 4;
  const colCardH = 12.5;

  drawKpiCard(marginX, curY, colCardW, colCardH, 'Total Collected', formatCurrency(totalCollected), overallCollectionRate !== null ? `${overallCollectionRate.toFixed(1)}% Inflow Rate` : '-', COLOR_GREEN);
  drawKpiCard(marginX + colCardW + 1.5, curY, colCardW, colCardH, 'Total Pending', formatCurrency(totalPending), overallPendingRate !== null ? `${overallPendingRate.toFixed(1)}% Outstanding` : '-', totalPending > 0 ? COLOR_RED : COLOR_GREEN);
  drawKpiCard(marginX + (colCardW + 1.5) * 2, curY, colCardW, colCardH, 'Customer Accounts', totalCustomers, `${topPendingCustomers.length} Priority Accounts`, COLOR_NAVY);
  drawKpiCard(
    marginX + (colCardW + 1.5) * 3,
    curY,
    colCardW,
    colCardH,
    'Leading Collection AM',
    topCollectionAM ? topCollectionAM.name : '-',
    topCollectionAM ? `${topCollectionAM.collectionPercent?.toFixed(1)}% Rate` : '-',
    COLOR_GREEN
  );

  curY += colCardH + 3;

  const collectionTableHead = [['#', 'Account Manager', 'Accounts', 'Payment Collected (RM)', 'Payment Pending (RM)', 'Collected %', 'Pending %', 'Status']];
  const collectionTableBody = collectionPicList.map((p, idx) => [
    idx + 1,
    p.name,
    p.customerCount,
    formatCurrency(p.collected),
    formatCurrency(p.pending),
    p.collectionPercent !== null ? `${p.collectionPercent.toFixed(1)}%` : '-',
    p.pendingPercent !== null ? `${p.pendingPercent.toFixed(1)}%` : '-',
    p.statusLabel,
  ]);

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: collectionTableHead,
    body: collectionTableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 21, halign: 'right' },
      6: { cellWidth: 19, halign: 'right' },
      7: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 3) data.cell.styles.textColor = COLOR_GREEN;
        if (data.column.index === 4 && Number(data.cell.raw?.replace?.(/[^0-9.]/g, '')) > 0) {
          data.cell.styles.textColor = COLOR_RED;
        }
      }
    },
  });

  curY = doc.lastAutoTable.finalY + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_RED[0], COLOR_RED[1], COLOR_RED[2]);
  doc.text('Key Pending Customer Accounts (High Attention Required):', marginX, curY + 2.5);

  curY += 4.5;

  const topPendingHead = [['#', 'Customer Name / Entity', 'Account Manager', 'Pending Amount (RM)', 'Collected (RM)', 'Recovery Status']];
  const topPendingBody = topPendingCustomers.map((cust, i) => [
    i + 1,
    cust.customer,
    cust.person,
    formatCurrency(cust.pending),
    formatCurrency(cust.collected),
    cust.collectionRate !== null ? `${cust.collectionRate.toFixed(0)}% Collected` : 'Uncollected',
  ]);

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: topPendingHead,
    body: topPendingBody.length > 0 ? topPendingBody : [['-', 'No outstanding pending balances detected', '-', '-', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [153, 27, 27],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 72, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = COLOR_RED;
      }
    },
  });

  curY = doc.lastAutoTable.finalY + 5;

  // SECTION 3: ONLINE E-COMMERCE PERFORMANCE
  drawSectionHeader(curY, '3', 'Online E-Commerce Performance (Shopee & TikTok Shop)', `Active Days: ${activeDaysCount} Days`);
  curY += 8;

  drawKpiCard(marginX, curY, colCardW, colCardH, 'Total Online Sales', formatCurrency(totalOnlineSales), 'Gross Revenue', [13, 148, 136]);
  drawKpiCard(marginX + colCardW + 1.5, curY, colCardW, colCardH, 'Daily Avg Revenue', formatCurrency(dailyOnlineAverage), `${activeDaysCount} Active Days`, COLOR_NAVY);
  drawKpiCard(marginX + (colCardW + 1.5) * 2, curY, colCardW, colCardH, 'Highest Peak Day', formatCurrency(peakDay?.total), peakDay ? `${peakDay.date}` : '-', COLOR_GREEN);
  drawKpiCard(
    marginX + (colCardW + 1.5) * 3,
    curY,
    colCardW,
    colCardH,
    'Top E-Commerce App',
    tiktokTotal >= shopeeTotal ? 'TikTok Shop' : 'Shopee',
    `${Math.max(tiktokPercent, shopeePercent).toFixed(1)}% Share`,
    COLOR_NAVY
  );

  curY += colCardH + 3;

  // Platform Breakdown Table
  const onlineTableHead = [['E-Commerce Platform', 'Gross Sales (RM)', 'Contribution %', 'Daily Average (RM)', 'Active Days']];
  const onlineTableBody = [
    ['Shopee Official Store', formatCurrency(shopeeTotal), `${shopeePercent.toFixed(1)}%`, formatCurrency(activeDaysCount > 0 ? shopeeTotal / activeDaysCount : 0), `${activeDaysCount} Days`],
    ['TikTok Shop', formatCurrency(tiktokTotal), `${tiktokPercent.toFixed(1)}%`, formatCurrency(activeDaysCount > 0 ? tiktokTotal / activeDaysCount : 0), `${activeDaysCount} Days`],
    ['Combined E-Commerce Total', formatCurrency(totalOnlineSales), '100.0%', formatCurrency(dailyOnlineAverage), `${activeDaysCount} Days`],
  ];

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: onlineTableHead,
    body: onlineTableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.4,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_NAVY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 22, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 244, 249];
      }
    },
  });

  curY = doc.lastAutoTable.finalY + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_NAVY[0], COLOR_NAVY[1], COLOR_NAVY[2]);
  doc.text('Top Revenue Generating Days in Month:', marginX, curY + 2.5);

  curY += 4.5;

  const topDaysHead = [['#', 'Sales Date', 'Shopee Official Store (RM)', 'TikTok Shop (RM)', 'Daily Gross Sales (RM)']];
  const topDaysBody = topDays.map((d, i) => [
    i + 1,
    d.date,
    formatCurrency(d.shopee),
    formatCurrency(d.tiktok),
    formatCurrency(d.total),
  ]);

  renderTable(doc, {
    startY: curY,
    margin: { left: marginX, right: marginX },
    head: topDaysHead,
    body: topDaysBody.length > 0 ? topDaysBody : [['-', 'No daily e-commerce records found', '-', '-', '-']],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 6.5,
      cellPadding: 1.3,
      textColor: COLOR_TEXT_DARK,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.5,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 43, fontStyle: 'bold' },
      2: { cellWidth: 44, halign: 'right' },
      3: { cellWidth: 44, halign: 'right' },
      4: { cellWidth: 44, halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // =========================================================================
  // GLOBAL PAGE FOOTERS (Page X of Y)
  // =========================================================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 9, marginX + contentWidth, pageHeight - 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(COLOR_TEXT_MUTED[0], COLOR_TEXT_MUTED[1], COLOR_TEXT_MUTED[2]);
    doc.text('WMD Sales & Collection Management System', marginX, pageHeight - 5.5);
    doc.text(`Page ${i} of ${totalPages}`, marginX + contentWidth, pageHeight - 5.5, { align: 'right' });
  }

  const filename = `WMD_Sales_and_Collection_Report_${selectedMonth.toUpperCase()}_2026.pdf`;
  doc.save(filename);

  return {
    success: true,
    filename,
    pages: totalPages,
  };
}