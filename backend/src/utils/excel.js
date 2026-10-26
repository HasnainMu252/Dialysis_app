import ExcelJS from 'exceljs';

// Aegle theme colours (ARGB for ExcelJS).
const NAVY = 'FF123B5D';
const TEAL = 'FF087E8B';
const ROW_ALT = 'FFF4F7FB';
const BORDER = 'FFD6E0EC';

const thin = { style: 'thin', color: { argb: BORDER } };
const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

/**
 * Build a themed, boxed, aligned worksheet inside a workbook.
 * columns: [{ header, key, width? }]   rows: [{ [key]: value }]
 * Produces: a title band, a navy header row, bordered cells, zebra striping,
 * sensible column widths and a frozen header — the Aegle "boxes" look.
 */
export function addStyledSheet(workbook, { title, sheetName = 'Report', columns = [], rows = [] }) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: title ? 3 : 1 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' },
  });

  const colCount = Math.max(columns.length, 1);
  ws.columns = columns.map((c) => ({
    key: c.key,
    width: c.width || Math.min(40, Math.max(12, String(c.header || c.key).length + 4)),
  }));

  let headerRowIndex = 1;

  if (title) {
    // Title band across all columns.
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 26;

    // Sub-band: generated timestamp + row count.
    ws.mergeCells(2, 1, 2, colCount);
    const sub = ws.getCell(2, 1);
    sub.value = `Generated ${new Date().toLocaleString()}  ·  ${rows.length} record${rows.length === 1 ? '' : 's'}`;
    sub.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    headerRowIndex = 3;
  }

  // Header row.
  const headerRow = ws.getRow(headerRowIndex);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header || c.key;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = allBorders;
  });
  headerRow.height = 22;

  // Data rows.
  rows.forEach((r, ri) => {
    const row = ws.getRow(headerRowIndex + 1 + ri);
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      const v = r[c.key];
      cell.value = v === undefined || v === null ? '' : v;
      const isNum = typeof v === 'number';
      cell.alignment = { vertical: 'middle', horizontal: isNum ? 'center' : 'left', wrapText: false, indent: isNum ? 0 : 1 };
      cell.font = { size: 10, color: { argb: 'FF1E293B' } };
      cell.border = allBorders;
      if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
    });
    row.height = 18;
  });

  // Teal accent underline on the header (thicker bottom border).
  columns.forEach((_, i) => {
    headerRow.getCell(i + 1).border = { ...allBorders, bottom: { style: 'medium', color: { argb: TEAL } } };
  });

  return ws;
}

/** Stream a workbook to the HTTP response as an .xlsx download. */
export async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** One-shot helper: build a single-sheet themed workbook and stream it. */
export async function sendStyledExcel(res, { title, sheetName, columns, rows, filename }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Azusa Dialysis — Aegle';
  workbook.created = new Date();
  addStyledSheet(workbook, { title, sheetName, columns, rows });
  await sendWorkbook(res, workbook, filename || 'report.xlsx');
}
