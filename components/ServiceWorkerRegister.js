"use client";

import { useEffect } from "react";

// SW-ийг зөвхөн PRODUCTION-д бүртгэнэ: dev-д Turbopack-ийн chunk URL тогтмол тул
// sw.js-ийн cache-first стратеги ХУУЧИН код үйлчилж HMR/шинэчлэлтийг эвддэг.
// Dev-д өмнө нь бүртгэгдсэн SW байвал идэвхгүй болгож цэвэрлэнэ.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
