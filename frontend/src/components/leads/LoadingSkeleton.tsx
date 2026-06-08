export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-0">
        <div className="h-12 bg-slate-100" />
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-7 gap-4 border-t border-slate-100 px-4 py-4"
          >
            {Array.from({ length: 7 }).map((__, cellIndex) => (
              <div key={cellIndex} className="h-4 rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="mt-3 h-8 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-64 rounded bg-slate-100" />
      <div className="h-8 w-80 rounded bg-slate-100" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-56 rounded-xl bg-slate-100" />
        <div className="h-56 rounded-xl bg-slate-100" />
      </div>
      <div className="h-32 rounded-xl bg-slate-100" />
      <div className="h-48 rounded-xl bg-slate-100" />
    </div>
  );
}
