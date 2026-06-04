"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/icons";
import { useReducedMotion } from "@/lib/hooks";

// Анхны зочлолтод л харагдах intro. page.js серверт cookie-аар шийднэ (давтан гаргахгүй);
// энд зөвхөн тоглуулж, session cookie тавиад өөрийгөө устгана.
// reduced-motion үед шууд алга; no-JS үед globals.css-аар нуугдана (хэзээ ч гацахгүй).
const COOKIE = "mlbb_intro";

export default function Preloader() {
  const reduce = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    document.cookie = `${COOKIE}=1; path=/; samesite=lax`; // session cookie (browser хаахад арилна)
    if (reduce) return; // reduced-motion: cookie тавиад л болоо, доор null рендэрнэ
    const id = setTimeout(() => setLeaving(true), 1150);
    return () => clearTimeout(id);
  }, [reduce]);

  if (reduce || gone) return null;

  return (
    <div
      className={`preloader flex items-center justify-center ${leaving ? "preloader--out" : ""}`}
      onAnimationEnd={(e) => { if (leaving && e.target === e.currentTarget) setGone(true); }}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-5">
        <div className="text-[#38BDF8] motion-safe:animate-[floaty_2.4s_ease-in-out_infinite]">
          <Logo size={56} />
        </div>
        <div className="text-mythic text-2xl font-extrabold uppercase tracking-[0.3em]">MLBB</div>
        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full origin-left bg-gradient-to-r from-[#6D5DF6] via-[#38BDF8] to-[#F5C451]"
            style={{ animation: "preloaderBar 1.15s cubic-bezier(0.7,0,0.3,1) forwards" }}
          />
        </div>
      </div>
    </div>
  );
}
