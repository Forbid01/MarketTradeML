// Build Plan 3.5/3.6: QPay callback. verify_jwt = FALSE (QPay JWT-гүй дуудна).
// Callback-д ИТГЭЛГҮЙГЭЭР зөвхөн ДОХИО гэж үзэж, сервер-сервер payment/check-ээр баталгаажуулна.
// Шийдвэр нь PAID мөрүүдийн НИЙЛБЭР дүнгээр (confirm_payment). Idempotency-г payment_id түвшинд
// confirm_payment хариуцна.
import { serviceClient, timingSafeEqual } from "../_shared/supabase.ts";
import { checkPayment, summarizePaidRows } from "../_shared/qpay.ts";

Deno.serve(async (req) => {
  // QPay callback-ийг GET эсвэл POST-оор дуудаж болно — бусад method-ийг таслана.
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  const token = url.searchParams.get("token");

  // Хуурамч callback-ийг таслах (тогтмол-хугацааны харьцуулалт)
  const expected = Deno.env.get("QPAY_CALLBACK_TOKEN") ?? "";
  if (!orderId || !expected || !timingSafeEqual(token, expected)) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const sc = serviceClient();
    const { data: order } = await sc
      .from("orders")
      .select("id, amount, qpay_invoice_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || !order.qpay_invoice_id) return new Response("no invoice", { status: 404 });

    const check = await checkPayment(order.qpay_invoice_id);
    const { payments, paidTotal } = summarizePaidRows(check);

    let result = "no_payment";
    if (payments.length > 0) {
      const { data, error } = await sc.rpc("confirm_payment", {
        p_order_id: order.id,
        p_qpay_invoice_id: order.qpay_invoice_id,
        p_paid_total: paidTotal,
        p_payments: payments,
        p_raw: check,
      });
      if (error) throw error;
      result = data;
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // Дотоод алдааны дэлгэрэнгүйг (upstream QPay/DB текст) caller-руу БУЦААХГҮЙ — зөвхөн лог руу.
    console.error("qpay-callback error:", e?.message ?? e);
    return new Response(JSON.stringify({ error: "internal error" }), { status: 500 });
  }
});
