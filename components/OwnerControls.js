"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { BadgeCheck } from "@/components/icons";

export default function OwnerControls({ listingId, status }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function setStatus(next) {
    setBusy(true);
    await supabase.from("listings").update({ status: next }).eq("id", listingId);
    setBusy(false);
    router.refresh();
  }

  async function softDelete() {
    if (!confirm(t("owner.confirmDelete"))) return;
    setBusy(true);
    await supabase
      .from("listings")
      .update({ deleted_at: new Date().toISOString(), status: "hidden" })
      .eq("id", listingId);
    setBusy(false);
    router.push("/");
    router.refresh();
  }

  if (status === "reserved" || status === "sold") {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
        {t("owner.cannotEdit", { status: t(`listingStatus.${status}`) })}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" ? (
        <button
          onClick={() => setStatus("hidden")}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t("owner.hide")}
        </button>
      ) : (
        <button
          onClick={() => setStatus("active")}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          <BadgeCheck size={16} className="text-blue-600" />
          {t("owner.activate")}
        </button>
      )}
      <button
        onClick={softDelete}
        disabled={busy}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {t("owner.delete")}
      </button>
    </div>
  );
}
