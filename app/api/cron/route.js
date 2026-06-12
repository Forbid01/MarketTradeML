// Vercel Cron (pg_cron-ийг орлоно): 48ц inspection sweep + хоцорсон QPay төлбөр reconcile
// + төлөгдөөгүй хуучирсан захиалгын expiry sweep (listing-ийг суллана).
// Vercel нь CRON_SECRET env тохируулсан үед Authorization: Bearer <CRON_SECRET> толгой нэмнэ.
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { query, callScalar } from "@/lib/db";
import { confirmInvoice } from "@/lib/payments";

export const dynamic = "force-dynamic"; // нууц токентой handler — cache хийхгүй

// Захиалга 'created' төлөвт ингэнээс удвал төлөгдөөгүйд тооцож хүчингүй болгоно.
const STALE_AGE = "24 hours";

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a ?? "")).digest();
  const hb = crypto.createHash("sha256").update(String(b ?? "")).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// QPay-аас шалгаад төлбөртэй бол confirm хийнэ. Үр дүн: 'paid'|'underpaid'|'overpaid'|
// 'noop'|'no_payment'. Цөм примитив lib/payments.js-д (confirmInvoice) — энд зөвхөн
// cron-ийн мөр бүрийн дуудлагыг товчилно.
function reconcileOne(o, { boost = false } = {}) {
  return confirmInvoice({ id: o.id, invoiceId: o.qpay_invoice_id, isBoost: boost });
}

export async function GET(req) {
  const secret = process.env.CRON_SECRET || "";
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(provided, secret)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  try {
    // 0) хуучирсан түр өгөгдөл цэвэрлэх (хязгааргүй өсөхөөс сэргийлнэ)
    await query(`delete from public.rate_events where created_at < now() - interval '1 day'`);
    await query(`delete from public.email_otps where created_at < now() - interval '1 day'`);

    // 1) inspection timeout sweep
    const swept = await callScalar("select public.sweep_inspection_timeouts()");

    // 2) reconcile — СҮҮЛИЙН 24ц доторх invoice-той 'created' захиалгууд.
    //    Хуучин нь (4)-т эцсийн шалгалттайгаа орох тул энд давтан шалгаж starvation үүсгэхгүй.
    let confirmed = 0;
    const orders = await query(
      `select id, qpay_invoice_id from public.orders
        where status='created' and qpay_invoice_id is not null
          and created_at > now() - interval '${STALE_AGE}'
        order by created_at desc limit 100`
    );
    for (const o of orders) {
      try {
        if ((await reconcileOne(o)) === "paid") confirmed++;
      } catch (e) {
        console.error("reconcile order:", o.id, e?.message ?? e);
      }
    }

    // 3) boost захиалгын reconcile (мөн сүүлийн 24ц)
    let boostConfirmed = 0;
    const boostOrders = await query(
      `select id, qpay_invoice_id from public.boost_orders
        where status='created' and qpay_invoice_id is not null
          and created_at > now() - interval '${STALE_AGE}'
        order by created_at desc limit 100`
    );
    for (const o of boostOrders) {
      try {
        if ((await reconcileOne(o, { boost: true })) === "paid") boostConfirmed++;
      } catch (e) {
        console.error("reconcile boost:", o.id, e?.message ?? e);
      }
    }

    // 4) Хуучирсан төлбөргүй захиалгын sweep — listing-ийг суллана.
    //    Invoice-гүйг бөөнөөр нь; invoice-тэйг QPay-аас СҮҮЛЧИЙН удаа шалгасны дараа
    //    нэг нэгээр нь хаана (сүүлийн мөчид төлсөн мөнгийг алдахгүй). QPay шалгалт
    //    амжилтгүй бол тухайн захиалгыг ЭНЭ удаад expire хийхгүй — дараагийн run-д үлдээнэ.
    // STALE_AGE-ийг SQL функцүүдэд ШУУД дамжуулна — app-layer WHERE ба функцийн дотоод
    // p_max_age нэг утгаар явж, default-аас зөрөх (захиалга мөнхөд 'created'-д гацах) эрсдэлгүй.
    const ageParam = [STALE_AGE];
    let expired = Number(await callScalar("select public.sweep_stale_orders($1::interval)", ageParam)) || 0;
    const staleOrders = await query(
      `select id, qpay_invoice_id from public.orders
        where status='created' and qpay_invoice_id is not null
          and created_at < now() - interval '${STALE_AGE}'
        order by created_at asc limit 100`
    );
    for (const o of staleOrders) {
      try {
        const r = await reconcileOne(o);
        if (r === "paid") { confirmed++; continue; }
        if (r === "overpaid") continue; // confirm_payment dispute нээсэн — админ шийднэ
        if (r === "underpaid") { console.error("stale underpaid order:", o.id); continue; } // мөнгө QPay дээр — expire хийхгүй
        if (await callScalar("select public.expire_stale_order($1, $2::interval)", [o.id, STALE_AGE])) expired++;
      } catch (e) {
        console.error("stale order:", o.id, e?.message ?? e);
      }
    }

    let boostExpired = Number(await callScalar("select public.sweep_stale_boost_orders($1::interval)", ageParam)) || 0;
    const staleBoost = await query(
      `select id, qpay_invoice_id from public.boost_orders
        where status='created' and qpay_invoice_id is not null
          and created_at < now() - interval '${STALE_AGE}'
        order by created_at asc limit 100`
    );
    for (const o of staleBoost) {
      try {
        const r = await reconcileOne(o, { boost: true });
        if (r === "paid") { boostConfirmed++; continue; }
        if (r === "overpaid") continue; // confirm_boost_payment админд мэдэгдсэн — expire хийхгүй
        if (r === "underpaid") { console.error("stale underpaid boost:", o.id); continue; } // мөнгө QPay дээр
        if (await callScalar("select public.expire_stale_boost_order($1, $2::interval)", [o.id, STALE_AGE])) boostExpired++;
      } catch (e) {
        console.error("stale boost:", o.id, e?.message ?? e);
      }
    }

    return NextResponse.json({ ok: true, swept, confirmed, boostConfirmed, expired, boostExpired });
  } catch (e) {
    console.error("cron:", e?.message ?? e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
