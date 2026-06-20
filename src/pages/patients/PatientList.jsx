import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { patientApi } from '../../api/patientApi';
import { useAuth } from '../../context/AuthContext';
import { canEditPatient } from '../../utils/permissions';
import StatusBadge from '../../components/ui/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Pagination, { usePagedList } from '../../components/common/Pagination';
import { personName } from '../../utils/format';

const patientKey = (p) => p._id || p.id;

export default function PatientList() {
  const { user } = useAuth();
  const allowEdit = canEditPatient(user?.role);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const selectedPatients = useMemo(() => items.filter((p) => selected[patientKey(p)]), [items, selected]);
  const allSelected = items.length > 0 && selectedPatients.length === items.length;

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientApi.list(search ? { search } : {});
      setItems(res.data?.data || []);
      setTotal(res.data?.meta?.total ?? (res.data?.data || []).length);
      setSelected({});
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleAll = () => {
    if (allSelected) return setSelected({});
    const next = {};
    items.forEach((p) => { next[patientKey(p)] = true; });
    setSelected(next);
  };

  const toggleOne = (p) => setSelected((prev) => ({ ...prev, [patientKey(p)]: !prev[patientKey(p)] }));

  const [exporting, setExporting] = useState(false);
  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await patientApi.exportExcel(search ? { search } : {});
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `patients-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await patientApi.bulkUpload(file);
      toast.success(res.data?.message || 'Bulk upload completed');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const bulkDelete = async () => {
    if (!selectedPatients.length) return toast.error('Select patients first');
    if (!window.confirm(`Delete ${selectedPatients.length} selected patient(s)?`)) return;
    try {
      const ids = selectedPatients.map((p) => p._id).filter(Boolean);
      const mrns = selectedPatients.map((p) => String(p.mrn || '').trim()).filter(Boolean);
      const res = await patientApi.bulkDelete({ ids, mrns });
      toast.success(res.data?.message || 'Patients deleted');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bulk delete failed');
    }
  };

  const deleteOne = async (p) => {
    if (!window.confirm(`Delete ${personName(p)}?`)) return;
    try {
      await patientApi.delete(p._id);
      toast.success('Patient deleted');
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Delete failed');
    }
  };


  const { paged: pagedItems, page, setPage, total: pagedTotal, pageCount } = usePagedList(items, '', []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Patients"
        subtitle="Registration, bulk upload, bulk delete, schedule and treatment history."
        action={allowEdit ? <Link to="/patients/new" className="btn-primary">Add Patient</Link> : null}
      />

      <div className="card grid gap-3 p-4 lg:grid-cols-6">
        <input className="input lg:col-span-2" placeholder="Search by name, phone, MRN, member ID or payer" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
        <button className="btn-light" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
        {['admin', 'insurance_person', 'front_desk', 'biller'].includes(user?.role) && (
          <button className="btn-light" type="button" onClick={exportExcel} disabled={exporting}>{exporting ? 'Exporting...' : 'Export Excel'}</button>
        )}
        {allowEdit && <button className="btn-light" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading...' : 'Bulk Excel Upload'}</button>}
        {allowEdit && <button className="btn-light" type="button" onClick={toggleAll}>{allSelected ? 'Unselect All' : 'Select All'}</button>}
        {allowEdit && <button className="btn-danger" type="button" onClick={bulkDelete} disabled={!selectedPatients.length}>Delete Selected ({selectedPatients.length})</button>}
        <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={uploadFile} />
      </div>

      <div className="hidden card overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              {allowEdit && <th className="p-3">Select</th>}<th>MRN</th><th>Name</th><th>Phone</th><th>Address</th><th>Insurance/Payer</th><th>Coverage</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((p) => (
              <tr key={patientKey(p)} className="border-b last:border-0">
                {allowEdit && <td className="p-3"><input type="checkbox" checked={!!selected[patientKey(p)]} onChange={() => toggleOne(p)} /></td>}
                <td className="font-semibold">{p.mrn}</td>
                <td>{personName(p)}</td>
                <td>{p.phone}</td>
                <td>{p.address || '-'}</td>
                <td>{p.insurance?.payerName || p.insurance?.providerName || '-'}<br/><span className="text-xs text-slate-500">{p.insurance?.memberId || p.insurance?.policyNumber || '-'}</span></td>
                <td><StatusBadge status={p.insurance?.coverageStatus || p.insurance?.approvalStatus || 'not_submitted'} /></td>
                <td className="space-x-3 whitespace-nowrap"><Link className="font-medium text-blue-600" to={user?.role === 'doctor' ? `/doctor/patients/${p._id}` : `/patients/${p.mrn || p._id}`}>{allowEdit ? 'View/Edit' : 'View'}</Link>{user?.role === 'doctor' && <Link className="font-bold text-emerald-600" to={`/doctor/patients/${p._id}?tab=doctor%20rounds&addRound=1`}>Add SOAP</Link>}{allowEdit && <button className="text-red-600" onClick={() => deleteOne(p)}>Delete</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {pagedItems.map((p) => (
          <div className="card p-4" key={patientKey(p)}>
            <div className="flex justify-between gap-3">
              <div className="flex gap-3">{allowEdit && <input type="checkbox" checked={!!selected[patientKey(p)]} onChange={() => toggleOne(p)} />}<div><b>{personName(p)}</b><p className="text-xs text-slate-500">{p.mrn} • {p.phone}</p></div></div>
              <StatusBadge status={p.insurance?.coverageStatus || p.insurance?.approvalStatus || 'not_submitted'} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.address || 'No address'} • {p.insurance?.payerName || p.insurance?.providerName || 'No payer'}</p>
            <div className="mt-3 flex flex-wrap gap-3"><Link className="font-medium text-blue-600" to={user?.role === 'doctor' ? `/doctor/patients/${p._id}` : `/patients/${p.mrn || p._id}`}>{allowEdit ? 'View/Edit' : 'View'}</Link>{user?.role === 'doctor' && <Link className="font-bold text-emerald-600" to={`/doctor/patients/${p._id}?tab=doctor%20rounds&addRound=1`}>Add SOAP</Link>}{allowEdit && <button className="text-red-600" onClick={() => deleteOne(p)}>Delete</button>}</div>
          </div>
        ))}
      </div>
      {!items.length && !loading && <EmptyState message="No patients found" />}

      <Pagination page={page} pageCount={pageCount} total={pagedTotal} onPage={setPage} label="patients" />
    </div>
  );
}
