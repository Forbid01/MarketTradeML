"use client";

// Зарын зургийн галерей + бүтэн дэлгэцийн lightbox. Зураг бол бүтээгдэхүүний гол
// нотолгоо тул жижиг strip дээр дарж томруулж үзэх боломж олгоно.
// A11y: role="dialog", Escape хаана, сум товчоор шилжинэ, хаагдахад focus буцна.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useT } from "@/lib/i18n/client";
import { X, ArrowRight } from "@/components/icons";

// Dialog доторх focusable элементүүдээр Tab-ийг цикллэнэ (эхний↔сүүлчийн wrap) —
// trap-гүй бол фокус ард талын хуудас руу "урсан" гардаг байсан.
function trapTab(e, container) {
  if (!container) return;
  const focusables = container.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export default function GalleryLightbox({ images, title }) {
  const t = useT();
  const [openIdx, setOpenIdx] = useState(null);
  const closeBtnRef = useRef(null);
  const lastTriggerRef = useRef(null);
  const dialogRef = useRef(null);
  const touchStartX = useRef(null);

  const close = useCallback(() => {
    setOpenIdx(null);
    lastTriggerRef.current?.focus();
  }, []);
  const step = useCallback(
    (dir) => setOpenIdx((i) => (i == null ? i : (i + dir + images.length) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (openIdx == null) return;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Tab") trapTab(e, dialogRef.current);
    };
    document.addEventListener("keydown", onKey);
    // Ард талын хуудас гүйхээс сэргийлнэ
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openIdx, close, step]);

  return (
    <>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={(e) => { lastTriggerRef.current = e.currentTarget; setOpenIdx(i); }}
            aria-label={t("gallery.view", { n: i + 1, total: images.length })}
            className="group relative h-56 w-80 shrink-0 snap-start cursor-zoom-in overflow-hidden rounded-lg border border-white/10 transition hover:border-violet/40"
          >
            <Image
              src={img.url}
              alt={`${title} — ${i + 1}`}
              fill
              sizes="320px"
              priority={i === 0}
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Portal: app/template.js-ийн transition transform нь fixed элементийг өөртөө
          баридаг (containing block) тул overlay-г body руу гаргаж бүтэн дэлгэц бүрхэнэ. */}
      {openIdx != null && createPortal(
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
          onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            // Мобайл swipe: 50px-ээс их хэвтээ шударвал зураг солино
            if (touchStartX.current == null) return;
            const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          }}
        >
          <div className="relative h-[85vh] w-[92vw] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[openIdx].url}
              alt={`${title} — ${openIdx + 1}`}
              fill
              sizes="92vw"
              loading="eager"
              className="object-contain"
            />
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            aria-label={t("gallery.close")}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label={t("gallery.prev")}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <ArrowRight size={18} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label={t("gallery.next")}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <ArrowRight size={18} />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#06070E]/80 px-3 py-1 text-xs text-slate-300">
                {openIdx + 1} / {images.length}
              </p>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
