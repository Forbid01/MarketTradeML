// QPay төлбөрийн шалгалтын ЦӨМ — checkPaymentNow server action болон
// /api/payments/check route handler хоёул ашиглана. ЗӨВХӨН сервер тал.
import { query, queryOne } from "@/lib/db";
import { rateOk, RL } from "@/lib/rate";
import * as qpay from "@/lib/qpay";

// QPay-аас invoice-г шалгаад төлбөртэй бол зөв confirm_* SQL функцийг дуудна — энэ нь
// бүх төлбөр баталгаажуулалтын ЦӨМ примитив (checkPaymentCore, cron reconcile, callback
// гурвуул эндээс дуудна). confirm_payment / confirm_boost_payment idempotent (FOR UPDATE +
// status='created') тул давхар дуудахад аюулгүй. Үр дүн:
// 'paid'|'underpaid'|'overpaid'|'noop'|'no_payment'.
export async function confirmInvoice({ id, invoiceId, isBoost = false }) {
  const check = await qpay.checkPayment(invoiceId);
  const { payments, paidTotal } = qpay.summarizePaidRows(check);
  if (!payments.length) return "no_payment";
  const fn = isBoost ? "public.confirm_boost_payment" : "public.confirm_payment";
  const rows = await query(`select ${fn}($1,$2,$3,$4::jsonb,$5::jsonb) as r`,
    [id, invoiceId, paidTotal, JSON.stringify(payments), JSON.stringify(check)]);
  return rows[0].r;
}

// u = БАТАЛГААЖСАН хэрэглэгчийн id (auth + rate-limit энд хийгдэнэ).
export async function checkPaymentCore(u, orderId, kind) {
  if (!(await rateOk("paycheck", u, 20, 60))) return { error: RL };
  const isBoost = kind === "boost";
  const table = isBoost ? "public.boost_orders" : "public.orders";
  const order = await queryOne(
    `select id, qpay_invoice_id, buyer_id, status from ${table} where id = $1`, [orderId]
  );
  if (!order || order.buyer_id !== u) return { error: "Захиалга олдсонгүй / эрх алга" };
  if (order.status !== "created") return { ok: true, result: "noop" };
  if (!order.qpay_invoice_id) return { error: "Нэхэмжлэл үүсээгүй байна" };

  const result = await confirmInvoice({ id: orderId, invoiceId: order.qpay_invoice_id, isBoost });
  return { ok: true, result };
}
