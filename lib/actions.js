"use server";

// Бүх БИЧИХ үйлдэл (client component-уудаас дуудна). RLS байхгүй тул эрх+эзэмшлийн
// шалгалтыг ЭНД хийнэ (session + SQL функц/нөхцөл).
import { headers } from "next/headers";
import { getActiveUserId } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { sendEmailOtp } from "@/lib/auth/otp";
import { rateOk, RL } from "@/lib/rate";
import { checkPaymentCore } from "@/lib/payments";
import { uploadListingImage, deleteBlob } from "@/lib/blob";
import { listingSchema } from "@/lib/validation";
import { BOOST, rankMatches, boostTotal } from "@/lib/boost";
import * as qpay from "@/lib/qpay";
import { sendEmail, emailShell, escapeHtml } from "@/lib/email";

// Бичих үйлдлийн идэвхтэй (deleted_at is null) хэрэглэгчийн id — route handler-уудтай
// ИЖИЛ эх сурвалжаас (lib/auth getActiveUserId) тул эрхийн parity нэг газар тогтоно.
const uid = getActiveUserId;
// Хэрэглэгчид зориулсан алдаа (бидний санаатай шидсэн — кирилл текст) шууд харагдана;
// системийн/гадаад алдааг (Postgres, QPay, network — англи) нууж лог хийнэ. Эс бөгөөс
// "QPay invoice 500", SQL алдаа зэрэг дотоод мэдээлэл хэрэглэгч рүү шууд гоождог.
const GENERIC_ERR = "Алдаа гарлаа. Түр зуурын саатал байж магадгүй — дахин оролдоно уу.";
function fail(e) {
  const msg = e?.message ?? String(e);
  if (/[Ѐ-ӿ]/.test(msg)) return { error: msg };
  console.error("action error:", msg);
  return { error: GENERIC_ERR };
}

// rate limit-ийг lib/rate.js-ээс (route handler-уудтай хуваалцана)

// Зураг upload хязгаар (сервер тал — client compress-ийг тойрсон шууд дуудлагаас хамгаална)
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB — next.config serverActions.bodySizeLimit-тэй тэнцүү
const MAX_IMAGES_PER_LISTING = 10;

// Escrow milestone и-мэйл (best-effort) — захиалгын хоёр талд.
const ORDER_MILESTONE = {
  transferring: "Шилжүүлэг эхэллээ",
  inspecting: "Шалгах хугацаа эхэллээ",
  completed: "Захиалга дууслаа",
  cancelled: "Захиалга цуцлагдлаа",
};
async function emailOrderMilestone(orderId, subject) {
  try {
    const parties = await query(
      `select u.email, l.title from public.orders o
         join public.listings l on l.id = o.listing_id
         join public.users u on u.id in (o.buyer_id, o.seller_id)
        where o.id = $1`,
      [orderId]
    );
    for (const p of parties) {
      if (!p.email) continue;
      await sendEmail({
        to: p.email,
        subject: `MLBB — ${subject}`,
        html: emailShell(subject, `<b>${escapeHtml(p.title)}</b> захиалгын төлөв шинэчлэгдлээ: ${subject}.`),
      });
    }
  } catch {}
}

