// Vercel Cron (pg_cron-ийг орлоно): 48ц inspection sweep + хоцорсон QPay төлбөр reconcile.
// Vercel нь CRON_SECRET env тохируулсан үед Authorization: Bearer <CRON_SECRET> толгой нэмнэ.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, callScalar } from "@/lib/db";
import { checkPayment, summarizePaidRows } from "@/lib/qpay";

export const dynamic = "force-dynamic"; // нууц токентой handler — cache хийхгүй

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET || "";
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(provided, secret)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  try {
    // 1) inspection timeout sweep
    const swept = await callScalar("select public.sweep_inspection_timeouts()");

    // 2) reconcile — invoice-той ч 'created' хэвээр захиалгуудыг QPay-аас шалгах
    let confirmed = 0;
    const orders = await query(
      `select id, qpay_invoice_id from public.orders
        where status='created' and qpay_invoice_id is not null
        order by created_at asc limit 100`
    );
    for (const o of orders) {
      try {
        const check = await checkPayment(o.qpay_invoice_id);
        const { payments, paidTotal } = summarizePaidRows(check);
        if (!payments.length) continue;
        const rows = await query(
          `select public.confirm_payment($1,$2,$3,$4::jsonb,$5::jsonb) as r`,
          [o.id, o.qpay_invoice_id, paidTotal, JSON.stringify(payments), JSON.stringify(check)]
        );
        if (rows[0].r === "paid") confirmed++;
      } catch (e) {
        console.error("reconcile order:", o.id, e?.message ?? e);
      }
    }
    return NextResponse.json({ ok: true, swept, confirmed });
  } catch (e) {
    console.error("cron:", e?.message ?? e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
