import { formatMNT } from "@/lib/format";

// "Сүүлийн арилжаа" зурвас — сүүлд зарагдсан зарууд тасралтгүй гүйнэ (CSS marquee).
// Нэргүй (зөвхөн гарчиг + үнэ). Хоосон бол нуугдана. reduced-motion үед статик.
export default function RecentSales({ sales, label, locale }) {
  if (!sales?.length) return null;
  const row = [...sales, ...sales];

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-[#0B0E1A]/40 py-3">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#06070E] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#06070E] to-transparent" />
      <div className="marquee-track flex w-max items-center gap-6 whitespace-nowrap text-xs">
        {row.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="max-w-[180px] truncate font-medium text-slate-200">{s.title}</span>
            <span className="font-semibold text-[#38BDF8]">{formatMNT(s.price, locale)}</span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
