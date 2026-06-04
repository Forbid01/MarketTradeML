"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminResolveDispute } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { ClipboardCheck } from "@/components/icons";

// Build Plan 2.1: маргаан шийдвэрлэх (adminResolveDispute action — мөр + тэмдэглэл + audit).
export default function AdminDisputeResolve({ disputeId }) {
  const router = useRouter();
  const t = useT();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function resolve(outcome) {
    setBusy(true);
    setErr(null);
    const res = await adminResolveDispute(disputeId, outcome, note.trim() || null);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  const btn = "rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";

  return (
    <div className="space-y-2 rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#F5C451]">
        <ClipboardCheck size={16} /> {t("adminAct.resolveTitle")}
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t("adminAct.notePh")}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]"
      />
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => resolve("released")} className={`${btn} bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white hover:brightness-110`}>
          {t("adminAct.release")}
        </button>
        <button disabled={busy} onClick={() => resolve("refunded")} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
          {t("adminAct.refund")}
        </button>
        <button disabled={busy} onClick={() => resolve("rejected")} className={`${btn} border border-white/15 text-slate-200 hover:bg-white/10`}>
          {t("adminAct.reject")}
        </button>
      </div>
      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
