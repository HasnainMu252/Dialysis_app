import ExcelJS from 'exceljs';

const BLUE = 'FF1D4ED8';
const LIGHT = 'FFEFF4FF';
const GREY = 'FFF1F5F9';

const styleHeaderRow = (row) => {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  row.height = 20;
};

const border = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };
};

/**
 * Build a Medication Usage workbook.
 * @param {object} usage - { scopeLabel, patientName, totals[], byPatient[], grand }
 *   totals[]:   { name, unit, totalDose, totalQty, administrations, patients }
 *   byPatient[]:{ patientName, mrn, administrations, totalQty, meds: [{name, unit, totalDose, totalQty}] }
 *   grand:      { administrations, patients, medications }
 */
export async function buildMedicationUsageWorkbook(usage) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dialysis Management System';
  wb.created = new Date();

  /* ------------- Sheet 1: Usage Totals ------------- */
  const ws = wb.addWorksheet('Medication Usage', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'Dialysis Medication Usage Report';
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: BLUE } };
  ws.getCell('A1').alignment = { horizontal: 'left' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `${usage.scopeLabel}${usage.patientName ? ` — ${usage.patientName}` : ' — All patients'}`;
  ws.getCell('A2').font = { size: 11, color: { argb: 'FF475569' } };

  ws.mergeCells('A3:F3');
  ws.getCell('A3').value =
    `Total administrations: ${usage.grand.administrations}   |   Distinct medications: ${usage.grand.medications}   |   Patients: ${usage.grand.patients}`;
  ws.getCell('A3').font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };

  const head = ws.getRow(4);
  head.values = ['Medication', 'Unit', 'Total Dose', 'Total Quantity', 'Administrations', 'Patients'];
  styleHeaderRow(head);
  ws.columns = [
    { key: 'name', width: 26 },
    { key: 'unit', width: 10 },
    { key: 'dose', width: 14 },
    { key: 'qty', width: 16 },
    { key: 'admins', width: 16 },
    { key: 'patients', width: 12 },
  ];

  let r = 5;
  (usage.totals || []).forEach((t, i) => {
    const row = ws.getRow(r++);
    row.values = [t.name, t.unit || '', t.totalDose, t.totalQty, t.administrations, t.patients];
    if (i % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }; });
    row.eachCell((c, col) => { border(c); if (col >= 3) c.alignment = { horizontal: 'center' }; });
  });
  if (!(usage.totals || []).length) {
    const row = ws.getRow(r++);
    row.getCell(1).value = 'No medications recorded for this period.';
    row.getCell(1).font = { italic: true, color: { argb: 'FF94A3B8' } };
  }

  /* ------------- Sheet 2: By Patient ------------- */
  const ws2 = wb.addWorksheet('By Patient', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const head2 = ws2.getRow(1);
  head2.values = ['Patient', 'MRN', 'Medications (dose × qty)', 'Administrations', 'Total Quantity'];
  styleHeaderRow(head2);
  ws2.columns = [
    { key: 'p', width: 26 },
    { key: 'mrn', width: 16 },
    { key: 'meds', width: 60 },
    { key: 'admins', width: 16 },
    { key: 'qty', width: 16 },
  ];

  let r2 = 2;
  (usage.byPatient || []).forEach((p, i) => {
    const medStr = (p.meds || [])
      .map((m) => `${m.name} ${m.totalDose}${m.unit ? ` ${m.unit}` : ''} × ${m.totalQty}`)
      .join('; ');
    const row = ws2.getRow(r2++);
    row.values = [p.patientName, p.mrn, medStr, p.administrations, p.totalQty];
    if (i % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREY } }; });
    row.eachCell((c, col) => { border(c); if (col >= 4) c.alignment = { horizontal: 'center' }; });
    row.getCell(3).alignment = { wrapText: true, vertical: 'top' };
  });
  if (!(usage.byPatient || []).length) {
    ws2.getCell('A2').value = 'No patient activity for this period.';
    ws2.getCell('A2').font = { italic: true, color: { argb: 'FF94A3B8' } };
  }

  /* ------------- Sheet 3: By Date (date-wise) ------------- */
  const ws3 = wb.addWorksheet('By Date', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const head3 = ws3.getRow(1);
  head3.values = ['Date', 'Medications (dose × qty)', 'Administrations', 'Total Quantity', 'Patients'];
  styleHeaderRow(head3);
  ws3.columns = [
    { key: 'd', width: 16 },
    { key: 'meds', width: 60 },
    { key: 'admins', width: 16 },
    { key: 'qty', width: 16 },
    { key: 'pat', width: 12 },
  ];
  let r3 = 2;
  (usage.byDate || []).forEach((d, i) => {
    const medStr = (d.meds || []).map((m) => `${m.name} ${m.totalDose}${m.unit ? ` ${m.unit}` : ''} × ${m.totalQty}`).join('; ');
    const row = ws3.getRow(r3++);
    row.values = [d.date, medStr, d.administrations, d.totalQty, d.patients];
    if (i % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }; });
    row.eachCell((c, col) => { border(c); if (col >= 3) c.alignment = { horizontal: 'center' }; });
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });
  if (!(usage.byDate || []).length) {
    ws3.getCell('A2').value = 'No activity for this period.';
    ws3.getCell('A2').font = { italic: true, color: { argb: 'FF94A3B8' } };
  }

  /* ------------- Sheet 4: Lifecycle events (added / stopped / removed) ------------- */
  const ws4 = wb.addWorksheet('Med Changes', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const head4 = ws4.getRow(1);
  head4.values = ['When', 'Event', 'Source', 'Medication', 'Patient', 'MRN', 'By', 'Reason'];
  styleHeaderRow(head4);
  ws4.columns = [
    { key: 'when', width: 20 }, { key: 'event', width: 12 }, { key: 'source', width: 12 },
    { key: 'med', width: 22 }, { key: 'pat', width: 22 }, { key: 'mrn', width: 14 },
    { key: 'by', width: 22 }, { key: 'reason', width: 26 },
  ];
  let r4 = 2;
  (usage.events || []).forEach((e, i) => {
    const label = e.kind === 'added' ? 'Added' : e.kind === 'stopped' ? 'Stopped' : 'Removed';
    const row = ws4.getRow(r4++);
    row.values = [
      e.at ? new Date(e.at).toLocaleString() : '',
      label,
      e.source === 'home' ? 'Home' : 'Dialysis',
      `${e.medication}${e.dose ? ` ${e.dose}${e.unit ? ` ${e.unit}` : ''}` : ''}`,
      e.patientName, e.mrn,
      `${e.byName || ''}${e.byRole ? ` (${e.byRole})` : ''}`,
      e.reason || '',
    ];
    if (i % 2 === 1) row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }; });
    row.eachCell((c) => border(c));
  });
  if (!(usage.events || []).length) {
    ws4.getCell('A2').value = 'No medication changes in this period.';
    ws4.getCell('A2').font = { italic: true, color: { argb: 'FF94A3B8' } };
  }

  return wb;
}
