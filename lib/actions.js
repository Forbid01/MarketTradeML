"use server";

// Бүх БИЧИХ үйлдэл (client component-уудаас дуудна). RLS байхгүй тул эрх+эзэмшлийн
// шалгалтыг ЭНД хийнэ (session + SQL функц/нөхцөл).
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { query, queryOne } from "@/lib/db";
import { sendEmailOtp } from "@/lib/auth/otp";
import { uploadListingImage } from "@/lib/blob";
import { listingSchema } from "@/lib/validation";
import { BOOST, rankMatches, boostTotal } from "@/lib/boost";
import * as qpay from "@/lib/qpay";

async function uid() {
  const session = await auth();
  return session?.user?.id ?? null;
}
function fail(e) {
  return { error: e?.message ?? String(e) };
}

// ───────────── Auth: OTP илгээх ─────────────
export async function requestOtp(email) {
  try { await sendEmailOtp(email); return { ok: true }; }
  catch (e) { return fail(e); }
}

// ───────────── Orders / escrow ─────────────
export async function createOrder(listingId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
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
    revalidatePath(`/orders/${orderId}`);
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
  try {
    await query("select public.open_dispute($1,$2,$3)", [orderId, String(reason ?? "").trim(), u]);
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function sendMessage(orderId, body) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  const text = String(body ?? "").trim();
  if (!text) return { error: "Хоосон" };
  try {
    const row = await queryOne(
      `insert into public.messages (order_id, sender_id, body)
       select $1, $2, $3
        where exists (select 1 from public.orders o where o.id=$1 and $2 in (o.buyer_id, o.seller_id))
       returning id, sender_id, body, created_at`,
      [orderId, u, text]
    );
    if (!row) return { error: "Эрх байхгүй" };
    return { ok: true, message: row };
  } catch (e) { return fail(e); }
}

// Чат polling — зөвхөн захиалгын тал
export async function getOrderMessages(orderId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const rows = await query(
      `select m.id, m.sender_id, m.body, m.created_at from public.messages m
        where m.order_id = $1
          and exists (select 1 from public.orders o where o.id=$1 and $2 in (o.buyer_id, o.seller_id))
        order by m.created_at asc`,
      [orderId, u]
    );
    return { ok: true, messages: rows };
  } catch (e) { return fail(e); }
}

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
    revalidatePath(`/orders/${orderId}`);
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
    revalidatePath("/notifications");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── Listings ─────────────
export async function createListing(data) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
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
    if (!file) return { error: "Файл алга" };
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
    revalidatePath(`/listings/${listingId}`);
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
    revalidatePath(`/orders/${orderId}`);
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function adminSetVerified(userId, verified) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    await query("select public.admin_set_verified($1,$2,$3)", [userId, Boolean(verified), u]);
    revalidatePath("/orders");
    return { ok: true };
  } catch (e) { return fail(e); }
}

// ───────────── QPay ─────────────
export async function createQpayInvoice(orderId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const order = await queryOne(
      `select id, amount, status, buyer_id, qpay_invoice_id from public.orders where id=$1`, [orderId]
    );
    if (!order || order.buyer_id !== u) return { error: "Захиалга олдсонгүй / эрх алга" };
    if (order.status !== "created") return { error: "Энэ захиалга төлбөр хүлээхгүй" };

    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const cbToken = process.env.QPAY_CALLBACK_TOKEN || "";
    const callbackUrl = `${site}/api/qpay/callback?order=${orderId}&token=${encodeURIComponent(cbToken)}`;

    if (order.qpay_invoice_id) {
      try {
        const existing = await qpay.getInvoice(order.qpay_invoice_id);
        return { ok: true, invoice: {
          invoice_id: order.qpay_invoice_id, qr_text: existing.qr_text ?? null,
          qr_image: existing.qr_image ?? null, urls: existing.urls ?? [],
        } };
      } catch {
        // Хуучин invoice хүчингүй/устсан → id-г цэвэрлэж шинээр үүсгэнэ (худалдан авагч гацахгүй)
        await queryOne(
          `update public.orders set qpay_invoice_id = null where id = $1 and status = 'created' returning id`,
          [orderId]
        );
        order.qpay_invoice_id = null;
      }
    }
    const inv = await qpay.createInvoice({
      senderInvoiceNo: orderId, amount: Number(order.amount),
      description: `MLBB захиалга ${orderId}`, callbackUrl,
    });
    const saved = await queryOne(
      `update public.orders set qpay_invoice_id=$1 where id=$2 and status='created' returning id`,
      [inv.invoice_id, orderId]
    );
    if (!saved) return { error: "Invoice хадгалж чадсангүй" };
    return { ok: true, invoice: {
      invoice_id: inv.invoice_id, qr_text: inv.qr_text ?? null,
      qr_image: inv.qr_image ?? null, urls: inv.urls ?? [],
    } };
  } catch (e) { return fail(e); }
}

