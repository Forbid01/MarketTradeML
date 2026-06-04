"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatMNT } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

// Build Plan 2.6: гар payout бүртгэх (admin_record_payout RPC).
export default function AdminPayoutForm({ orderId, netAmount }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [form, setForm] = useState({ method: "bank", bank_account: "", ref: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("admin_record_payout", {
      p_order_id: orderId,
      p_method: form.method,
      p_bank_account: form.bank_account.trim() || null,
      p_external_txn_ref: form.ref.trim() || null,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else router.refresh();
  }

  const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="text-sm font-semibold text-emerald-700">
        {t("adminAct.payoutTitle", { amount: formatMNT(netAmount) })}
      </h3>
      <input className={field} placeholder={t("adminAct.bankPh")} value={form.bank_account} onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))} />
      <input className={field} placeholder={t("adminAct.refPh")} value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} />
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
        {t("adminAct.recordPayout")}
      </button>
    </form>
  );
}
