"use client";

// Browser орчны утгыг SSR-safe уншина: useSyncExternalStore нь server snapshot-той тул
// hydration mismatch үүсгэхгүй, мөн эффект дотор синхрон setState хийлгүйгээр уншдаг
// (react-hooks/set-state-in-effect дүрмийг хангана). getSnapshot үргэлж примитив буцаах ёстой.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import { errorKey } from "@/lib/i18n/errors";

const noopSubscribe = () => () => {};
const CYRILLIC = /[Ѐ-ӿ]/;

// Server action-ийг transport алдаанаас хамгаалж дуудах hook. Action { error } буцаавал
// серверийн монгол мессежийг errorKey() map-аар тухайн locale-д орчуулж дамжуулна
// (EN хэрэглэгч англиар харна); харин дуудлага ӨӨРӨӨ throw хийвэл (сүлжээ тасрах,
// 500 г.м) локалчилсан common.error-ийг { error }-д оруулж буцаана — busy төлөв
// гацахгүй, хэрэглэгч ямар ч тохиолдолд feedback авна.
export function useAction() {
  const t = useT();
  const locale = useLocale();
  return useCallback(
    async (fn, ...args) => {
      try {
        const r = (await fn(...args)) ?? { ok: true };
        if (r && typeof r.error === "string") {
          const key = errorKey(r.error);
          if (key) return { ...r, error: t(`errors.${key}`) };
          // Map-д байхгүй кирилл алдааг EN хэрэглэгчид түүхийгээр харуулахын оронд
          // ерөнхий локалчилсан мессежээр орлуулна (MN-д түүхий нь ойлгомжтой тул хэвээр).
          if (locale !== "mn" && CYRILLIC.test(r.error)) return { ...r, error: t("common.error") };
        }
        return r;
      } catch (e) {
        console.error("action failed:", e?.message ?? e);
        return { error: t("common.error") };
      }
    },
    [t, locale]
  );
}

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
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduce) return; // reduce үед доор шууд target буцаана — энд state бичих шаардлагагүй
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
  return [ref, reduce ? target : value];
}
