/*
 * Reusable skeleton loaders. The `.skeleton` class (shimmer + keyframes) lives in
 * index.css. Use these while data is in flight so the layout appears instantly
 * instead of a blank "Loading…" screen.
 */

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/* A line of text. `w` is a tailwind width class. */
export function SkeletonText({ w = 'w-full', className = 'h-3.5' }) {
  return <Skeleton className={`${w} ${className}`} />;
}

/* A generic card block with a title + a few lines. */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/* A grid of stat-card placeholders (dashboards). */
export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4 p-5">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* A table placeholder with rows. */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* A list of card rows (patient cards, schedules, etc.). */
export function SkeletonList({ count = 4, cardLines = 2 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={cardLines} />
      ))}
    </div>
  );
}

export default Skeleton;
