"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionOrder } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import Button from "@/components/ui/Button";

// Build Plan 1.10: escrow төлөв шилжилтийг transitionOrder server action-аар (атомик, FOR UPDATE).
export default function EscrowActions({ orderId, status, isBuyer, isSeller, isAdmin }) {
  const router = useRouter();
  const t = useT();
  const call = useAction();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function act(target) {
    setBusy(true);
    setErr(null);
    const res = await call(transitionOrder, orderId, target);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  const actions = [];

  if (status === "created") {
    if (isBuyer || isAdmin)
      actions.push(<Button key="cancel" variant="ghost" disabled={busy} onClick={() => act("cancelled")}>{t("escrow.cancel")}</Button>);
    if (isAdmin)
      actions.push(<Button key="paid" disabled={busy} onClick={() => act("paid")}>{t("escrow.markPaid")}</Button>);
  }
  if (status === "paid" && (isSeller || isAdmin)) {
    actions.push(<Button key="transfer" disabled={busy} onClick={() => act("transferring")}>{t("escrow.startTransfer")}</Button>);
  }
  if (status === "transferring" && (isBuyer || isAdmin)) {
    actions.push(<Button key="inspect" disabled={busy} onClick={() => act("inspecting")}>{t("escrow.startInspect")}</Button>);
  }
  if (status === "inspecting" && (isBuyer || isAdmin)) {
    actions.push(<Button key="complete" variant="success" disabled={busy} onClick={() => act("completed")}>{t("escrow.complete")}</Button>);
  }
  // disputed төлвийн шийдвэрлэлт нь AdminDisputeResolve-д (маргааны мөр + тэмдэглэл + audit).

  if (!actions.length && !err) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{actions}</div>
      {status === "created" && (isBuyer && !isAdmin) && (
        <p className="text-xs text-slate-400">{t("escrow.payNote")}</p>
      )}
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
