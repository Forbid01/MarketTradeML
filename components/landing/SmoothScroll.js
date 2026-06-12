"use client";

// Lenis-маягийн инерцитэй зөөлөн scroll (raven-trading.com-ын гол "мэдрэмж").
// Wheel-ийг барьж авч scrollY-г lerp-ээр зорилтот утга руу хөөнө — native layout,
// sticky/fixed бүгд хэвээр (transform хийдэггүй). Зөвхөн landing дээр mount хийнэ.
// Хамгаалалт: reduced-motion болон touch/coarse pointer дээр идэвхжихгүй;
// дотоод scroll-той элемент (overflow бүс) дээр native үлдээнэ; keyboard/drag native.
import { useEffect } from "react";

const LERP = 0.11; // 0..1 — бага байх тусам "хүнд" инерци

function insideScrollable(node) {
  let el = node instanceof Element ? node : null;
  while (el && el !== document.body) {
    const st = getComputedStyle(el);
    if (
      (st.overflowY === "auto" || st.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    if (!window.matchMedia?.("(pointer: fine)")?.matches) return;

    let target = window.scrollY;
    let animating = false;
    let raf = 0;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const animate = () => {
      const cur = window.scrollY;
      const diff = target - cur;
      if (Math.abs(diff) < 0.5) {
        animating = false;
        return;
      }
      window.scrollTo(0, cur + diff * LERP);
      raf = requestAnimationFrame(animate);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom
      if (insideScrollable(e.target)) return; // дотоод scroll бүс — native
      e.preventDefault();
      // deltaMode: 0=px, 1=мөр (Firefox ≈16px), 2=хуудас (≈viewport). px болгож хувиргана —
      // эс бөгөөс page-mode хулгана/драйвер дээр delta≈1px болж дэлгэц гацсан мэт болдог.
      const unit = e.deltaMode === 2 ? window.innerHeight : e.deltaMode === 1 ? 16 : 1;
      const delta = e.deltaY * unit;
      if (!animating) target = window.scrollY; // keyboard/drag-аар зөрсөн бол sync
      target = Math.max(0, Math.min(maxScroll(), target + delta));
      if (!animating) {
        animating = true;
        raf = requestAnimationFrame(animate);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
