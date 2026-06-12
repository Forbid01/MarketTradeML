"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import HeroShowcase from "@/components/landing/HeroShowcase";
import { register, prefersReducedMotion } from "@/components/landing/scrollManager";
import { ArrowRight, Lock, BadgeCheck } from "@/components/icons";

const BARS = [["Level", "82%"], ["Heroes", "68%"], ["Skins", "45%"], ["Win", "58%"]];
const EMBERS = [12, 28, 44, 60, 76, 88];

export default function Hero() {
  const t = useT();
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const artRef = useRef(null);

  // Гүйлгэх үед art stage-ийг зөөлөн parallax-аар хөдөлгөнө (гүн)
  useEffect(() => {
    const el = artRef.current;
    if (!el || prefersReducedMotion()) return;
    return register(el, (p) => {
      el.style.transform = `translate3d(0, ${((p - 0.5) * -54).toFixed(2)}px, 0)`;
    });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const fine = window.matchMedia?.("(pointer: fine)")?.matches;
    if (reduce || !fine) return;
    let raf = 0;
    const onMove = (e) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        stage.style.setProperty("--tiltY", `${px * 14}deg`);
        stage.style.setProperty("--tiltX", `${-py * 10}deg`);
        // картан дээрх specular glare-ийн төв (HeroShowcase ашиглана)
        stage.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
        stage.style.setProperty("--my", `${(py + 0.5) * 100}%`);
      });
    };
    const onLeave = () => {
      stage.style.setProperty("--tiltX", "0deg");
      stage.style.setProperty("--tiltY", "0deg");
      stage.style.setProperty("--mx", "50%");
      stage.style.setProperty("--my", "32%");
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
    <section ref={wrapRef} className="relative overflow-hidden px-4 pb-24 pt-16 sm:pt-24">
      {/* Aurora + grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[6%] top-[4%] h-80 w-80 rounded-full bg-violet/25 blur-[110px] motion-safe:animate-[auroraDrift_22s_ease-in-out_infinite]" />
        <div className="absolute right-[4%] top-[14%] h-96 w-96 rounded-full bg-azure/18 blur-[120px] motion-safe:animate-[auroraDrift_28s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-[40%] h-80 w-80 rounded-full bg-gold/12 blur-[110px] motion-safe:animate-[auroraDrift_32s_ease-in-out_infinite]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "46px 46px",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)",
            maskImage: "radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)",
          }}
        />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold motion-safe:animate-[glowPulse_3s_ease-in-out_infinite]" />
            {t("landing.heroBadge")}
          </span>
          {/* Том касс дунд serif-курсив өргөлттэй үг — raven-trading-ийн display typography маяг */}
          <h1 className="mt-5 text-4xl font-extrabold uppercase leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-mythic">{t("landing.heroH1a")}</span>{" "}
            <em className="font-serif font-medium normal-case italic tracking-normal text-gold">
              {t("landing.heroH1accent")}
            </em>{" "}
            <span className="text-mythic">{t("landing.heroH1b")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 lg:mx-0">
            {t("landing.heroSub")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Link
              href="/browse"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet to-azure px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_10px_40px_-8px_rgba(109,93,246,0.7)] transition hover:brightness-110 sm:w-auto"
            >
              {t("landing.ctaBrowse")}
              <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/listings/new"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-slate-100 backdrop-blur transition hover:bg-white/10 sm:w-auto"
            >
              {t("landing.ctaStart")}
            </Link>
          </div>
        </div>

        {/* Warrior stage */}
        <div ref={artRef} style={{ willChange: "transform" }} className="relative mx-auto flex h-[460px] w-full max-w-sm items-center justify-center">
          {/* rotating dashed ring */}
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10 motion-safe:animate-[spinSlow_34s_linear_infinite]" />
          {/* conic protection ring */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-[spinSlow_9s_linear_infinite]"
            style={{
              background: "conic-gradient(from 0deg, transparent 0 58%, #38BDF8 78%, #F5C451 92%, transparent 100%)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))",
              opacity: 0.6,
            }}
          />
          {/* embers */}
          {EMBERS.map((left, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute bottom-10 h-1 w-1 rounded-full bg-gold motion-safe:animate-[emberRise_5s_ease-in_infinite]"
              style={{ left: `${left}%`, animationDelay: `${i * 0.7}s` }}
            />
          ))}

          {/* hero showcase (лицензтэй зураг) / warrior fallback — parallax tilt + idle float */}
          <div ref={stageRef} className="tilt-card relative z-10">
            <div className="motion-safe:animate-[heroFloat_6s_ease-in-out_infinite]">
              <HeroShowcase />
            </div>
          </div>

          {/* floating stat card */}
          <div className="absolute -bottom-2 right-0 z-20 w-44 rounded-xl border border-white/10 bg-[#0B0E1A]/80 p-3 backdrop-blur motion-safe:animate-[floaty_7s_ease-in-out_infinite]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-gold">
                <BadgeCheck size={11} /> Verified
              </span>
              <span className="text-[10px] text-slate-400">Lv.82</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {BARS.map(([label, pct]) => (
                <div key={label} className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <span className="w-9">{label}</span>
                  <div className="h-1 flex-1 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet to-azure" style={{ width: pct }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-center gap-1 rounded-md border border-azure/30 bg-azure/10 py-1 text-[9px] font-semibold uppercase text-azure">
              <Lock size={10} /> Escrow protected
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
