// Build Plan 3.8: Reconciliation. Callback ирээгүй тохиолдолд хоцорсон төлбөрийг барина.
// pg_cron-оор тогтмол дуудна (verify_jwt = FALSE; CRON_SECRET-ээр хамгаална).
// invoice-тэй боловч хараахан 'created' хэвээр байгаа захиалгуудыг QPay-аас шалгана.
import { serviceClient, timingSafeEqual } from "../_shared/supabase.ts";
import { checkPayment, summarizePaidRows } from "../_shared/qpay.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // Тусдаа, нарийн зориулалттай CRON_SECRET (service-role key-г inbound credential болгож
  // ашиглахгүй). Тогтмол-хугацааны харьцуулалт.
  const provided = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const secret = Deno.env.get("CRON_SECRET") ?? "";
  if (!secret || !timingSafeEqual(provided, secret)) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const sc = serviceClient();
    const { data: orders } = await sc
      .from("orders")
      .select("id, amount, qpay_invoice_id")
      .eq("status", "created")
      .not("qpay_invoice_id", "is", null)
      .limit(100);

    let confirmed = 0;
    for (const order of orders ?? []) {
      try {
        const check = await checkPayment(order.qpay_invoice_id);
        const { payments, paidTotal } = summarizePaidRows(check);
        if (payments.length === 0) continue;
        const { data, error } = await sc.rpc("confirm_payment", {
          p_order_id: order.id,
          p_qpay_invoice_id: order.qpay_invoice_id,
          p_paid_total: paidTotal,
          p_payments: payments,
          p_raw: check,
        });
        if (!error && data === "paid") confirmed++;
      } catch (e) {
        // нэг захиалгын алдаа бусдыг зогсоохгүй (лог руу)
        console.error("reconcile order error:", order.id, e?.message ?? e);
      }
    }
    return new Response(JSON.stringify({ ok: true, scanned: orders?.length ?? 0, confirmed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("qpay-reconcile error:", e?.message ?? e);
    return new Response(JSON.stringify({ error: "internal error" }), { status: 500 });
  }
});
