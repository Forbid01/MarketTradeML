"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

// Баруун талын section навигатор. IntersectionObserver-аар идэвхтэй секцийг тогтоож,
// дарахад зөөлөн гүйлгэнэ. lg-ээс дээш л харагдана (мобайлд зайгүй).
export default function SectionDots({ ids }) {
  const t = useT();
  // labels: id-аар түлхүүрлэгдсэн объект (landing.nav) — sold/voices зэрэг секцүүд
  // өгөгдлөөс хамаарч нөхцөлтэй орж ирдэг тул позицын массив id-тэй зөрдөг байсан.
  const labels = t("landing.nav");
  const [activeId, setActiveId] = useState(ids[0]);

  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(e.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  function go(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav aria-label="Section navigation" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      {ids.map((id, i) => {
        const on = id === activeId;
        const label = (labels && typeof labels === "object" && labels[id]) || "";
        return (
          <button key={id} type="button" onClick={() => go(id)} aria-label={label} aria-current={on} className="group flex items-center justify-end gap-2">
            <span className={`text-[10px] font-semibold uppercase tracking-widest transition ${on ? "text-azure" : "text-slate-600 group-hover:text-slate-400"}`}>
              {String(i + 1).padStart(2, "0")} {label}
            </span>
            <span className={`h-2.5 w-2.5 rounded-full border transition-all ${on ? "scale-125 border-azure bg-azure motion-safe:animate-[dotPulse_2.4s_ease-in-out_infinite]" : "border-white/25 group-hover:border-azure/60"}`} />
          </button>
        );
      })}
    </nav>
  );
}
