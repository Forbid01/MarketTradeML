"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQpayInvoice, checkPaymentNow } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { RefreshCw } from "@/components/icons";

// Build Plan 3.4: QPay-ээр төлөх. create-invoice Edge Function-ийг дуудаж QR/deeplink харуулна.
export default function QPayPay({ orderId }) {
  const router = useRouter();
  const t = useT();
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    const r = await createQpayInvoice(orderId);
    setBusy(false);
    if (r.error) {
      setErr(r.error ?? t("qpay.err"));
      return;
    }
    setInv(r.invoice);
  }

  // QPay-аас идэвхтэй шалгаад (callback хүлээлгүй) баталгаажвал хуудсыг шинэчилнэ.
  async function recheck() {
    setChecking(true);
    await checkPaymentNow(orderId);
    setChecking(false);
    router.refresh();
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
          <img src={qrSrc} alt="QPay QR" className="mx-auto h-48 w-48 rounded-lg bg-white/95 p-2" />
        )}
        {(inv.urls ?? []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {inv.urls.map((u) => (
              <a
                key={u.name ?? u.link}
                href={u.link}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:border-[#6D5DF6]/40 hover:bg-white/10"
              >
                {u.name ?? "Банк"}
              </a>
            ))}
          </div>
        )}
        <button
          onClick={recheck}
          disabled={checking}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? t("qpay.checking") : t("qpay.check")}
        </button>
        <p className="text-center text-xs text-slate-500">{t("qpay.autoNote")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={pay}
        disabled={busy}
        className="w-full rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy ? t("qpay.creating") : t("qpay.pay")}
      </button>
      {err && <p className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
