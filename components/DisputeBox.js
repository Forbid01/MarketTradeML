"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { Shield } from "@/components/icons";

// Build Plan 1.13: маргаан нээх (open_dispute RPC). Шийдвэрлэлт админ талд (AdminDisputeResolve).
export default function DisputeBox({ orderId, status, dispute, canOpen }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function open(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("open_dispute", {
      p_order_id: orderId,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) setErr(error.message);
    else router.refresh();
  }

  if (dispute) {
    return (
      <section className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold text-red-700">
          <Shield size={16} className="text-red-700" />
          {t("dispute.heading")}
        </h3>
        <p className="text-slate-600"><b>{t("dispute.reason")}:</b> {dispute.reason}</p>
        <p className="text-slate-500">{t("dispute.status")}: {t(`dispute.${dispute.status}`)}</p>
        {dispute.admin_note && <p className="text-slate-500"><b>{t("dispute.admin")}:</b> {dispute.admin_note}</p>}
        <p className="text-xs text-slate-400">{formatDateTime(dispute.created_at)}</p>
      </section>
    );
  }

  if (!canOpen) return null;

  return (
    <form onSubmit={open} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Shield size={16} className="text-slate-500" />
        {t("dispute.openTitle")}
      </h3>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder={t("dispute.reasonPh")}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button
        disabled={busy}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {t("dispute.openBtn")}
      </button>
    </form>
  );
}
