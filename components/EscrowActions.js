"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionOrder } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";

// Build Plan 1.10: escrow төлөв шилжилтийг transitionOrder server action-аар (атомик, FOR UPDATE).
export default function EscrowActions({ orderId, status, isBuyer, isSeller, isAdmin }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function act(target) {
    setBusy(true);
    setErr(null);
    const res = await transitionOrder(orderId, target);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  const btn = "rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50";
  const primary = `${btn} bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white hover:brightness-110`;
  const ghost = `${btn} border border-white/15 text-slate-200 hover:bg-white/[0.03]`;
  const ok = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;

  const actions = [];

  if (status === "created") {
    if (isBuyer || isAdmin)
      actions.push(<button key="cancel" className={ghost} disabled={busy} onClick={() => act("cancelled")}>{t("escrow.cancel")}</button>);
    if (isAdmin)
      actions.push(<button key="paid" className={primary} disabled={busy} onClick={() => act("paid")}>{t("escrow.markPaid")}</button>);
  }
  if (status === "paid" && (isSeller || isAdmin)) {
    actions.push(<button key="transfer" className={primary} disabled={busy} onClick={() => act("transferring")}>{t("escrow.startTransfer")}</button>);
  }
  if (status === "transferring" && (isBuyer || isAdmin)) {
    actions.push(<button key="inspect" className={primary} disabled={busy} onClick={() => act("inspecting")}>{t("escrow.startInspect")}</button>);
  }
  if (status === "inspecting" && (isBuyer || isAdmin)) {
    actions.push(<button key="complete" className={ok} disabled={busy} onClick={() => act("completed")}>{t("escrow.complete")}</button>);
  }
  // disputed төлвийн шийдвэрлэлт нь AdminDisputeResolve-д (маргааны мөр + тэмдэглэл + audit).

  if (!actions.length && !err) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{actions}</div>
      {status === "created" && (isBuyer && !isAdmin) && (
        <p className="text-xs text-slate-400">{t("escrow.payNote")}</p>
      )}
      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
