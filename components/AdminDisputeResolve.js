"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminResolveDispute } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { ClipboardCheck } from "@/components/icons";

// Build Plan 2.1: маргаан шийдвэрлэх (adminResolveDispute action — мөр + тэмдэглэл + audit).
export default function AdminDisputeResolve({ disputeId }) {
  const router = useRouter();
  const t = useT();
  const call = useAction();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function resolve(outcome) {
    setBusy(true);
    setErr(null);
    const res = await call(adminResolveDispute, disputeId, outcome, note.trim() || null);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-2 rounded-xl border border-gold/30 bg-gold/10 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gold">
        <ClipboardCheck size={16} /> {t("adminAct.resolveTitle")}
      </h3>
      <Textarea
        aria-label={t("adminAct.notePh")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t("adminAct.notePh")}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => resolve("released")}>
          {t("adminAct.release")}
        </Button>
        <Button size="sm" variant="danger" disabled={busy} onClick={() => resolve("refunded")}>
          {t("adminAct.refund")}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => resolve("rejected")}>
          {t("adminAct.reject")}
        </Button>
      </div>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
