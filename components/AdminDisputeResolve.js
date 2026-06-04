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
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
        <ClipboardCheck size={16} /> {t("adminAct.resolveTitle")}
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t("adminAct.notePh")}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => resolve("released")} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
          {t("adminAct.release")}
        </button>
        <button disabled={busy} onClick={() => resolve("refunded")} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>
          {t("adminAct.refund")}
        </button>
        <button disabled={busy} onClick={() => resolve("rejected")} className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
          {t("adminAct.reject")}
        </button>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
