"use client";

import { useEffect, useRef } from "react";
import { register, prefersReducedMotion } from "./scrollManager";

// Scroll-linked parallax: элемент viewport-оор дайрах үед translateY (+сонголтоор
// зэрэгцээ зөөлөн зум). speed = нийт зөөлтийн хүрээ (px). Сөрөг = эсрэг чиглэл.
// reduced-motion үед хөдөлгөөнгүй. Дотроо CSS animation-той хүүхэдтэй зөрчихгүйн
// тулд parallax-г энэ зориулалтын wrapper элемент дээр л хийнэ.
export default function Parallax({
  children,
  speed = 60,
  zoom = 0,
  className = "",
  style,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    return register(el, (p) => {
      const y = (p - 0.5) * -speed; // дээш гарах тусам сөрөг рүү
      const s = zoom ? 1 + (1 - Math.abs(p - 0.5) * 2) * zoom : 1;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)${zoom ? ` scale(${s.toFixed(4)})` : ""}`;
    });
  }, [speed, zoom]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform", ...style }}>
      {children}
    </div>
  );
}
