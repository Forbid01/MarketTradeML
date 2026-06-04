"use client";

import { useEffect, useRef } from "react";
import Reveal from "@/components/landing/Reveal";
import { register, prefersReducedMotion } from "@/components/landing/scrollManager";

// "Хэрхэн ажилладаг" хэсэг: холбогч шугам нь гүйлгэх явцыг дагаж зүүнээс баруунруу
// (lg) / дээрээс доош (mobile) дүүрнэ. Алхмууд ээлжлэн (stagger) гарч ирнэ.
export default function StepsTimeline({ eyebrow, title, steps }) {
  const wrapRef = useRef(null);
  const fillH = useRef(null); // хэвтээ (lg) дүүргэлт
  const fillV = useRef(null); // босоо (mobile) дүүргэлт

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || prefersReducedMotion()) return;
    return register(el, (p) => {
      // секц голд ирэх үед дүүргэх: p∈[0.18,0.62] → 0..1
      const f = Math.min(1, Math.max(0, (p - 0.18) / 0.44));
      if (fillH.current) fillH.current.style.transform = `scaleX(${f.toFixed(3)})`;
      if (fillV.current) fillV.current.style.transform = `scaleY(${f.toFixed(3)})`;
    });
  }, []);

  return (
    <div ref={wrapRef} className="mx-auto max-w-6xl">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F5C451]">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{title}</h2>
        </div>
      </Reveal>

      <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* хэвтээ шугам (lg) — суурь + scrubbed дүүргэлт */}
        <div aria-hidden className="absolute left-0 right-0 top-7 hidden h-px bg-white/10 lg:block">
          <div ref={fillH} className="h-full origin-left bg-gradient-to-r from-[#6D5DF6] via-[#38BDF8] to-[#F5C451]" style={{ transform: "scaleX(0)" }} />
        </div>
        {/* босоо шугам (sm-аас доош) */}
        <div aria-hidden className="absolute left-7 top-0 bottom-0 w-px bg-white/10 sm:hidden">
          <div ref={fillV} className="w-full origin-top bg-gradient-to-b from-[#6D5DF6] via-[#38BDF8] to-[#F5C451]" style={{ transform: "scaleY(0)" }} />
        </div>

        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 120} variant="up">
            <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#6D5DF6]/40 hover:bg-white/[0.05]">
              <div className="bg-gradient-to-br from-[#F5C451] to-[#6D5DF6] bg-clip-text text-4xl font-black tracking-tight text-transparent">{s.n}</div>
              <h3 className="mt-3 text-base font-bold uppercase tracking-wide text-slate-50">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
