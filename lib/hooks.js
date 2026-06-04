"use client";

// Browser орчны утгыг SSR-safe уншина: useSyncExternalStore нь server snapshot-той тул
// hydration mismatch үүсгэхгүй, мөн эффект дотор синхрон setState хийлгүйгээр уншдаг
// (react-hooks/set-state-in-effect дүрмийг хангана). getSnapshot үргэлж примитив буцаах ёстой.
import { useSyncExternalStore } from "react";

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
