"use client";

// Текст viewport-д ороход үсгүүд санамсаргүй тэмдэгтээс жинхэнэ рүүгээ "тайлагдана"
// (raven-trading.com-ын ScrambleText маягийн). SSR-д бүтэн текстээ рендэрлэдэг тул
// SEO/no-JS аюулгүй; reduced-motion үед эффектгүй шууд текст.
import { useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭӨҮ0123456789#$%&";

export default function ScrambleText({ text, as: Tag = "span", duration = 900, className, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof text !== "string" || !text) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || started) continue;
          started = true;
          io.disconnect();
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const reveal = Math.floor(p * text.length);
            let out = text.slice(0, reveal);
            for (let i = reveal; i < text.length; i++) {
              const ch = text[i];
              out += ch === " " ? " " : CHARS[(Math.random() * CHARS.length) | 0];
            }
            el.textContent = out;
            if (p < 1) raf = requestAnimationFrame(tick);
            else el.textContent = text;
          };
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, duration]);

  return (
    <Tag ref={ref} className={className} {...props}>
      {text}
    </Tag>
  );
}
