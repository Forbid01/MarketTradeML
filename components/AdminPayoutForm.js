"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRecordPayout } from "@/lib/actions";
import { formatMNT } from "@/lib/format";
import { useT, useLocale } from "@/lib/i18n/client";

// Build Plan 2.6: гар payout бүртгэх (adminRecordPayout server action).
export default function AdminPayoutForm({ orderId, netAmount }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [form, setForm] = useState({ method: "bank", bank_account: "", ref: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await adminRecordPayout(
      orderId,
      form.method,
      form.bank_account.trim() || null,
      form.ref.trim() || null
    );
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]";

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4">
      <h3 className="text-sm font-semibold text-emerald-300">
        {t("adminAct.payoutTitle", { amount: formatMNT(netAmount, locale) })}
      </h3>
      <input className={field} placeholder={t("adminAct.bankPh")} value={form.bank_account} onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))} />
      <input className={field} placeholder={t("adminAct.refPh")} value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} />
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {t("adminAct.recordPayout")}
      </button>
    </form>
  );
}
