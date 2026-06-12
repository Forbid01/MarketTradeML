"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sendMessage, sendBoostMessage } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { useT, useLocale } from "@/lib/i18n/client";
import { Clock, Check, ArrowRight } from "@/components/icons";

// Захиалга тус бүрийн чат. "Realtime" = ухаалаг polling:
//  • монотон seq cursor ашиглан зөвхөн ШИНЭ мессежийг татна (бүгдийг биш).
//  • Таб нуугдсан үед polling зогсож, харагдмагц шууд татна.
//  • Идэвхгүй чатад interval уртасна (DB унших багасгана).
//  • Optimistic илгээлт: pending → амжилттай / алдаатай (retry).
//  • Ухаалаг auto-scroll: доод хэсэгт байвал л гүйлгэх, эс бөгөөс "шинэ мессеж" pill.
// Ирээдүйд Pusher нэмэх бол applyIncoming(...)-г push event-ээс дуудахад л хангалттай.

const BASE_DELAY = 4000;
const IDLE_DELAY = 10000;
const IDLE_AFTER = 4; // дараалсан хоосон poll-ын дараа удаашрах
const STICK_PX = 80; // доод хэсэгт "наалдсан" гэж үзэх босго

const seqOf = (m) => (m?.seq != null ? Number(m.seq) : Number.MAX_SAFE_INTEGER);
function byOrder(a, b) {
  return seqOf(a) - seqOf(b); // тэнцвэл (pending temp-ууд) stable sort нь дарааллыг хадгална
}
function lastRealSeq(msgs) {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m.pending && !m.failed && m.seq != null) return m.seq;
  }
  return null;
}

