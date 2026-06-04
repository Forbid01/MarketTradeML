"use client";

import { useEffect, useRef } from "react";

// Scroll-reveal: viewport-д орохд .in нэмж globals.css дахь .reveal-г идэвхжүүлнэ.
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>
      {children}
    </div>
  );
}
