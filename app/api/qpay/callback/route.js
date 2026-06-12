// QPay callback (Supabase Edge qpay-callback-ийг орлоно). QPay JWT-гүй дуудна тул
// ?token=QPAY_CALLBACK_TOKEN-оор хамгаалж, сервер-сервер /payment/check-ээр баталгаажуулна.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { confirmInvoice } from "@/lib/payments";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

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
  const kind = searchParams.get("kind"); // "boost" эсвэл null (account захиалга)
  const expected = process.env.QPAY_CALLBACK_TOKEN || "";
  if (!orderId || !expected || !safeEqual(token, expected)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  try {
    const table = kind === "boost" ? "public.boost_orders" : "public.orders";
    const order = await queryOne(`select id, qpay_invoice_id from ${table} where id = $1`, [orderId]);
    if (!order || !order.qpay_invoice_id) return new NextResponse("no invoice", { status: 404 });

    const result = await confirmInvoice({
      id: orderId, invoiceId: order.qpay_invoice_id, isBoost: kind === "boost",
    });

    // Төлбөр баталгаажвал и-мэйл мэдэгдэл (best-effort)
    if (result === "paid") {
      try {
        if (kind === "boost") {
          const b = await queryOne(
            `select u.email from public.boost_orders bo join public.users u on u.id = bo.buyer_id where bo.id = $1`,
            [orderId]
          );
          await sendEmail({ to: b?.email, subject: "MLBB — boost төлбөр баталгаажлаа",
            html: emailShell("Төлбөр баталгаажлаа", "Таны boost захиалгын төлбөр амжилттай хүлээн авлаа. Бид удахгүй эхэлнэ.") });
        } else {
          const parties = await query(
            `select u.email, (u.id = o.buyer_id) as is_buyer, l.title
               from public.orders o join public.listings l on l.id = o.listing_id
               join public.users u on u.id in (o.buyer_id, o.seller_id)
              where o.id = $1`, [orderId]
          );
          for (const p of parties) {
            await sendEmail({ to: p.email, subject: "MLBB — escrow төлбөр баталгаажлаа",
              html: emailShell("Төлбөр escrow-д хүлээн авлаа", `<b>${escapeHtml(p.title)}</b> захиалгын төлбөр escrow-д хадгалагдлаа.`) });
          }
        }
      } catch (e) { console.error("payment email:", e?.message ?? e); }
    }
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("qpay-callback:", e?.message ?? e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function GET(req) { return handle(req); }
export async function POST(req) { return handle(req); }
