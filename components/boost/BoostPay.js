"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBoostInvoice, checkPaymentNow } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { RefreshCw } from "@/components/icons";

const POLL_MS = 6000; // авто-шалгалтын интервал (checkPaymentNow-ийн 20/60с rate limit-ээс доогуур)

// Boost захиалгын QPay төлбөр (QPayPay-ийн boost хувилбар).
export default function BoostPay({ boostId }) {
  const router = useRouter();
  const t = useT();
  const call = useAction();
  const [inv, setInv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  async function pay() {
    setBusy(true);
    setErr(null);
    const r = await call(createBoostInvoice, boostId);
    setBusy(false);
    if (r.error) { setErr(r.error ?? t("qpay.err")); return; }
    setInv(r.invoice);
  }

  // QR харагдаж байх үед автоматаар төлбөр шалгана (зөвхөн идэвхтэй таб дээр) —
  // route handler-ээр (server action poll нь client талын action дарааллыг блоклодог).
  useEffect(() => {
    if (!inv) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      let r = null;
      try {
        const res = await fetch("/api/payments/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ order: boostId, kind: "boost" }),
        });
        r = res.ok ? await res.json() : null;
      } catch {}
      if (stopped || !r?.ok) return;
      if (r.result === "paid" || r.result === "overpaid" || r.result === "noop") {
        if (r.result === "paid") {
          setInfo(t("qpay.paidOk"));
          // status зарлагдах хугацаа: шууд refresh нь live region-ийг унтраадаг байсан
          setTimeout(() => router.refresh(), 1200);
        } else router.refresh();
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => { stopped = true; clearInterval(id); };
  }, [inv, boostId, router, t]);

  // QPay-аас идэвхтэй шалгаад (callback хүлээлгүй) баталгаажвал хуудсыг шинэчилнэ.
  async function recheck() {
    setChecking(true);
    setErr(null);
    setInfo(null);
    const r = await call(checkPaymentNow, boostId, "boost");
    setChecking(false);
    if (r?.error) { setErr(r.error); return; }
    if (r.result === "no_payment") setInfo(t("qpay.noPayment"));
    else if (r.result === "underpaid") setErr(t("qpay.underpaid"));
    else if (r.result === "paid") {
      setInfo(t("qpay.paidOk"));
      setTimeout(() => router.refresh(), 1200);
    } else router.refresh();
  }

  if (inv) {
    const qrSrc = inv.qr_image
      ? inv.qr_image.startsWith("data:") ? inv.qr_image : `data:image/png;base64,${inv.qr_image}`
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
              <a key={u.name ?? u.link} href={u.link}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-white/10 bg-white/5 px-4 text-xs text-slate-300 hover:border-violet/40 hover:bg-white/10">
                {u.name ?? "Банк"}
              </a>
            ))}
          </div>
        )}
        <button onClick={recheck} disabled={checking}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} /> {checking ? t("qpay.checking") : t("qpay.check")}
        </button>
        {info && <p role="status" className="text-center text-sm text-azure">{info}</p>}
        {err && <p role="alert" className="text-center text-sm text-red-300">{err}</p>}
        <p className="text-center text-xs text-slate-400">{t("qpay.autoNote")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button onClick={pay} disabled={busy}
        className="w-full rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-3 text-sm font-bold uppercase tracking-wide text-white hover:brightness-110 disabled:opacity-50">
        {busy ? t("qpay.creating") : t("boost.pay")}
      </button>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
