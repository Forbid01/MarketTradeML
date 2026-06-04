"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

export default function BuyButton({ listingId }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function buy() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("order_create", { p_listing_id: listingId });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    router.push(`/orders/${row.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        onClick={buy}
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-100"
      >
        {busy ? t("buy.creating") : t("buy.cta")}
      </button>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
