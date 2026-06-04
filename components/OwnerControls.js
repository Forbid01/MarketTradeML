"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setListingStatus, softDeleteListing } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { BadgeCheck, Wrench } from "@/components/icons";

export default function OwnerControls({ listingId, status }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function setStatus(next) {
    setBusy(true);
    setErr("");
    const res = await setListingStatus(listingId, next);
    setBusy(false);
    if (res?.error) {
      setErr(res.error);
      return;
    }
    router.refresh();
  }

  async function softDelete() {
    if (!confirm(t("owner.confirmDelete"))) return;
    setBusy(true);
    setErr("");
    const res = await softDeleteListing(listingId);
    setBusy(false);
    if (res?.error) {
      setErr(res.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (status === "reserved" || status === "sold") {
    return (
      <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
        {t("owner.cannotEdit", { status: t(`listingStatus.${status}`) })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/listings/${listingId}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          <Wrench size={15} /> {t("owner.edit")}
        </Link>
        {status === "active" ? (
          <button
            onClick={() => setStatus("hidden")}
            disabled={busy}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            {t("owner.hide")}
          </button>
        ) : (
          <button
            onClick={() => setStatus("active")}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-sm text-[#7dd3fc] hover:brightness-110 disabled:opacity-50"
          >
            <BadgeCheck size={16} className="text-[#38BDF8]" />
            {t("owner.activate")}
          </button>
        )}
        <button
          onClick={softDelete}
          disabled={busy}
          className="rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm text-red-300 hover:bg-red-500/25 disabled:opacity-50"
        >
          {t("owner.delete")}
        </button>
      </div>
      {err ? <p className="text-sm text-red-300">{err}</p> : null}
    </div>
  );
}
