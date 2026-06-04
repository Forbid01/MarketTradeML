"use client";

// Browser орчны утгыг SSR-safe уншина: useSyncExternalStore нь server snapshot-той тул
// hydration mismatch үүсгэхгүй, мөн эффект дотор синхрон setState хийлгүйгээр уншдаг
// (react-hooks/set-state-in-effect дүрмийг хангана). getSnapshot үргэлж примитив буцаах ёстой.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// CSS media query-г сонсоно (өөрчлөгдөхөд дахин render). Server snapshot = false.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

// Mount-д нэг л уншигдах client-only примитив (ж: userAgent, localStorage флаг). Server snapshot = false.
export function useClientValue(getClient) {
  return useSyncExternalStore(noopSubscribe, getClient, () => false);
}

// Viewport-д орохд 0→target хүртэл count-up (ease-out). reduce үед шууд target.
// [ref, value] буцаана; дуудагч талд Math.round/format хийнэ. Unmount-д rAF-аа цуцална.
export function useCountUp(target, { duration = 1400, reduce = false } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) { setValue(target); return; }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const start = performance.now();
            const tick = (now) => {
              const p = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setValue(target * eased);
              if (p < 1) raf = requestAnimationFrame(tick);
              else setValue(target);
            };
            raf = requestAnimationFrame(tick);
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration, reduce]);
  return [ref, value];
}
