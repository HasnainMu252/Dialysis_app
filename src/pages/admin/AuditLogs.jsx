import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { auditApi } from '../../api/auditApi';

const badge = (status) => (status === 'failed'
  ? 'bg-red-100 text-red-700'
  : 'bg-green-100 text-green-700');

const methodColor = (m) => ({
  POST: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-amber-100 text-amber-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  GET: 'bg-slate-100 text-slate-600',
}[m] || 'bg-slate-100 text-slate-600');

export default function AuditLogs() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1, entities: [] });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [entity, setEntity] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (goToPage = page) => {
    setLoading(true);
    try {
      const params = { page: goToPage, limit: 15 };
      if (q) params.q = q;
      if (entity) params.entity = entity;
      if (status) params.status = status;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await auditApi.list(params);
      setItems(res.data?.data || []);
      setMeta(res.data?.meta || { total: 0, page: 1, pages: 1, entities: [] });
      setPage(res.data?.meta?.page || goToPage);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [entity, status, from, to]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Trail"
        subtitle="Read-only, append-only record of every change and PHI document access, for HIPAA accountability."
      />

      <div className="card grid gap-3 p-4 md:grid-cols-6">
        <input className="input md:col-span-2" placeholder="Search user, action, IP, path" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(1)} />
        <select className="input" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All areas</option>
          {(meta.entities || []).map((en) => <option key={en} value={en}>{en}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Path</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((log) => (
              <tr key={log._id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-semibold text-slate-800">{log.user?.name || log.userEmail || 'Unknown'}</div>
                  <div className="text-xs text-slate-500">{log.userRole || '-'}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${methodColor(log.method)}`}>{log.method || '-'}</span>
                  <span className="text-xs font-semibold text-slate-700">{log.action}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.entity || '-'}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-xs text-slate-500" title={log.path}>{log.path || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${badge(log.status)}`}>{log.statusCode || log.status}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && !loading && <EmptyState message="No audit records match these filters" />}
        <div className="p-2">
          <Pagination page={meta.page} pageCount={meta.pages} total={meta.total} onPage={(p) => load(p)} label="events" />
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={14} /> Audit records are append-only and cannot be edited or deleted from the app.</p>
    </div>
  );
}
