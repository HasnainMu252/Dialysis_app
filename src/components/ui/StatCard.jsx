export default function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-4 shadow-lg shadow-slate-200/80 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500 sm:text-sm">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {value}
          </h3>
        </div>

        {Icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200 transition-transform duration-200 group-hover:scale-110 sm:h-14 sm:w-14">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        )}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
      </div>
    </div>
  );
}
