"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openDispute } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { Shield } from "@/components/icons";

// Build Plan 1.13: маргаан нээх (openDispute server action). Шийдвэрлэлт админ талд (AdminDisputeResolve).
export default function DisputeBox({ orderId, status, dispute, canOpen }) {
  const router = useRouter();
  const t = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function open(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setErr(null);
    const res = await openDispute(orderId, reason.trim());
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  if (dispute) {
    return (
      <section className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/15 p-4 text-sm">
        <h3 className="flex items-center gap-2 font-semibold text-red-300">
          <Shield size={16} className="text-red-300" />
          {t("dispute.heading")}
        </h3>
        <p className="text-slate-300"><b>{t("dispute.reason")}:</b> {dispute.reason}</p>
        <p className="text-slate-400">{t("dispute.status")}: {t(`dispute.${dispute.status}`)}</p>
        {dispute.admin_note && <p className="text-slate-400"><b>{t("dispute.admin")}:</b> {dispute.admin_note}</p>}
        <p className="text-xs text-slate-500">{formatDateTime(dispute.created_at)}</p>
      </section>
    );
  }

  if (!canOpen) return null;

  return (
    <form onSubmit={open} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-50">
        <Shield size={16} className="text-slate-400" />
        {t("dispute.openTitle")}
      </h3>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder={t("dispute.reasonPh")}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]"
      />
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button
        disabled={busy}
        className="rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:brightness-110 disabled:opacity-50"
      >
        {t("dispute.openBtn")}
      </button>
    </form>
  );
}
