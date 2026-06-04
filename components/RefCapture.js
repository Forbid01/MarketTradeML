"use client";

import { useEffect } from "react";

// URL дахь ?ref=КОД-ыг "ref" cookie болгож хадгална (30 хоног). Нэвтрэх үед auth.js
// үүнийг уншиж шинэ хэрэглэгчийн referred_by-г онооно. Мэдрэмжтэй мэдээлэл биш.
export default function RefCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
        document.cookie = `ref=${encodeURIComponent(ref.toUpperCase())}; path=/; max-age=2592000; samesite=lax`;
      }
    } catch {
      /* no-op */
    }
  }, []);
  return null;
}
