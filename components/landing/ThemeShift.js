"use client";

// Секц бүрд дэвсгэрийн өнгөний "уур амьсгал" зөөлөн шилжинэ (raven-ы data-theme маяг).
// Бүтэн дэлгэцийн fixed давхаргууд (theme тус бүрд нэг) стекленэ — идэвхтэй нь opacity 1,
// бусад нь 0 болж 1.2с crossfade хийнэ. Body-гийн үндсэн градиент суурь хэвээр тул
// brand identity алдагдахгүй, зөвхөн өнгөний жин шилждэг. reduced-motion-д шилжилт шууд.
import { useEffect, useState } from "react";

const THEMES = {
  violet: {
    bg: "radial-gradient(900px 540px at 30% 10%, rgba(109,93,246,0.18), transparent 60%), radial-gradient(700px 480px at 85% 30%, rgba(56,189,248,0.07), transparent 55%)",
  },
  azure: {
    bg: "radial-gradient(900px 540px at 70% 12%, rgba(56,189,248,0.16), transparent 60%), radial-gradient(700px 480px at 15% 40%, rgba(109,93,246,0.08), transparent 55%)",
  },
  deep: {
    bg: "radial-gradient(1000px 600px at 50% 30%, rgba(11,14,26,0.9), transparent 75%), radial-gradient(600px 420px at 80% 70%, rgba(109,93,246,0.06), transparent 55%)",
  },
  gold: {
    bg: "radial-gradient(900px 540px at 50% 18%, rgba(245,196,81,0.10), transparent 60%), radial-gradient(700px 480px at 20% 60%, rgba(109,93,246,0.10), transparent 55%)",
  },
};

export default function ThemeShift({ map }) {
  const [active, setActive] = useState(Object.values(map)[0] ?? "violet");

  useEffect(() => {
    const els = Object.keys(map)
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!els.length) return;
    // Огтлолцож буй секцүүдийг хадгалж, дэлгэцийн ТӨВД хамгийн ойрхоныг идэвхтэй болгоно
    // — callback-ийн entries дараалал детерминист биш тул "сүүлчийн isIntersecting"-ийг
    // авбал хурдан scroll/намхан секцэд буруу theme сонгогддог байсан.
    const visible = new Set();
    const pick = () => {
      const mid = window.innerHeight / 2;
      let best = null, bestDist = Infinity;
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = el; }
      }
      if (best) setActive(map[best.id] ?? "violet");
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        pick();
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [map]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20">
      {Object.entries(THEMES).map(([name, theme]) => (
        <div
          key={name}
          className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-[1200ms] ${
            active === name ? "opacity-100" : "opacity-0"
          }`}
          style={{ background: theme.bg }}
        />
      ))}
    </div>
  );
}
