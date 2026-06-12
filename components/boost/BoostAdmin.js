"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { boostTransition, assignBooster, setBoostProgress, adminRecordBoostPayout } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Boost захиалгын явцыг удирдах (админ/booster). Escrow: completed → admin олголт бүртгэнэ.
export default function BoostAdmin({ boostId, status, matches = 0, progress = 0, payoutStatus = "pending", isAdmin, isBooster }) {
  const router = useRouter();
  const t = useT();
  const call = useAction();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState("");
  const [prog, setProg] = useState(progress);

  async function act(fn) {
    setBusy(true);
    setErr(null);
    const r = await call(fn);
    setBusy(false);
    if (r?.error) setErr(r.error);
    else router.refresh();
  }

  const inProgress = status === "in_progress";
  const liveStage = status === "paid" || inProgress;

  return (
    <div className="space-y-3 rounded-xl border border-gold/30 bg-gold/10 p-4">
      <h3 className="text-sm font-semibold text-gold">{t("boost.adminControls")}</h3>

      {liveStage && (
        <div className="flex flex-wrap gap-2">
          {status === "paid" && (
            <Button size="sm" disabled={busy} onClick={() => act(() => boostTransition(boostId, "in_progress"))}>
              {t("boost.start")}
            </Button>
          )}
          {inProgress && (
            <Button size="sm" variant="success" disabled={busy} onClick={() => act(() => boostTransition(boostId, "completed"))}>
              {t("boost.complete")}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => act(() => boostTransition(boostId, "refunded"))}>
                {t("boost.refund")}
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => boostTransition(boostId, "cancelled"))}>
                {t("boost.cancel")}
              </Button>
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
            <input type="range" min={0} max={matches} value={prog} onChange={(e) => setProg(Number(e.target.value))} className="flex-1 accent-violet" />
            <Button size="sm" variant="ghost" disabled={busy || prog === progress} onClick={() => act(() => setBoostProgress(boostId, prog))}>
              {t("boost.updateProgress")}
            </Button>
          </div>
        </div>
      )}

      {/* Booster хуваарилах (админ) */}
      {isAdmin && liveStage && (
        <div className="flex gap-2">
          <Input size="sm" className="flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("boost.boosterEmail")} />
          <Button size="sm" variant="ghost" disabled={busy || !email} onClick={() => act(() => assignBooster(boostId, email))}>
            {t("boost.assign")}
          </Button>
        </div>
      )}

      {/* Олголт (админ, дууссан) */}
      {isAdmin && status === "completed" && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="text-xs text-slate-300">
            {t("boost.payoutLabel")}: <b className="text-slate-100">{t(`payoutStatus.${payoutStatus}`)}</b>
          </span>
          {payoutStatus === "pending" && (
            <Button size="sm" variant="success" disabled={busy} onClick={() => act(() => adminRecordBoostPayout(boostId))}>
              {t("boost.recordPayout")}
            </Button>
          )}
        </div>
      )}

      {err && <p role="alert" className="text-xs text-red-300">{err}</p>}
    </div>
  );
}
