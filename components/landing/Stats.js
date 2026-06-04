"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";

function parseNum(s) {
  const m = String(s).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return { pre: "", num: null, suf: s };
  return { pre: m[1], num: parseFloat(m[2]), suf: m[3] };
}

function Stat({ raw, label }) {
  const { pre, num, suf } = parseNum(raw);
  const [val, setVal] = useState(num == null ? null : 0);
  const ref = useRef(null);

  useEffect(() => {
    if (num == null) return;
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setVal(num);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const dur = 1200;
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / dur);
              setVal(num * p);
              if (p < 1) raf = requestAnimationFrame(tick);
              else setVal(num);
            };
            raf = requestAnimationFrame(tick);
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [num]);

  const display = num == null ? raw : `${pre}${Math.round(val)}${suf}`;

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-extrabold tracking-tight text-blue-600 sm:text-5xl">{display}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function Stats() {
  const t = useT();
  const items = [
    { raw: t("landing.stat1Num"), label: t("landing.stat1Label") },
    { raw: t("landing.stat2Num"), label: t("landing.stat2Label") },
    { raw: t("landing.stat3Num"), label: t("landing.stat3Label") },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-8">
      {items.map((it, i) => (
        <Stat key={i} raw={it.raw} label={it.label} />
      ))}
    </div>
  );
}
