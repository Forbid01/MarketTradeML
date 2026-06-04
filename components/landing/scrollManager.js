// Нэг л shared scroll/rAF давталга — олон parallax элемент болон бусад scroll-
// сонсогчид нэг frame дотор ажиллана (тус бүр өөрийн listener нэмэхгүй). Зөвхөн client.
//
//  • register(el, fn) — элемент бүрд viewport-доторх явц (0→1) + bcr дамжуулна.
//  • subscribe(fn)    — элементгүй, frame бүрт нэг удаа дуудагдах (ж: ScrollProgress).

let items = [];
let ticks = [];
let ticking = false;
let bound = false;

function run() {
  ticking = false;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    // p=0: доороос дөнгөж орж ирэх | p=1: дээгүүр гарч дуусахад
    const raw = (vh - r.top) / (vh + r.height);
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    it.fn(p, r, vh);
  }
  for (const fn of ticks) fn();
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(run);
  }
}

function bind() {
  if (bound) return;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  bound = true;
}

function maybeUnbind() {
  if (items.length === 0 && ticks.length === 0 && bound) {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    bound = false;
  }
}

// el-ийг бүртгэж, cleanup функц буцаана.
export function register(el, fn) {
  const item = { el, fn };
  items.push(item);
  bind();
  onScroll();
  return () => {
    items = items.filter((i) => i !== item);
    maybeUnbind();
  };
}

// Frame бүрт дуудагдах ерөнхий сонсогч (элементгүй). cleanup функц буцаана.
export function subscribe(fn) {
  ticks.push(fn);
  bind();
  onScroll();
  return () => {
    ticks = ticks.filter((f) => f !== fn);
    maybeUnbind();
  };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}
