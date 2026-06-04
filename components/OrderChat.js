"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

// Build Plan 1.12: захиалга тус бүрийн чат — Realtime + visibilitychange REST refetch
// (iOS Safari WebSocket тасралтыг нөхөх heartbeat).
export default function OrderChat({ orderId, myUserId, initialMessages }) {
  const t = useT();
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState(initialMessages ?? []);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${orderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `order_id=eq.${orderId}` },
        (payload) =>
          setMessages((m) => (m.some((x) => x.id === payload.new.id) ? m : [...m, payload.new]))
      )
      .subscribe();

    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setBody("");
    const { data, error } = await supabase
      .from("messages")
      .insert({ order_id: orderId, sender_id: myUserId, body: text })
      .select("id, sender_id, body, created_at")
      .single();
    setBusy(false);
    if (error) setBody(text);
    else setMessages((m) => (m.some((x) => x.id === data.id) ? m : [...m, data]));
  }

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">{t("chat.title")}</h3>

      <div className="flex max-h-80 min-h-[8rem] flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">{t("chat.empty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                    {formatDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t("chat.send")}
        </button>
      </form>
    </section>
  );
}
