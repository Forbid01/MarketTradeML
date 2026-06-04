// QPay callback (Supabase Edge qpay-callback-ийг орлоно). QPay JWT-гүй дуудна тул
// ?token=QPAY_CALLBACK_TOKEN-оор хамгаалж, сервер-сервер /payment/check-ээр баталгаажуулна.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { checkPayment, summarizePaidRows } from "@/lib/qpay";

export const dynamic = "force-dynamic"; // нууц токентой handler — cache хийхгүй

// Тогтмол-хугацааны харьцуулалт (sha256 → урт алдагдахгүй)
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}

async function handle(req) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order");
  const token = searchParams.get("token");
  const expected = process.env.QPAY_CALLBACK_TOKEN || "";
  if (!orderId || !expected || !safeEqual(token, expected)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  try {
    const order = await queryOne(
      `select id, qpay_invoice_id from public.orders where id = $1`, [orderId]
    );
    if (!order || !order.qpay_invoice_id) return new NextResponse("no invoice", { status: 404 });

    const check = await checkPayment(order.qpay_invoice_id);
    const { payments, paidTotal } = summarizePaidRows(check);
    let result = "no_payment";
    if (payments.length > 0) {
      const rows = await query(
        `select public.confirm_payment($1,$2,$3,$4::jsonb,$5::jsonb) as r`,
        [orderId, order.qpay_invoice_id, paidTotal, JSON.stringify(payments), JSON.stringify(check)]
      );
      result = rows[0].r;
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("qpay-callback:", e?.message ?? e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function GET(req) { return handle(req); }
export async function POST(req) { return handle(req); }
