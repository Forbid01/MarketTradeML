"use client";

import { useEffect, useRef, useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import { useReducedMotion } from "@/lib/hooks";
import { formatMNT } from "@/lib/format";

// Бодит DB тоог viewport-д орохд count-up хийнэ. reduced-motion үед шууд эцсийн утга.
function Counter({ value, label, kind, locale, reduce }) {
  const [animated, setAnimated] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (reduce) return; // reduced-motion: анимэйшнгүй, доор value-г шууд харуулна
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const dur = 1400, start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3); // ease-out
              setAnimated(Math.round(value * eased));
              if (p < 1) raf = requestAnimationFrame(tick);
              else setAnimated(value);
            };
            raf = requestAnimationFrame(tick);
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [value, reduce]);

  const shown = reduce ? value : animated;
  const display = kind === "mnt"
    ? formatMNT(shown, locale)
    : new Intl.NumberFormat(locale === "en" ? "en-US" : "mn-MN").format(shown);

  return (
    <div ref={ref} className="text-center">
      <div className="bg-gradient-to-br from-[#F5C451] to-[#38BDF8] bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-4xl">{display}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</div>
    </div>
  );
}

export default function LiveCounters({ stats }) {
  const t = useT();
  const locale = useLocale();
  const reduce = useReducedMotion();
  if (!stats) return null;

  const items = [
    { value: stats.listings, label: t("landing.live.listings"), kind: "int" },
    { value: stats.trades, label: t("landing.live.trades"), kind: "int" },
    { value: stats.protected, label: t("landing.live.protected"), kind: "mnt" },
  ];

  return (
    <div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-[#38BDF8]">{t("landing.live.eyebrow")}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:gap-4 sm:p-8">
        {items.map((it, i) => (
          <Counter key={i} value={it.value} label={it.label} kind={it.kind} locale={locale} reduce={reduce} />
        ))}
      </div>
    </div>
  );
}
