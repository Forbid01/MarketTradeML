"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HEROES } from "@/lib/heroes";
import { Warrior } from "@/components/Warrior";
import { useReducedMotion } from "@/lib/hooks";
import { BadgeCheck } from "@/components/icons";

// Лицензтэй баатрын зургийг 3D coverflow deck-ээр харуулна:
//  • Урд карт төв, ард карт fan хийж гүн (translateZ) + parallax үүсгэнэ.
//  • Cursor-glare (--mx/--my Hero-оос), ken-burns зум, гялбаа (shine) sweep.
//  • Авто-эргэлт (4.6с), reduced-motion үед зогсоно. Аль ч картыг дарж урагшлуулна.
//  • public/heroes/ хоосон бол warrior SVG руу graceful fallback.

// Deck дэх харьцангуй байрлал бүрийн 3D хувиргалт (front=0, ард=1,2, гарч буй=exit)
const SLOTS = [
  { tx: 0, tz: 72, ry: 0, sc: 1, op: 1, bl: 0, z: 40 }, // урд
  { tx: 38, tz: 6, ry: -17, sc: 0.9, op: 0.5, bl: 1.2, z: 30 }, // ард-1
  { tx: 64, tz: -56, ry: -23, sc: 0.8, op: 0.26, bl: 2.4, z: 20 }, // ард-2
];
const EXIT = { tx: -54, tz: -30, ry: 25, sc: 0.84, op: 0, bl: 3.4, z: 10 }; // гарч буй

function slotFor(rel, n) {
  if (rel === 0) return SLOTS[0];
  if (rel === 1) return SLOTS[1];
  if (rel === 2 && n > 3) return SLOTS[2];
  return EXIT;
}
const cardTransform = (s) =>
  `translate(-50%,-50%) translateX(${s.tx}px) translateZ(${s.tz}px) rotateY(${s.ry}deg) scale(${s.sc})`;

export default function HeroShowcase() {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || HEROES.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % HEROES.length), 4600);
    return () => clearInterval(id);
  }, [reduce]);

  if (HEROES.length === 0) return <Warrior size={400} />;

  const n = HEROES.length;
  const active = HEROES[idx % n];

  return (
    <div className="relative h-[460px] w-[330px]" style={{ perspective: "1200px" }}>
      {/* Deck — 3D орон зайг энд тогтооно (preserve-3d) */}
      <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
        {HEROES.map((h, i) => {
          const rel = (i - idx + n) % n;
          const s = reduce ? (rel === 0 ? SLOTS[0] : EXIT) : slotFor(rel, n);
          const front = rel === 0;
          return (
            <button
              key={h.src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`${h.name} · ${h.rank}`}
              aria-hidden={!front}
              tabIndex={front ? 0 : -1}
              className="group absolute left-1/2 top-1/2 h-[430px] w-[300px] origin-center overflow-hidden rounded-[1.4rem] border border-white/12 bg-[#0B0E1A] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] outline-none focus-visible:ring-2 focus-visible:ring-[#6D5DF6]"
              style={{
                transform: cardTransform(s),
                opacity: s.op,
                filter: s.bl ? `blur(${s.bl}px)` : "none",
                zIndex: s.z,
                transition: reduce
                  ? "none"
                  : "transform 0.95s cubic-bezier(0.16,1,0.3,1), opacity 0.95s ease, filter 0.95s ease",
                pointerEvents: s.op === 0 ? "none" : "auto",
                cursor: front ? "default" : "pointer",
              }}
            >
              <Image
                src={h.src}
                alt={h.name}
                fill
                priority={i === 0}
                sizes="300px"
                className={`object-cover ${front && !reduce ? "motion-safe:animate-[kenburns_16s_ease-in-out_infinite]" : ""}`}
                style={{ objectPosition: h.pos || "center" }}
              />

              {/* доод gradient (label-ын тод байдалд) */}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#06070E] via-[#06070E]/55 to-transparent" />
              {/* дотор хүрээ гэрэл */}
              <div aria-hidden className="absolute inset-0 rounded-[1.4rem] ring-1 ring-inset ring-white/10" />

              {front && (
                <>
                  {/* cursor-glare — Hero-оос ирэх --mx/--my-г дагана */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-60 mix-blend-screen"
                    style={{
                      background:
                        "radial-gradient(420px circle at var(--mx,50%) var(--my,32%), rgba(255,255,255,0.22), rgba(56,189,248,0.08) 35%, transparent 60%)",
                    }}
                  />
                  {/* гялбаа sweep */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -inset-y-2 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent motion-safe:animate-[shine_6.5s_ease-in-out_infinite]" />
                  </div>
                  {/* доод хаяг (картан дотор) */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#06070E]/70 px-3 py-1 backdrop-blur">
                      <BadgeCheck size={13} className="text-[#38BDF8]" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-100">{h.name}</span>
                      <span className="text-xs font-semibold text-[#F5C451]">· {h.rank}</span>
                    </div>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* dots */}
      {n > 1 && (
        <div className="absolute -bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5">
          {HEROES.map((h, i) => (
            <button
              key={h.src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={h.name}
              aria-current={i === idx}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8]" : "w-1.5 bg-white/25 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* screen-reader-д идэвхтэй картыг зарлах */}
      <span className="sr-only" aria-live="polite">{active.name} · {active.rank}</span>
    </div>
  );
}
