import asyncHandler from 'express-async-handler';
import { ApiError } from '../utils/apiError.js';
import { sendStyledExcel } from '../utils/excel.js';
import { writeAudit } from '../utils/audit.js';

/**
 * POST /api/v1/exports/excel
 * Generic themed Excel export. The client sends the already-filtered table it is
 * showing; the server returns a styled .xlsx (navy header, boxed, aligned).
 * body: { title, sheetName, filename, columns: [{header,key,width?}], rows: [obj] }
 */
export const exportExcel = asyncHandler(async (req, res) => {
  const { title = 'Report', sheetName = 'Report', filename = 'report.xlsx', columns = [], rows = [] } = req.body || {};

  if (!Array.isArray(columns) || !columns.length) throw new ApiError(400, 'columns are required');
  if (!Array.isArray(rows)) throw new ApiError(400, 'rows must be an array');
  if (rows.length > 20000) throw new ApiError(400, 'Too many rows for a direct export (max 20000)');

  // Normalise columns: accept {header,key,width} or a bare string.
  const cols = columns.map((c) => (typeof c === 'string' ? { header: c, key: c } : { header: c.header || c.key, key: c.key || c.header, width: c.width }));

  await writeAudit({ user: req.user, action: 'export.excel', entity: 'Report', details: { title, rows: rows.length } });

  await sendStyledExcel(res, { title, sheetName, columns: cols, rows, filename });
});
