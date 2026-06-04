"use client";

import { useEffect, useRef } from "react";

// Scroll-reveal: viewport-д орохд .in нэмж globals.css дахь .reveal-г идэвхжүүлнэ.
// variant: up | down | left | right | scale | blur — орж ирэх чиглэл/маяг.
// delay: stagger (ms). once=false бол гарахад дахин нуугдаж, дахин харагдана.
export default function Reveal({ children, delay = 0, variant = "up", once = true, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("in");
            if (once) io.unobserve(el);
          } else if (!once) {
            el.classList.remove("in");
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div ref={ref} data-v={variant} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>
      {children}
    </div>
  );
}
