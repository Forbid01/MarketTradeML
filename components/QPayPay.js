"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { RefreshCw } from "@/components/icons";

// Build Plan 3.4: QPay-ээр төлөх. create-invoice Edge Function-ийг дуудаж QR/deeplink харуулна.
export default function QPayPay({ orderId }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.functions.invoke("create-invoice", {
      body: { order_id: orderId },
    });
    setBusy(false);
    if (error || data?.error) {
      setErr(error?.message ?? data?.error ?? t("qpay.err"));
      return;
    }
    setInv(data);
  }

  if (inv) {
    const qrSrc = inv.qr_image
      ? inv.qr_image.startsWith("data:")
        ? inv.qr_image
        : `data:image/png;base64,${inv.qr_image}`
      : null;
    return (
      <div className="space-y-3">
        {qrSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="QPay QR" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" />
        )}
        {(inv.urls ?? []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {inv.urls.map((u) => (
              <a
                key={u.name ?? u.link}
                href={u.link}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm hover:border-blue-400 hover:bg-slate-50"
              >
                {u.name ?? "Банк"}
              </a>
            ))}
          </div>
        )}
        <button
          onClick={() => router.refresh()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          {t("qpay.check")}
        </button>
        <p className="text-center text-xs text-slate-400">{t("qpay.autoNote")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={pay}
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? t("qpay.creating") : t("qpay.pay")}
      </button>
      {err && <p className="text-sm text-red-700">{err}</p>}
    </div>
  );
}
