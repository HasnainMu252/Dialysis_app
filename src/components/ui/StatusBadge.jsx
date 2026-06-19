import { statusColor } from '../../constants';
export default function StatusBadge({status}){ return <span className={`badge ${statusColor[status]||'bg-slate-100 text-slate-700'}`}>{status||'N/A'}</span> }
