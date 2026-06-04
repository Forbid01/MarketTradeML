"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { boostTransition, assignBooster, setBoostProgress, adminRecordBoostPayout } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";

// Boost захиалгын явцыг удирдах (админ/booster). Escrow: completed → admin олголт бүртгэнэ.
export default function BoostAdmin({ boostId, status, matches = 0, progress = 0, payoutStatus = "pending", isAdmin, isBooster }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState("");
  const [prog, setProg] = useState(progress);

  async function act(fn) {
    setBusy(true);
    setErr(null);
    const r = await fn();
    setBusy(false);
    if (r?.error) setErr(r.error);
    else router.refresh();
  }

  const btn = "rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50";
  const inProgress = status === "in_progress";
  const liveStage = status === "paid" || inProgress;

  return (
    <div className="space-y-3 rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-4">
      <h3 className="text-sm font-semibold text-[#F5C451]">{t("boost.adminControls")}</h3>

      {liveStage && (
        <div className="flex flex-wrap gap-2">
          {status === "paid" && (
            <button disabled={busy} onClick={() => act(() => boostTransition(boostId, "in_progress"))}
              className={`${btn} bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white hover:brightness-110`}>
              {t("boost.start")}
            </button>
          )}
          {inProgress && (
            <button disabled={busy} onClick={() => act(() => boostTransition(boostId, "completed"))}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
              {t("boost.complete")}
            </button>
          )}
          {isAdmin && (
            <>
              <button disabled={busy} onClick={() => act(() => boostTransition(boostId, "refunded"))}
                className={`${btn} border border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25`}>
                {t("boost.refund")}
              </button>
              <button disabled={busy} onClick={() => act(() => boostTransition(boostId, "cancelled"))}
                className={`${btn} border border-white/15 text-slate-200 hover:bg-white/5`}>
                {t("boost.cancel")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Явц шинэчлэх (booster/админ) */}
      {inProgress && matches > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-300">
            <span>{t("boost.updateProgress")}</span>
            <span className="font-semibold text-slate-100">{t("boost.matchesDone", { done: prog, total: matches })}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={matches} value={prog} onChange={(e) => setProg(Number(e.target.value))} className="flex-1 accent-[#6D5DF6]" />
            <button disabled={busy || prog === progress} onClick={() => act(() => setBoostProgress(boostId, prog))}
              className={`${btn} border border-white/15 text-slate-200 hover:bg-white/5`}>
              {t("boost.updateProgress")}
            </button>
          </div>
        </div>
      )}

      {/* Booster хуваарилах (админ) */}
      {isAdmin && liveStage && (
        <div className="flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("boost.boosterEmail")}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-[#6D5DF6]" />
          <button disabled={busy || !email} onClick={() => act(() => assignBooster(boostId, email))}
            className={`${btn} border border-white/15 text-slate-200 hover:bg-white/5`}>
            {t("boost.assign")}
          </button>
        </div>
      )}

      {/* Олголт (админ, дууссан) */}
      {isAdmin && status === "completed" && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="text-xs text-slate-300">
            {t("boost.payoutLabel")}: <b className="text-slate-100">{t(`payoutStatus.${payoutStatus}`)}</b>
          </span>
          {payoutStatus === "pending" && (
            <button disabled={busy} onClick={() => act(() => adminRecordBoostPayout(boostId))}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
              {t("boost.recordPayout")}
            </button>
          )}
        </div>
      )}

      {err && <p className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
