import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { chairApi } from '../../api/chairApi';
import { chairClearanceApi } from '../../api/chairClearanceApi';
import StatusBadge from '../../components/ui/StatusBadge';

const makeChecklist = (status) => ({
  chairChecked: true,
  machineChecked: true,
  filterChecked: status === 'available',
  solutionChecked: status === 'available',
  cleaned: status === 'available',
  safeForUse: status === 'available',
});

export default function ChairClearance() {
  const [chairs, setChairs] = useState([]);
  const [history, setHistory] = useState([]);
  const [chairCode, setChairCode] = useState('');
  const [status, setStatus] = useState('available');
  const [notes, setNotes] = useState('Chair cleaned and ready for next patient.');
  const [checklist, setChecklist] = useState(makeChecklist('available'));

  const load = () => {
    chairApi.list().then((res) => setChairs(res.data?.data || []));
    chairClearanceApi.list().then((res) => setHistory(res.data?.data || []));
  };

  useEffect(() => { load(); }, []);

  const changeStatus = (value) => {
    setStatus(value);
    setChecklist(makeChecklist(value));
    if (value === 'maintenance') setNotes('Issue found. Chair moved to maintenance.');
    if (value === 'available') setNotes('Chair cleaned and ready for next patient.');
    if (value === 'cleaning') setNotes('Chair cleaning in progress.');
    if (value === 'out_of_order') setNotes('Chair not safe for treatment.');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!chairCode) return toast.error('Select chair');
    try {
      await chairClearanceApi.create(chairCode, { status, notes, checklist });
      toast.success('Chair clearance saved');
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save chair clearance');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Chair Clearance / Maintenance</h1>
        <p className="text-sm text-slate-500">Separate from 5-step treatment clearance.</p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Chair</label>
            <select className="input" value={chairCode} onChange={(e) => setChairCode(e.target.value)}>
              <option value="">Select Chair</option>
              {chairs.map((chair) => (
                <option key={chair._id} value={chair.code || chair.chairNumber}>
                  {chair.code || chair.chairNumber} - {chair.status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">New Status</label>
            <select className="input" value={status} onChange={(e) => changeStatus(e.target.value)}>
              <option value="available">available</option>
              <option value="maintenance">maintenance</option>
              <option value="cleaning">cleaning</option>
              <option value="out_of_order">out_of_order</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(checklist).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border p-3 text-sm">
              <input
                type="checkbox"
                checked={value}
                onChange={(event) => setChecklist({ ...checklist, [key]: event.target.checked })}
              />
              {key}
            </label>
          ))}
        </div>

        <button className="btn-primary">Save Chair Clearance</button>
      </form>

      <section className="card p-5">
        <h2 className="mb-3 font-bold">History</h2>
        <div className="space-y-2">
          {history.map((item) => (
            <div className="rounded-xl border p-3 text-sm" key={item._id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{item.chairCode}</b>
                <StatusBadge status={item.status} />
              </div>
              <p>{item.notes}</p>
              <p className="text-xs text-slate-400">{item.createdAt?.slice(0, 10)}</p>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-slate-500">No chair clearance history.</p>}
        </div>
      </section>
    </div>
  );
}
