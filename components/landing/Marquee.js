"use client";

import { useT } from "@/lib/i18n/client";
import { ShieldCheck } from "@/components/icons";

// Итгэлийн зурвас — токенуудыг тасралтгүй гүйлгэнэ (CSS marquee, globals.css).
// Контентыг 2 хувилснаар давталт жигд (translateX -50% = нэг хувилбарын урт).
// reduced-motion үед статик (globals.css-д animation унтарна).
export default function Marquee() {
  const t = useT();
  const items = t("landing.marquee");
  const list = Array.isArray(items) ? items : [];
  const row = [...list, ...list];

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-4">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#06070E] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#06070E] to-transparent" />
      <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap">
        {row.map((txt, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <ShieldCheck size={15} className="shrink-0 text-azure" />
            {txt}
          </span>
        ))}
      </div>
    </div>
  );
}
