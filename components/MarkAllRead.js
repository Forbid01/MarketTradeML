"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { Check } from "@/components/icons";

export default function MarkAllRead() {
  const router = useRouter();
  const t = useT();
  const call = useAction();
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    await call(markAllRead);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={mark}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-azure hover:bg-white/[0.03] hover:border-violet/40 disabled:opacity-50"
    >
      <Check size={14} className="text-azure" />
      {t("notif.markAll")}
    </button>
  );
}
