"use client";

import { useEffect, useRef } from "react";
import { subscribe, prefersReducedMotion } from "@/components/landing/scrollManager";

// Хуудасны дээд талын нимгэн прогресс бар — гүйлгэх явцыг (0→1) gradient-ээр.
// scaleX-ээр өөрчилдөг тул reflow үүсгэхгүй; shared rAF давталгад нэгдэнэ.
// reduced-motion үед scroll-linked хөдөлгөөнийг идэвхжүүлэхгүй (бар нуугдсан хэвээр).
export default function ScrollProgress() {
  const ref = useRef(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar || prefersReducedMotion()) return;
    return subscribe(() => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${p})`;
    });
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-[#6D5DF6] via-[#38BDF8] to-[#F5C451]"
        style={{ transform: "scaleX(0)", willChange: "transform" }}
      />
    </div>
  );
}
