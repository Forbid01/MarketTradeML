"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions";
import { useT, useLocale } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { formatMNT } from "@/lib/format";
import { ShieldCheck } from "@/components/icons";

// Худалдан авалт ХОЁР алхамтай: товч → үнийн нэгтгэл бүхий баталгаажуулах самбар →
// захиалга үүсэх. Нэг товшилтоор санамсаргүй захиалга үүсгэж listing нөөцлөгдөхөөс сэргийлнэ.
export default function BuyButton({ listingId, price }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const call = useAction();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function buy() {
    setBusy(true);
    setErr(null);
    const r = await call(createOrder, listingId);
    if (r.error) {
      setErr(r.error);
      setBusy(false);
      return;
    }
    router.push(`/orders/${r.orderId}`);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="space-y-3 rounded-xl border border-violet/30 bg-violet/10 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-50">{t("buy.confirmTitle")}</h3>
        {price != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t("buy.total")}</span>
            <span className="text-base font-bold text-azure">{formatMNT(price, locale)}</span>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
          {t("buy.confirmNote")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={buy}
            disabled={busy}
            className="flex-1 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t("buy.creating") : t("buy.confirm")}
          </button>
          <button
            onClick={() => { setConfirming(false); setErr(null); }}
            disabled={busy}
            className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.03] disabled:opacity-50"
          >
            {t("buy.cancel")}
          </button>
        </div>
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
    >
      {t("buy.cta")}
    </button>
  );
}
