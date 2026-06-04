"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";

export default function BuyButton({ listingId }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function buy() {
    setBusy(true);
    setErr(null);
    const r = await createOrder(listingId);
    if (r.error) {
      setErr(r.error);
      setBusy(false);
      return;
    }
    router.push(`/orders/${r.orderId}`);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        onClick={buy}
        disabled={busy}
        className="w-full rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy ? t("buy.creating") : t("buy.cta")}
      </button>
      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
