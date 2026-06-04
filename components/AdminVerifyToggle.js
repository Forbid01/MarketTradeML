"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminSetVerified } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { BadgeCheck } from "@/components/icons";

// Build Plan 2.1: зарагчийн баталгаажсан тэмдгийг олгох/буцаах (admin_set_verified RPC).
export default function AdminVerifyToggle({ userId, isVerified }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function toggle() {
    setBusy(true);
    setErr(null);
    const res = await adminSetVerified(userId, !isVerified);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-1.5 text-xs text-[#7dd3fc] hover:bg-[#38BDF8]/20 disabled:opacity-50"
      >
        <BadgeCheck size={14} className="text-[#38BDF8]" />
        {isVerified ? t("adminAct.unverify") : t("adminAct.verify")}
      </button>
      {err && <span className="text-xs text-red-300">{err}</span>}
    </div>
  );
}
