import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE = 15;

/**
 * Client-side paging + search helper.
 * items: full array, search: query string, fields: keys (or accessor fns) to match.
 */
export function usePagedList(items = [], search = '', fields = [], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      fields.some((f) => {
        const v = typeof f === 'function' ? f(it) : it?.[f];
        return String(v ?? '').toLowerCase().includes(q);
      })
    );
  }, [items, search, fields]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  return { paged, page, setPage, total, pageCount, pageSize };
}

export default function Pagination({ page, pageCount, total, pageSize = PAGE_SIZE, onPage, label = 'records' }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // compact window of page numbers
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pageCount, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  const pages = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-2 sm:flex-row">
      <p className="text-sm font-medium text-slate-500">
        Showing {from}–{to} of {total} {label}
      </p>
      <div className="flex items-center gap-1">
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 disabled:opacity-40" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={18} /></button>
        {start > 1 && <span className="px-1 text-slate-400">…</span>}
        {pages.map((p) => (
          <button key={p} onClick={() => onPage(p)} className={`h-9 min-w-9 rounded-xl px-3 text-sm font-bold transition ${p === page ? 'bg-blue-600 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:bg-blue-50'}`}>{p}</button>
        ))}
        {end < pageCount && <span className="px-1 text-slate-400">…</span>}
        <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-blue-50 disabled:opacity-40" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