// ───────────── Boosting захиалга ─────────────
const clampN = (n, min, max) => Math.min(max, Math.max(min, Math.round(Number(n) || 0)));

// Үнийг СЕРВЕР талд lib/boost-ийн логикоор дахин тооцоолно (client дүнд найдахгүй).
export async function createBoostOrder(service, config) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  if (!["winrate", "rank", "squad"].includes(service)) return { error: "Буруу үйлчилгээ" };
  const c = config || {};
  const opts = { express: !!c.express, duo: !!c.duo };
  let matches = 0, perMatch = 0;
  if (service === "winrate") { matches = clampN(c.wins, BOOST.winrate.min, BOOST.winrate.max); perMatch = BOOST.winrate.perMatch; }
  else if (service === "rank") { matches = rankMatches(Number(c.fromIdx), Number(c.toIdx)); perMatch = BOOST.rank.perMatch; }
  else { matches = clampN(c.matches, BOOST.squad.min, BOOST.squad.max); perMatch = BOOST.squad.perMatch; opts.duo = false; }
  if (matches <= 0) return { error: "Тохиргоо буруу байна" };
  const amount = boostTotal(matches, perMatch, opts);
  try {
    const row = await queryOne(
      `insert into public.boost_orders (buyer_id, service, config, matches, amount)
       values ($1,$2,$3::jsonb,$4,$5) returning id`,
      [u, service, JSON.stringify({ ...c, ...opts }), matches, amount]
    );
    return { ok: true, id: row.id };
  } catch (e) { return fail(e); }
}

export async function createBoostInvoice(boostId) {
  const u = await uid(); if (!u) return { error: "Нэвтэрнэ үү" };
  try {
    const o = await queryOne(
      `select id, amount, status, buyer_id, qpay_invoice_id from public.boost_orders where id=$1`, [boostId]
    );
    if (!o || o.buyer_id !== u) return { error: "Захиалга олдсонгүй / эрх алга" };
    if (o.status !== "created") return { error: "Энэ захиалга төлбөр хүлээхгүй" };

    const site = process.env.NEXT_PUBLIC_SITE_URL || "";
    const cbToken = process.env.QPAY_CALLBACK_TOKEN || "";
    const callbackUrl = `${site}/api/qpay/callback?order=${boostId}&kind=boost&token=${encodeURIComponent(cbToken)}`;

    if (o.qpay_invoice_id) {
      try {
        const ex = await qpay.getInvoice(o.qpay_invoice_id);
        return { ok: true, invoice: { invoice_id: o.qpay_invoice_id, qr_text: ex.qr_text ?? null, qr_image: ex.qr_image ?? null, urls: ex.urls ?? [] } };
      } catch {
        await queryOne(`update public.boost_orders set qpay_invoice_id=null where id=$1 and status='created' returning id`, [boostId]);
      }
    }
    const inv = await qpay.createInvoice({ senderInvoiceNo: boostId, amount: Number(o.amount), description: `MLBB boost ${boostId}`, callbackUrl });
    const saved = await queryOne(`update public.boost_orders set qpay_invoice_id=$1 where id=$2 and status='created' returning id`, [inv.invoice_id, boostId]);
    if (!saved) return { error: "Invoice хадгалж чадсангүй" };
    return { ok: true, invoice: { invoice_id: inv.invoice_id, qr_text: inv.qr_text ?? null, qr_image: inv.qr_image ?? null, urls: inv.urls ?? [] } };
  } catch (e) { return fail(e); }
}
