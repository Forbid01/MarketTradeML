"use client";

// Төгсгөлийн CTA — pinned/sticky scroll урсгал (raven-ы ScrollTrigger pin маяг).
// Гадна wrapper нь 220vh өндөр; доторх контент sticky-гээр дэлгэцэд "наалдаж",
// гүйлгэх явц (scrollManager progress) гарчиг → тайлбар → товч гэж ээлжлэн
// угсардаг ба алтан гэрэлт аура хүчээ авна. CSS var-аар scrub хийдэг тул re-render
// үүсгэхгүй. reduced-motion / no-JS үед бүх зүйл шууд бүрэн харагдана (var default 1).
import { useEffect, useRef } from "react";
import Link from "next/link";
import Parallax from "@/components/landing/Parallax";
import { register, prefersReducedMotion } from "@/components/landing/scrollManager";
import { ArrowRight } from "@/components/icons";

const clamp = (v) => Math.min(1, Math.max(0, v));

export default function CTAPinned({ title, sub, cta, href = "/browse" }) {
  const wrapRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card || prefersReducedMotion()) return;
    return register(wrap, (p, r, vh) => {
      // Sticky pin-ий идэвхтэй муж: контент дэлгэцэд наалдсанаас суларах хүртэл
      const total = vh + r.height;
      const pinStart = vh / total;
      const pinEnd = r.height / total;
      const k = clamp((p - pinStart) / (pinEnd - pinStart || 1));
      const stage = (a, b) => clamp((k - a) / (b - a)).toFixed(3);
      card.style.setProperty("--s1", stage(0.0, 0.3));   // гарчиг
      card.style.setProperty("--s2", stage(0.22, 0.52)); // тайлбар
      card.style.setProperty("--s3", stage(0.45, 0.72)); // товч
      card.style.setProperty("--glow", stage(0.55, 1));  // аура
      card.style.setProperty("--scale", (0.94 + clamp(k / 0.5) * 0.06).toFixed(4));
    });
  }, []);

  return (
    <div ref={wrapRef} className="relative h-[180vh] sm:h-[220vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center px-4">
        <div
          ref={cardRef}
          className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-violet/30 bg-gradient-to-br from-violet/15 via-[#0B0E1A] to-[#06070E] px-6 py-16 text-center sm:py-24"
          style={{ transform: "scale(var(--scale,1))" }}
        >
          <Parallax speed={120} zoom={0.15} className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2">
            <div className="h-full w-full rounded-full bg-gold/15 blur-[90px]" />
          </Parallax>
          {/* Scrub-аар хүчээ авдаг алтан аура */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: "var(--glow,1)",
              background: "radial-gradient(420px 260px at 50% 80%, rgba(245,196,81,0.14), transparent 70%)",
            }}
          />
          <h2
            className="relative text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-5xl"
            style={{ opacity: "var(--s1,1)", transform: "translateY(calc((1 - var(--s1,1)) * 28px))" }}
          >
            {title}
          </h2>
          <p
            className="relative mx-auto mt-4 max-w-xl text-sm text-slate-400 sm:text-base"
            style={{ opacity: "var(--s2,1)", transform: "translateY(calc((1 - var(--s2,1)) * 24px))" }}
          >
            {sub}
          </p>
          <div style={{ opacity: "var(--s3,1)", transform: "translateY(calc((1 - var(--s3,1)) * 20px))" }}>
            <Link
              href={href}
              className="relative mt-9 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-violet px-8 py-4 text-sm font-bold uppercase tracking-wide text-[#06070E] shadow-[0_12px_40px_-8px_rgba(245,196,81,0.5)] transition hover:brightness-110"
            >
              {cta} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
