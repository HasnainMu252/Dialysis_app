import ExcelJS from 'exceljs';

const NAVY = 'FF1E3A8A';
const SLATE = 'FF0F172A';
const LIGHT = 'FFF1F5F9';
const TOTAL = 'FFFEF3C7';

const thin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
const border = { top: thin, left: thin, bottom: thin, right: thin };

const patientName = (p) => (p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '-');
const shiftOf = (d) => {
  if (!d) return '-';
  const h = new Date(d).getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};
const dstr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-');
const tstr = (d) => (d ? new Date(d).toISOString().slice(11, 16) : '-');

const fillRow = (row, argb) => { row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }); };
const borderRow = (row) => { row.eachCell((c) => { c.border = border; }); };

/**
 * Build a professional, session-grouped medication workbook.
 * meds: array of populated medication docs (patient, session, name, dose, unit, route, quantity, date/administrationTime, givenByName)
 */
export const buildMedicationWorkbook = async (meds, month, year) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Dialysis CRM';
  wb.created = new Date();

  // ---- group by session ----
  const groups = new Map();
  meds.forEach((m) => {
    const key = m.session?._id?.toString() || m.session?.toString() || `nosession:${m.patient?._id || m.patientMrn}:${dstr(m.date)}`;
    if (!groups.has(key)) groups.set(key, { session: m.session, patient: m.patient, patientMrn: m.patientMrn, meds: [] });
    groups.get(key).meds.push(m);
  });
  // order sessions by date (newest first)
  const sessions = Array.from(groups.values()).sort((a, b) => {
    const da = a.session?.completedAt || a.session?.startedAt || a.meds[0]?.date || 0;
    const db = b.session?.completedAt || b.session?.startedAt || b.meds[0]?.date || 0;
    return new Date(db) - new Date(da);
  });

  const ws = wb.addWorksheet('Medication Sessions', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  // report title (row 1, frozen)
  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = `Medication Administration Report  —  ${String(month).padStart(2, '0')}/${year}`;
  title.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  ws.getRow(1).height = 26;

  let r = 3;
  const medTotals = {}; // name -> {qty, count}

  sessions.forEach((g, idx) => {
    const s = g.session || {};
    const sessionDate = s.completedAt || s.startedAt || g.meds[0]?.date;
    const sessionTime = s.startedAt || g.meds[0]?.administrationTime || g.meds[0]?.date;
    const nurse = g.meds.find((m) => m.givenByName)?.givenByName || '-';

    // ---- session heading (merged) ----
    ws.mergeCells(`A${r}:G${r}`);
    const h = ws.getCell(`A${r}`);
    h.value = `Dialysis Session #${idx + 1}`;
    h.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    h.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
    ws.getRow(r).height = 22;
    r += 1;

    // ---- session info table ----
    const infoHead = ws.getRow(r);
    infoHead.values = ['Patient', 'MRN', 'Date', 'Time', 'Nurse', 'Shift'];
    infoHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fillRow(infoHead, NAVY); borderRow(infoHead);
    r += 1;
    const infoRow = ws.getRow(r);
    infoRow.values = [patientName(g.patient), g.patient?.mrn || g.patientMrn || '-', dstr(sessionDate), tstr(sessionTime), nurse, shiftOf(sessionTime)];
    borderRow(infoRow);
    r += 2;

    // ---- medication table ----
    const medHead = ws.getRow(r);
    medHead.values = ['#', 'Medication', 'Dose', 'Unit', 'Route', 'Qty', 'Time', 'Status', 'Stopped / Note'];
    medHead.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    fillRow(medHead, NAVY); borderRow(medHead);
    r += 1;

    g.meds
      .sort((a, b) => new Date(a.administrationTime || a.date) - new Date(b.administrationTime || b.date))
      .forEach((m, i) => {
        const st = m.status || 'active';
        const statusLabel = st === 'cancelled' ? 'Stopped' : st === 'deleted' ? 'Removed' : 'Active';
        const trail = st === 'cancelled'
          ? `${m.cancelReason ? m.cancelReason : 'Stopped'}${m.cancelledByName ? ` — ${m.cancelledByName}` : ''}${m.cancelledAt ? ` (${dstr(m.cancelledAt)} ${tstr(m.cancelledAt)})` : ''}`
          : st === 'deleted'
            ? `Removed${m.deletedByName ? ` — ${m.deletedByName}` : ''}${m.deletedAt ? ` (${dstr(m.deletedAt)})` : ''}`
            : '';
        const row = ws.getRow(r);
        row.values = [i + 1, m.name, m.dose, m.unit, m.route, m.quantity, tstr(m.administrationTime || m.date), statusLabel, trail];
        borderRow(row);
        if (i % 2 === 1) fillRow(row, LIGHT);
        // Colour the status cell
        const stCell = row.getCell(8);
        if (st === 'cancelled') stCell.font = { bold: true, color: { argb: 'FFB45309' } };
        else if (st === 'deleted') stCell.font = { bold: true, color: { argb: 'FF64748B' } };
        else stCell.font = { color: { argb: 'FF047857' } };
        r += 1;
        const key = m.name || 'Unknown';
        medTotals[key] = medTotals[key] || { qty: 0, count: 0, unit: m.unit };
        medTotals[key].qty += (Number(m.dose) || 0) * (Number(m.quantity) || 1);
        medTotals[key].count += 1;
      });

    // ---- total for session ----
    ws.mergeCells(`A${r}:H${r}`);
    const totCell = ws.getCell(`A${r}`);
    totCell.value = 'Total Medications';
    totCell.font = { bold: true };
    totCell.alignment = { horizontal: 'right', indent: 1 };
    const totVal = ws.getCell(`I${r}`);
    totVal.value = g.meds.length;
    totVal.font = { bold: true };
    ws.getRow(r).eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL } }; c.border = border; });
    r += 2; // gap before next session
  });

  // auto-fit columns
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell({ includeEmpty: true }, (c) => { const v = c.value == null ? '' : String(c.value); max = Math.max(max, v.length + 2); });
    col.width = Math.min(max, 42);
  });

  // ---------- Monthly Summary sheet ----------
  const sum = wb.addWorksheet('Monthly Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });
  sum.mergeCells('A1:C1');
  const st = sum.getCell('A1');
  st.value = `Monthly Summary  —  ${String(month).padStart(2, '0')}/${year}`;
  st.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  st.alignment = { vertical: 'middle', horizontal: 'center' };
  st.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sum.getRow(1).height = 26;

  let sr = 3;
  const totalMeds = Object.values(medTotals).reduce((a, m) => a + m.count, 0);
  [['Total Dialysis Sessions', sessions.length], ['Total Medications Administered', totalMeds]].forEach(([label, val]) => {
    const row = sum.getRow(sr);
    row.values = [label, val];
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { bold: true, color: { argb: NAVY } };
    sr += 1;
  });
  sr += 1;

  const head = sum.getRow(sr);
  head.values = ['Medication', 'Total Dose/Qty', 'Times Given'];
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  fillRow(head, SLATE); borderRow(head);
  sr += 1;
  Object.entries(medTotals).sort((a, b) => b[1].count - a[1].count).forEach(([name, m], i) => {
    const row = sum.getRow(sr);
    row.values = [name, `${m.qty} ${m.unit || ''}`.trim(), m.count];
    borderRow(row);
    if (i % 2 === 1) fillRow(row, LIGHT);
    sr += 1;
  });

  sum.columns.forEach((col) => {
    let max = 14;
    col.eachCell({ includeEmpty: true }, (c) => { const v = c.value == null ? '' : String(c.value); max = Math.max(max, v.length + 2); });
    col.width = Math.min(max, 40);
  });

  return wb;
};