// ───────────── Auth: OTP илгээх ─────────────
export async function requestOtp(email) {
  try {
    // Per-IP хязгаар (и-мэйл харгалзахгүй): нэг IP олон өөр хаягаар код асгаруулж
    // Resend-ийн зардал/спам үүсгэхээс сэргийлнэ. Per-email хязгаар otp.js дотор.
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (!(await rateOk("otp-ip", ip, 10, 900))) return { error: RL };
    await sendEmailOtp(email);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Orders / escrow ─────────────
export async function createOrder(listingId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!(await rateOk("order", u, 10, 60))) return { error: RL };
  try {
    const rows = await query("select * from public.order_create($1,$2)", [listingId, u]);
    return { ok: true, orderId: rows[0].id };
  } catch (e) { return fail(e); }
}

// UI-ийн санал болгодог шилжилтүүд л зөвшөөрнө (disputed нь open_dispute-ээр; refunded нь
// admin_resolve_dispute-ээр). Client дурын target дамжуулахаас сэргийлнэ.
const ALLOWED_TRANSITIONS = new Set(["paid", "transferring", "inspecting", "completed", "cancelled"]);

export async function transitionOrder(orderId, target) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!ALLOWED_TRANSITIONS.has(target)) return { error: "Буруу шилжилт" };
  try {
    await query("select public.order_transition($1,$2::public.order_status,$3)", [orderId, target, u]);
    if (ORDER_MILESTONE[target]) await emailOrderMilestone(orderId, ORDER_MILESTONE[target]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function setChecklistItem(orderId, field, value) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.set_checklist_item($1,$2,$3,$4)", [orderId, field, value, u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function openDispute(orderId, reason) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!(await rateOk("dispute", u, 5, 300))) return { error: RL };
  try {
    await query("select public.open_dispute($1,$2,$3)", [orderId, String(reason ?? "").trim(), u]);
    await emailOrderMilestone(orderId, "Маргаан нээгдлээ");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function sendMessage(orderId, body) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const text = String(body ?? "").trim();
  if (!text) return { error: "Хоосон" };
  if (!(await rateOk("msg", u, 30, 60))) return { error: RL };
  try {
    const row = await queryOne(
      `insert into public.messages (order_id, sender_id, body)
       select $1, $2, $3
        where exists (select 1 from public.orders o where o.id=$1 and $2 in (o.buyer_id, o.seller_id))
       returning id, sender_id, body, created_at, seq`,
      [orderId, u, text]
    );
    if (!row) return { error: "Эрх байхгүй" };
    return { ok: true, message: row };
  } catch (e) { return fail(e); }
}

// Чат polling — захиалгын тал ЭСВЭЛ admin. cursor={afterSeq} өгвөл зөвхөн ШИНЭ мессежийг
// буцаана (монотон seq → нэг ms-д давхцсан ч, timestamp нарийвчлалаас үл хамааран алдагдахгүй).

export async function submitReview(orderId, stars, comment) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const s = Number(stars);
  if (!(s >= 1 && s <= 5)) return { error: "1–5 од" };
  try {
    const row = await queryOne(
      `insert into public.reviews (order_id, reviewer_id, seller_id, stars, comment)
       select $1, $2, o.seller_id, $3, $4 from public.orders o
        where o.id=$1 and o.buyer_id=$2 and o.status='completed'
       returning id`,
      [orderId, u, s, (comment && String(comment).trim()) || null]
    );
    if (!row) return { error: "Зөвхөн дууссан захиалгын худалдан авагч үнэлнэ" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Favorites ─────────────
export async function toggleFavorite(listingId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const existing = await queryOne(
      `select 1 from public.favorites where user_id=$1 and listing_id=$2`, [u, listingId]
    );
    if (existing) {
      await query(`delete from public.favorites where user_id=$1 and listing_id=$2`, [u, listingId]);
      return { ok: true, favorited: false };
    }
    await query(
      `insert into public.favorites (user_id, listing_id) values ($1,$2) on conflict do nothing`, [u, listingId]
    );
    return { ok: true, favorited: true };
  } catch (e) { return fail(e); }
}

// ───────────── Notifications ─────────────
export async function markAllRead() {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query(`update public.notifications set is_read=true where user_id=$1 and is_read=false`, [u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Listings ─────────────
export async function createListing(data) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!(await rateOk("listing", u, 10, 300))) return { error: RL };
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) return { error: "Оруулсан утга буруу байна" };
  const d = parsed.data;
  try {
    const row = await queryOne(
      `insert into public.listings
         (seller_id, title, price, server, rank, description, level, heroes_count, skins_count, win_rate)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [u, d.title, d.price, d.server, d.rank, d.description ?? null,
       d.level ?? null, d.heroes_count ?? null, d.skins_count ?? null, d.win_rate ?? null]
    );
    return { ok: true, id: row.id };
  } catch (e) { return fail(e); }
}

export async function addListingImage(listingId, formData) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  // Blob тохиргоо: статик токен ЭСВЭЛ OIDC (BLOB_STORE_ID) аль нэг нь байх ёстой.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return { error: "Зураг хадгалах сан холбоогүй байна (Vercel Blob)." };
  }
  try {
    const own = await queryOne(
      `select 1 from public.listings where id=$1 and seller_id=$2 and status in ('active','draft','hidden')`,
      [listingId, u]
    );
    if (!own) return { error: "Эрх байхгүй" };
    const file = formData.get("file");
    if (!file || typeof file === "string") return { error: "Файл алга" };
    if (!IMAGE_TYPES.has(file.type)) return { error: "Зөвхөн зураг файл (JPEG/PNG/WebP/GIF/AVIF)" };
    if (file.size > MAX_IMAGE_BYTES) return { error: "Зураг хэт том (8MB-аас бага байх ёстой)" };
    const cnt = await queryOne(
      `select count(*)::int n from public.listing_images where listing_id = $1`, [listingId]
    );
    if ((cnt?.n ?? 0) >= MAX_IMAGES_PER_LISTING) {
      return { error: `Нэг зар дээр дээд тал нь ${MAX_IMAGES_PER_LISTING} зураг оруулна` };
    }
    const sort = Number(formData.get("sort") ?? 0);
    const { url, pathname } = await uploadListingImage(listingId, file);
    await query(
      `insert into public.listing_images (listing_id, url, storage_path, sort_order) values ($1,$2,$3,$4)`,
      [listingId, url, pathname, sort]
    );
    return { ok: true, url };
  } catch (e) { return fail(e); }
}

export async function setListingStatus(listingId, status) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!["active", "hidden", "draft"].includes(status)) return { error: "Буруу төлөв" };
  try {
    const row = await queryOne(
      `update public.listings set status=$1
        where id=$2 and seller_id=$3 and status in ('active','draft','hidden') returning id`,
      [status, listingId, u]
    );
    if (!row) return { error: "Эрх байхгүй эсвэл боломжгүй" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function softDeleteListing(listingId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const row = await queryOne(
      `update public.listings set deleted_at=now(), status='hidden'
        where id=$1 and seller_id=$2 and status in ('active','draft','hidden') returning id`,
      [listingId, u]
    );
    if (!row) return { error: "Эрх байхгүй эсвэл боломжгүй" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function editListing(listingId, data) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) return { error: "Оруулсан утга буруу байна" };
  const d = parsed.data;
  try {
    const row = await queryOne(
      `update public.listings set title=$1, price=$2, server=$3, rank=$4, description=$5,
         level=$6, heroes_count=$7, skins_count=$8, win_rate=$9
        where id=$10 and seller_id=$11 and status in ('active','draft','hidden') returning id`,
      [d.title, d.price, d.server, d.rank, d.description ?? null, d.level ?? null,
       d.heroes_count ?? null, d.skins_count ?? null, d.win_rate ?? null, listingId, u]
    );
    if (!row) return { error: "Эрх байхгүй эсвэл боломжгүй (зарагдсан зар засах боломжгүй)" };
    return { ok: true, id: listingId };
  } catch (e) { return fail(e); }
}

export async function deleteListingImage(imageId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const img = await queryOne(
      `select li.id, li.storage_path from public.listing_images li
       join public.listings l on l.id = li.listing_id
      where li.id = $1 and l.seller_id = $2 and l.status in ('active','draft','hidden')`,
      [imageId, u]
    );
    if (!img) return { error: "Эрх байхгүй" };
    await query(`delete from public.listing_images where id = $1`, [imageId]);
    await deleteBlob(img.storage_path);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Admin ─────────────
export async function adminResolveDispute(disputeId, outcome, note) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.admin_resolve_dispute($1,$2,$3,$4)",
      [disputeId, outcome, (note && String(note).trim()) || null, u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function adminRecordPayout(orderId, method, bankAccount, ref) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.admin_record_payout($1,$2,$3,$4,$5)",
      [orderId, method || "bank", (bankAccount && String(bankAccount).trim()) || null,
       (ref && String(ref).trim()) || null, u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function adminSetVerified(userId, verified) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.admin_set_verified($1,$2,$3)", [userId, Boolean(verified), u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── QPay ─────────────
const invoiceShape = (id, inv) => ({
  invoice_id: id, qr_text: inv.qr_text ?? null,
  qr_image: inv.qr_image ?? null, urls: inv.urls ?? [],
});

// Invoice үүсгэх/дахин ашиглах нийтлэг зам (orders + boost_orders).
// Хоёр чухал хамгаалалт:
//  (1) Хуучин invoice-ийг ЗӨВХӨН QPay 404 ("тодорхой олдсонгүй") өгсөн үед л солино.
//      Түр зуурын алдаан (5xx/сүлжээ) дээр сольчихвол хуучин ТӨЛӨГДӨХ боломжтой invoice
//      QPay талд үлдэж, түүний төлбөрийг callback/cron/гар шалгалт хэзээ ч олж харахгүй.
//  (2) Шинэ id-г хадгалахдаа `qpay_invoice_id is null` нөхцөлтэй — зэрэгцээ хоёр дуудлага
//      хоёулаа invoice үүсгэвэл түрүүлснийх нь үлдэж, хожимдсоныг QPay талд цуцална.
async function issueInvoice({ table, id, amount, description, callbackUrl, existingInvoiceId }) {
  if (existingInvoiceId) {
    try {
      const existing = await qpay.getInvoice(existingInvoiceId);
      return { ok: true, invoice: invoiceShape(existingInvoiceId, existing) };
    } catch (e) {
      if (e?.status !== 404) throw e; // түр зуурын алдаа — хуучин invoice-ийг хадгална
      await queryOne(
        `update ${table} set qpay_invoice_id = null
          where id = $1 and status = 'created' and qpay_invoice_id = $2 returning id`,
        [id, existingInvoiceId]
      );
    }
  }
  const inv = await qpay.createInvoice({ senderInvoiceNo: id, amount, description, callbackUrl });
  const saved = await queryOne(
    `update ${table} set qpay_invoice_id = $1
      where id = $2 and status = 'created' and qpay_invoice_id is null returning id`,
    [inv.invoice_id, id]
  );
  if (saved) return { ok: true, invoice: invoiceShape(inv.invoice_id, inv) };

  // Уралдаанд хожигдсон: зэрэгцээ дуудлага өөр invoice хадгалсан (эсвэл захиалга төлөгдсөн).
  // Сая үүсгэснээ QPay талд цуцалж (best-effort), хадгалагдсаныг буцаана.
  await qpay.cancelInvoice(inv.invoice_id).catch(() => {});
  const cur = await queryOne(`select qpay_invoice_id, status from ${table} where id = $1`, [id]);
  if (cur?.status === "created" && cur.qpay_invoice_id) {
    const existing = await qpay.getInvoice(cur.qpay_invoice_id);
    return { ok: true, invoice: invoiceShape(cur.qpay_invoice_id, existing) };
  }
  return { error: "Энэ захиалга төлбөр хүлээхгүй" };
}

export async function createQpayInvoice(orderId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!(await rateOk("invoice", u, 10, 60))) return { error: RL };
  try {
    const order = await queryOne(
      `select id, amount, status, buyer_id, qpay_invoice_id from public.orders where id=$1`, [orderId]
    );
    if (!order || order.buyer_id !== u) return { error: "Захиалга олдсонгүй / эрх алга" };
    if (order.status !== "created") return { error: "Энэ захиалга төлбөр хүлээхгүй" };

    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const cbToken = process.env.QPAY_CALLBACK_TOKEN || "";
    const callbackUrl = `${site}/api/qpay/callback?order=${orderId}&token=${encodeURIComponent(cbToken)}`;

    return await issueInvoice({
      table: "public.orders", id: orderId, amount: Number(order.amount),
      description: `MLBB захиалга ${orderId}`, callbackUrl,
      existingInvoiceId: order.qpay_invoice_id,
    });
  } catch (e) { return fail(e); }
}

// Худалдан авагч өөрөө QPay-аас төлбөрөө шалгуулах (callback хоцорсон/ирээгүй үед шууд
// баталгаажуулна). Цөм логик lib/payments.js-д (/api/payments/check route-тэй хуваалцана);
// Vercel cron нь нөөц reconcile зам хэвээр. kind='boost' бол boost захиалга.
export async function checkPaymentNow(orderId, kind) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const r = await checkPaymentCore(u, orderId, kind);
    return r;
  } catch (e) { return fail(e); }
}

// ───────────── Boosting захиалга ─────────────
const clampN = (n, min, max) => Math.min(max, Math.max(min, Math.round(Number(n) || 0)));

// Үнийг СЕРВЕР талд lib/boost-ийн логикоор дахин тооцоолно (client дүнд найдахгүй).
export async function createBoostOrder(service, config) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!["winrate", "rank", "squad", "placement", "coaching"].includes(service)) return { error: "Буруу үйлчилгээ" };
  if (!(await rateOk("boost", u, 10, 60))) return { error: RL };
  const c = config || {};
  const opts = { express: !!c.express, duo: !!c.duo };
  let matches = 0, perMatch = 0;
  if (service === "winrate") { matches = clampN(c.wins, BOOST.winrate.min, BOOST.winrate.max); perMatch = BOOST.winrate.perMatch; }
  else if (service === "rank") { matches = rankMatches(Number(c.fromIdx), Number(c.toIdx)); perMatch = BOOST.rank.perMatch; }
  else if (service === "placement") { matches = clampN(c.matches, BOOST.placement.min, BOOST.placement.max); perMatch = BOOST.placement.perMatch; opts.duo = false; }
  else if (service === "coaching") { matches = clampN(c.sessions, BOOST.coaching.min, BOOST.coaching.max); perMatch = BOOST.coaching.perMatch; opts.duo = false; }
  else { matches = clampN(c.matches, BOOST.squad.min, BOOST.squad.max); perMatch = BOOST.squad.perMatch; opts.duo = false; }
  if (matches <= 0) return { error: "Тохиргоо буруу байна" };
  try {
    const amount = boostTotal(matches, perMatch, opts);
    const code = String(c.promo ?? "").trim().toUpperCase();
    if (code) {
      // НЭГ statement (нэг tx): promo-ийн used_count-ийг нэмэх + захиалга үүсгэхийг CTE-ээр
      // нэгтгэнэ. neon() HTTP driver statement бүрийг тусдаа autocommit хийдэг тул хоёр
      // statement-ээр бол дунд нь унавал promo слот шатдаг байсан; одоо хамтдаа commit/rollback.
      // Шалгалт ба нэмэгдүүлэлт мөн ижил statement-д тул TOCTOU race-ээс хамгаалагдсан хэвээр.
      const row = await queryOne(
        `with promo as (
           update public.promo_codes set used_count = used_count + 1
            where code = $6 and active = true
              and (expires_at is null or expires_at > now())
              and (max_uses is null or used_count < max_uses)
            returning percent_off
         )
         insert into public.boost_orders (buyer_id, service, config, matches, amount)
         select $1, $2, $3::jsonb, $4,
                greatest(1, round($5::bigint * (1 - promo.percent_off / 100.0)))::bigint
           from promo
         returning id`,
        [u, service, JSON.stringify({ ...c, ...opts, promo: code }), matches, amount, code]
      );
      if (!row) return { error: "Промо код хүчингүй байна" };
      return { ok: true, id: row.id };
    }
    const row = await queryOne(
      `insert into public.boost_orders (buyer_id, service, config, matches, amount)
       values ($1,$2,$3::jsonb,$4,$5) returning id`,
      [u, service, JSON.stringify({ ...c, ...opts, promo: null }), matches, amount]
    );
    return { ok: true, id: row.id };
  } catch (e) { return fail(e); }
}

export async function createBoostInvoice(boostId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!(await rateOk("invoice", u, 10, 60))) return { error: RL };
  try {
    const o = await queryOne(
      `select id, amount, status, buyer_id, qpay_invoice_id from public.boost_orders where id=$1`, [boostId]
    );
    if (!o || o.buyer_id !== u) return { error: "Захиалга олдсонгүй / эрх алга" };
    if (o.status !== "created") return { error: "Энэ захиалга төлбөр хүлээхгүй" };

    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const cbToken = process.env.QPAY_CALLBACK_TOKEN || "";
    const callbackUrl = `${site}/api/qpay/callback?order=${boostId}&kind=boost&token=${encodeURIComponent(cbToken)}`;

    return await issueInvoice({
      table: "public.boost_orders", id: boostId, amount: Number(o.amount),
      description: `MLBB boost ${boostId}`, callbackUrl,
      existingInvoiceId: o.qpay_invoice_id,
    });
  } catch (e) { return fail(e); }
}

// Boost явцыг шилжүүлэх: paid→in_progress→completed (админ эсвэл хариуцсан booster);
// cancelled/refunded зөвхөн админ. Escrow: төлбөр баригдаж, completed үед суллах эрх нээгдэнэ.
const BOOST_FROM = {
  in_progress: ["paid"], completed: ["in_progress"],
  cancelled: ["paid", "in_progress"], refunded: ["paid", "in_progress"],
};
export async function boostTransition(boostId, target) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!BOOST_FROM[target]) return { error: "Буруу шилжилт" };
  try {
    const o = await queryOne(`select status, booster_id from public.boost_orders where id=$1`, [boostId]);
    if (!o) return { error: "Захиалга олдсонгүй" };
    const admin = await queryOne(`select 1 from public.users where id=$1 and role='admin'`, [u]);
    const adminOnly = target === "cancelled" || target === "refunded";
    const allowed = admin || (o.booster_id === u && !adminOnly);
    if (!allowed) return { error: "Эрх байхгүй" };
    if (!BOOST_FROM[target].includes(o.status)) return { error: "Энэ төлвөөс шилжих боломжгүй" };
    const row = await queryOne(
      `update public.boost_orders set status=$1 where id=$2 and status=$3 returning id`,
      [target, boostId, o.status]
    );
    if (!row) return { error: "Боломжгүй" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function assignBooster(boostId, email) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const admin = await queryOne(`select 1 from public.users where id=$1 and role='admin'`, [u]);
    if (!admin) return { error: "Зөвхөн админ" };
    const booster = await queryOne(
      `select id from public.users where email=$1 and deleted_at is null`,
      [String(email ?? "").trim().toLowerCase()]
    );
    if (!booster) return { error: "Хэрэглэгч олдсонгүй" };
    const row = await queryOne(
      `update public.boost_orders set booster_id=$1 where id=$2 returning id`,
      [booster.id, boostId]
    );
    if (!row) return { error: "Захиалга олдсонгүй" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function submitBoostReview(boostId, stars, comment) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const s = Number(stars);
  if (!(s >= 1 && s <= 5)) return { error: "1–5 од" };
  try {
    const row = await queryOne(
      `insert into public.boost_reviews (boost_order_id, reviewer_id, booster_id, stars, comment)
       select $1, $2, bo.booster_id, $3, $4 from public.boost_orders bo
        where bo.id = $1 and bo.buyer_id = $2 and bo.status = 'completed'
       returning id`,
      [boostId, u, s, (comment && String(comment).trim()) || null]
    );
    if (!row) return { error: "Зөвхөн дууссан захиалгын эзэн үнэлнэ" };
    return { ok: true };
  } catch (e) { return fail(e); }
}

// Boost явц (гүйцэтгэсэн match) — booster/админ, зөвхөн in_progress үед, 0..matches хооронд.
export async function setBoostProgress(boostId, progress) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const o = await queryOne(`select status, booster_id, matches from public.boost_orders where id=$1`, [boostId]);
    if (!o) return { error: "Захиалга олдсонгүй" };
    const admin = await queryOne(`select 1 from public.users where id=$1 and role='admin'`, [u]);
    if (!(admin || o.booster_id === u)) return { error: "Эрх байхгүй" };
    if (o.status !== "in_progress") return { error: "Зөвхөн гүйцэтгэж буй үед" };
    const p = Math.max(0, Math.min(Number(o.matches) || 0, Math.round(Number(progress) || 0)));
    await query(`update public.boost_orders set progress=$1 where id=$2`, [p, boostId]);
    return { ok: true, progress: p };
  } catch (e) { return fail(e); }
}

// Booster-т олголт бүртгэх (зөвхөн админ, completed boost).
export async function adminRecordBoostPayout(boostId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.admin_record_boost_payout($1,$2)", [boostId, u]);
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Boost чат (buyer ↔ booster; admin унших эрхтэй) ─────────────
export async function sendBoostMessage(boostId, body) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const text = String(body ?? "").trim();
  if (!text) return { error: "Хоосон" };
  if (!(await rateOk("msg", u, 30, 60))) return { error: RL };
  try {
    const row = await queryOne(
      `insert into public.messages (boost_order_id, sender_id, body)
       select $1, $2, $3
        where exists (select 1 from public.boost_orders bo where bo.id=$1 and $2 in (bo.buyer_id, bo.booster_id))
       returning id, sender_id, body, created_at, seq`,
      [boostId, u, text]
    );
    if (!row) return { error: "Эрх байхгүй" };
    return { ok: true, message: row };
  } catch (e) { return fail(e); }
}