export default function OrderChat({ orderId, myUserId, initialMessages, kind = "order" }) {
  const t = useT();
  const locale = useLocale();
  const [messages, setMessages] = useState(() => (initialMessages ?? []).slice().sort(byOrder));
  const [body, setBody] = useState("");
  const [hasNew, setHasNew] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const cursorRef = useRef(lastRealSeq(initialMessages ?? [])); // сүүлийн real seq (string|null)
  const atBottomRef = useRef(true);
  const stickRef = useRef(true); // дараагийн render-д доош гүйлгэх үү
  const prevLenRef = useRef((initialMessages ?? []).length);
  const tempSeq = useRef(0);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);
  const emptyRef = useRef(0);
  const failRef = useRef(0);

  // Шинэ мессежийг нэгтгэх (poll эсвэл ирээдүйд push-аас). id-ээр давхцал шалгана;
  // өөрийн pending temp-ийн "цуурай" ирвэл түүнийг солино. Cursor-г seq-ээр урагшлуулна.
  const applyIncoming = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => m.id && !ids.has(m.id));
      if (!fresh.length) return prev;
      const next = prev.slice();
      for (const r of fresh) {
        if (r.sender_id === myUserId) {
          const ti = next.findIndex(
            (m) => m.pending && m.tempId && m.sender_id === myUserId && m.body === r.body
          );
          if (ti >= 0) next.splice(ti, 1);
        }
        next.push(r);
      }
      next.sort(byOrder);
      return next;
    });
    const last = incoming[incoming.length - 1]; // сервер seq-ээр өсөхөөр буцаана
    if (last?.seq != null) cursorRef.current = last.seq;
  }, [myUserId]);

  // ── Polling (adaptive + visibility-aware), setTimeout рекурсиэр ──
  const poll = useCallback(async function poll() {
    if (!mountedRef.current || typeof document === "undefined" || document.hidden) return;
    let added = false;
    try {
      const cur = cursorRef.current;
      // Route handler-ээр poll хийнэ (server action биш — client талд action-ууд
      // нэг дараалалд цувардаг тул poll нь бусад үйлдлийг хойшлуулдаг байсан)
      const qs = new URLSearchParams({ order: orderId });
      if (kind === "boost") qs.set("kind", "boost");
      if (cur != null) qs.set("after", String(cur));
      const res = await fetch(`/api/messages?${qs}`, { cache: "no-store" });
      const r = res.ok ? await res.json() : null;
      if (!mountedRef.current) return;
      if (r?.ok) {
        added = (r.messages?.length ?? 0) > 0;
        if (added) applyIncoming(r.messages);
        failRef.current = 0;
      } else {
        failRef.current += 1;
      }
    } catch {
      failRef.current += 1;
    }
    if (!mountedRef.current) return;
    setReconnecting(failRef.current >= 2);
    emptyRef.current = added ? 0 : emptyRef.current + 1;
    const delay = failRef.current > 0 ? BASE_DELAY : emptyRef.current >= IDLE_AFTER ? IDLE_DELAY : BASE_DELAY;
    if (!document.hidden) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(poll, delay);
    }
  }, [orderId, applyIncoming, kind]);

  useEffect(() => {
    mountedRef.current = true;
    timerRef.current = setTimeout(poll, BASE_DELAY);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        emptyRef.current = 0;
        clearTimeout(timerRef.current);
        poll(); // poll() өөрөө дараагийнхаа schedule хийнэ
      } else {
        clearTimeout(timerRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  // ── Ухаалаг auto-scroll ──
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
    if (atBottomRef.current && hasNew) setHasNew(false);
  }, [hasNew]);

  useLayoutEffect(() => {
    const grew = messages.length > prevLenRef.current;
    prevLenRef.current = messages.length;
    if (stickRef.current || atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasNew(false); // аль хэдийн false бол no-op
    } else if (grew) {
      setHasNew(true);
    }
    stickRef.current = false;
  }, [messages]);

  function jumpToBottom() {
    stickRef.current = true;
    setHasNew(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ── Илгээх (optimistic) ──
  const doSend = useCallback(async (text) => {
    const tempId = `temp-${tempSeq.current++}`;
    const temp = {
      id: tempId, tempId, sender_id: myUserId, body: text,
      created_at: new Date().toISOString(), pending: true,
    };
    stickRef.current = true;
    setMessages((prev) => [...prev, temp]);
    const r = await (kind === "boost" ? sendBoostMessage : sendMessage)(orderId, text);
    if (!mountedRef.current) return;
    if (r?.ok && r.message?.id) {
      const real = r.message;
      setMessages((prev) => {
        const without = prev.filter((m) => m.tempId !== tempId);
        if (without.some((m) => m.id === real.id)) return without.slice().sort(byOrder);
        return [...without, real].sort(byOrder);
      });
      if (real.seq != null && (cursorRef.current == null || Number(real.seq) > Number(cursorRef.current))) {
        cursorRef.current = real.seq;
      }
    } else {
      setMessages((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  }, [orderId, myUserId, kind]);

  function onSubmit(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBody("");
    doSend(text);
  }

  function retry(failed) {
    setMessages((prev) => prev.filter((m) => m.tempId !== failed.tempId));
    doSend(failed.body);
  }

  return (
    <section className="relative flex flex-col rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <h3 className="text-sm font-semibold text-slate-300">{t("chat.title")}</h3>
        {reconnecting && (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            {t("chat.reconnecting")}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={t("chat.title")}
        className="flex max-h-80 min-h-[8rem] flex-col gap-2 overflow-y-auto p-3"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">{t("chat.empty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUserId;
            return (
              // Өөрийн мессежийг live region-оос хасна (aria-live=off) — эс бөгөөс бичсэн
              // зүйлээ + pending төлвийн өөрчлөлтөө SR дээр давхар сонсдог байсан.
              <div key={m.id} aria-live={mine ? "off" : undefined} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-gradient-to-r from-violet to-azure text-white" : "bg-white/10 text-slate-100"
                  } ${m.pending ? "opacity-70" : ""} ${m.failed ? "ring-1 ring-red-400/60" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {m.pending ? (
                      <><Clock size={11} /> {t("chat.sending")}</>
                    ) : m.failed ? (
                      <button type="button" onClick={() => retry(m)} className="inline-flex items-center gap-1 text-red-200 underline">
                        {t("chat.failed")} · {t("chat.retry")}
                      </button>
                    ) : (
                      formatDateTime(m.created_at, locale)
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {hasNew && (
        <button
          type="button"
          onClick={jumpToBottom}
          aria-label={t("chat.newMessages")}
          className="absolute bottom-16 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-violet to-azure px-3 py-1 text-xs font-medium text-white shadow-lg"
        >
          {t("chat.newMessages")} <ArrowRight size={13} className="rotate-90" />
        </button>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-violet focus:ring-1 focus:ring-violet"
        />
        <button
          type="submit"
          disabled={!body.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          <Check size={15} /> {t("chat.send")}
        </button>
      </form>
    </section>
  );
}
