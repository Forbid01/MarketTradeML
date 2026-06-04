"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HEROES } from "@/lib/heroes";
import { Warrior } from "@/components/Warrior";
import { BadgeCheck } from "@/components/icons";

// Лицензтэй баатрын зургийг cinematic байдлаар (cross-fade + Ken Burns + label) харуулна.
// public/heroes/ + lib/heroes.js хоосон бол өөрийн warrior SVG руу graceful fallback.
export default function HeroShowcase() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (HEROES.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % HEROES.length), 5200);
    return () => clearInterval(id);
  }, []);

  // Fallback — зураг тохируулаагүй үед
  if (HEROES.length === 0) {
    return <Warrior size={400} />;
  }

  const active = HEROES[Math.min(idx, HEROES.length - 1)];
  return (
    <div className="relative h-[460px] w-[330px]">
      {HEROES.map((h, i) => (
        <div
          key={h.src}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[1100ms] ${i === idx ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={h.src}
            alt={h.name}
            fill
            priority={i === 0}
            sizes="330px"
            className="object-contain object-bottom drop-shadow-[0_0_44px_rgba(109,93,246,0.45)] motion-safe:animate-[kenburns_14s_ease-in-out_infinite]"
            style={{
              WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 72%,transparent 100%)",
              maskImage: "linear-gradient(180deg,#000 0%,#000 72%,transparent 100%)",
            }}
          />
        </div>
      ))}

      {/* нэр + ранк label */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#06070E]/70 px-4 py-1.5 backdrop-blur">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-100">
          <BadgeCheck size={13} className="text-[#38BDF8]" /> {active.name}
          <span className="text-[#F5C451]">· {active.rank}</span>
        </span>
      </div>
    </div>
  );
}
