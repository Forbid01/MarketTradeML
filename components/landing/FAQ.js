import { getT } from "@/lib/i18n/server";
import { Plus } from "@/components/icons";

// Түгээмэл асуулт — нативе <details> accordion (JS-гүй, SEO-д ээлтэй). Server component.
export default async function FAQ() {
  const t = await getT();
  const items = t("landing.faq");
  const list = Array.isArray(items) ? items : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#38BDF8]">{t("landing.faqEyebrow")}</p>
        <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("landing.faqTitle")}</h2>
      </div>
      <div className="mt-10 space-y-3">
        {list.map((it, i) => (
          <details key={i} className="group rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-[#6D5DF6]/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-100 [&::-webkit-details-marker]:hidden">
              {it.q}
              <Plus size={18} className="shrink-0 text-[#38BDF8] transition-transform duration-300 group-open:rotate-45" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{it.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
