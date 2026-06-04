// /browse route-segment skeleton — шүүлт submit/навигацийн үед шууд харагдана.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="h-7 w-64 max-w-full animate-pulse rounded-md bg-white/10" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-white/10" />
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-lg bg-white/10" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="aspect-video w-full animate-pulse bg-white/10" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
