"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { BadgeCheck, Lock, ArrowRight } from "@/components/icons";

function RankEmblem({ size = 44, color = "#2563EB" }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ filter: `drop-shadow(0 2px 5px ${color}40)` }}>
      <path
        d="M24 3l7 6 9 1-2 9 5 8-8 4-3 9-8-4-8 4-3-9-8-4 5-8-2-9 9-1z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 14l3.2 7.2 7.8.6-5.9 5 1.9 7.6L24 37l-6.9 4 1.9-7.6-5.9-5 7.8-.6z"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
}

const BARS = [
  ["Level", "82%"],
  ["Heroes", "68%"],
  ["Skins", "45%"],
  ["Win", "58%"],
];

export default function Hero() {
  const t = useT();
  const wrapRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const finePointer = window.matchMedia?.("(pointer: fine)")?.matches;
    if (reduce || !finePointer) return;

    let raf = 0;
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty("--tiltY", `${px * 16}deg`);
        card.style.setProperty("--tiltX", `${-py * 12}deg`);
      });
    };
    const onLeave = () => {
      card.style.setProperty("--tiltX", "0deg");
      card.style.setProperty("--tiltY", "0deg");
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrapRef} className="relative overflow-hidden px-4 pb-20 pt-16 sm:pt-24">
      {/* Aurora + grid background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[6%] h-72 w-72 rounded-full bg-blue-300/30 blur-[90px] motion-safe:animate-[auroraDrift_20s_ease-in-out_infinite]" />
        <div className="absolute right-[6%] top-[18%] h-80 w-80 rounded-full bg-amber-300/30 blur-[100px] motion-safe:animate-[auroraDrift_26s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-[38%] h-72 w-72 rounded-full bg-blue-200/40 blur-[90px] motion-safe:animate-[auroraDrift_30s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px,transparent 1px),linear-gradient(90deg,#0f172a 1px,transparent 1px)",
            backgroundSize: "44px 44px",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 25%, #000 35%, transparent 75%)",
            maskImage: "radial-gradient(ellipse at 50% 25%, #000 35%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {t("landing.heroBadge")}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {t("landing.heroHeadline")}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 lg:mx-0">
            {t("landing.heroSub")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Link
              href="/browse"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_34px_-8px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 sm:w-auto"
            >
              {t("landing.ctaBrowse")}
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/listings/new"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              {t("landing.ctaStart")}
            </Link>
          </div>
        </div>

        {/* 3D Vault card + orbiting emblems */}
        <div className="relative mx-auto flex h-[440px] w-full max-w-sm items-center justify-center">
          {/* slow rotating dashed ring */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200 motion-safe:animate-[spinSlow_30s_linear_infinite]"
          />
          {/* conic protection ring */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[spinSlow_8s_linear_infinite]"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0 58%, #2563EB 78%, #F59E0B 92%, transparent 100%)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              opacity: 0.55,
            }}
          />
          {/* floating emblems */}
          <div aria-hidden className="absolute left-1/2 top-2 -translate-x-1/2 motion-safe:animate-[floaty_5s_ease-in-out_infinite]">
            <RankEmblem size={40} color="#F59E0B" />
          </div>
          <div aria-hidden className="absolute bottom-6 left-2 motion-safe:animate-[floaty_7s_ease-in-out_infinite]" style={{ animationDelay: "0.6s" }}>
            <RankEmblem size={30} color="#2563EB" />
          </div>
          <div aria-hidden className="absolute bottom-10 right-1 motion-safe:animate-[floaty_6s_ease-in-out_infinite]" style={{ animationDelay: "1.1s" }}>
            <RankEmblem size={34} color="#94A3B8" />
          </div>

          {/* the card */}
          <div ref={cardRef} className="tilt-card relative z-10 w-64 motion-safe:animate-[floaty_6s_ease-in-out_infinite]">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-xl">
              {/* hologram shine */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 motion-safe:animate-[shine_5s_ease-in-out_infinite]"
                style={{ background: "linear-gradient(105deg, transparent 30%, rgba(37,99,235,0.12) 45%, transparent 60%)" }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    <BadgeCheck size={12} /> VERIFIED
                  </span>
                  <span className="text-[10px] text-slate-400">Asia · Lv.82</span>
                </div>

                <div className="my-4 flex justify-center">
                  <RankEmblem size={64} color="#F59E0B" />
                </div>
                <p className="text-center text-sm font-bold tracking-[0.18em] text-slate-900">MYTHICAL GLORY</p>
                <p className="mt-0.5 text-center text-xs text-slate-500">850 pts</p>

                <div className="mt-4 space-y-2">
                  {BARS.map(([label, pct]) => (
                    <div key={label} className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="w-12">{label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400" style={{ width: pct }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-[11px] font-semibold text-blue-700 motion-safe:animate-[glowPulse_3s_ease-in-out_infinite]">
                  <Lock size={14} /> ESCROW PROTECTED
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
