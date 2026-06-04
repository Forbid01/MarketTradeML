"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAllRead } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { Check } from "@/components/icons";

export default function MarkAllRead() {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function mark() {
    setBusy(true);
    await markAllRead();
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={mark}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-blue-600 hover:bg-slate-50 hover:border-blue-400 disabled:opacity-50"
    >
      <Check size={14} className="text-blue-600" />
      {t("notif.markAll")}
    </button>
  );
}
