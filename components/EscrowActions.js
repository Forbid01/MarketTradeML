"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

// Build Plan 1.10: escrow төлөв шилжилтийг order_transition RPC-ээр (атомик, FOR UPDATE).
export default function EscrowActions({ orderId, status, isBuyer, isSeller, isAdmin }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function act(target) {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("order_transition", {
      p_order_id: orderId,
      p_target: target,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else router.refresh();
  }

  const btn = "rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50";
  const primary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
  const ghost = `${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`;
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
        <p className="text-xs text-slate-500">{t("escrow.payNote")}</p>
      )}
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
