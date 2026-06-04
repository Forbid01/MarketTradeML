// Route-segment loading skeleton (Next App Router) — навигацийн үед шууд харагдана.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-md bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-video w-full animate-pulse bg-slate-100" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
