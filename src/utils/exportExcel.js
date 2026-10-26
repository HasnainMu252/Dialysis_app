import api from '../api/axios';
import toast from 'react-hot-toast';

/*
 * Download a themed .xlsx of a table the user is viewing. Sends the already
 * filtered columns + rows to the backend, which returns the Aegle-styled file
 * (navy header, boxed cells, aligned). columns: [{header,key,width?}].
 */
export async function downloadExcel({ title, sheetName, filename, columns, rows }) {
  if (!rows || !rows.length) { toast.error('Nothing to export'); return; }
  try {
    const res = await api.post('/exports/excel', { title, sheetName, filename, columns, rows }, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (filename || 'report').replace(/\.(csv|xlsx)?$/, '') + '.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    toast.error(e?.response?.data?.message || 'Export failed');
  }
}
