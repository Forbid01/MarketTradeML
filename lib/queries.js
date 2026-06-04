// Серверийн талын УНШИХ функцууд (server component-уудад). RLS байхгүй тул эрхийн
// шалгалтыг WHERE/параметрээр энд эсвэл дуудагч хуудсанд хийнэ.
import { query, queryOne } from "@/lib/db";

const money = (v) => (v == null ? v : Number(v));

// ───────────── Listings ─────────────
export async function listActiveListings({ q, rank, server, sort, minPrice, maxPrice, verified } = {}) {
  const where = ["l.status = 'active'", "l.deleted_at is null"];
  const params = [];
  if (rank)   { params.push(rank);   where.push(`l.rank = $${params.length}`); }
  if (server) { params.push(server); where.push(`l.server = $${params.length}`); }
  if (q)      { params.push(`%${q}%`); where.push(`l.title ilike $${params.length}`); }
  const mn = parseInt(minPrice, 10);
  const mx = parseInt(maxPrice, 10);
  if (Number.isFinite(mn) && mn > 0) { params.push(mn); where.push(`l.price >= $${params.length}`); }
  if (Number.isFinite(mx) && mx > 0) { params.push(mx); where.push(`l.price <= $${params.length}`); }
  if (verified) where.push(`p.is_verified = true`);
  const order = sort === "price_asc" ? "l.price asc"
              : sort === "price_desc" ? "l.price desc"
              : sort === "rating" ? "p.rating_avg desc nulls last, l.created_at desc"
              : "l.created_at desc";
  const rows = await query(
    `select l.id, l.title, l.price, l.server, l.rank, l.seller_id,
            (select url from public.listing_images li where li.listing_id = l.id order by li.sort_order limit 1) as image_url,
            p.display_name, p.is_verified, p.rating_avg
       from public.listings l
       left join public.public_profiles p on p.id = l.seller_id
      where ${where.join(" and ")}
      order by ${order} limit 48`,
    params
  );
  return rows.map((r) => ({
    id: r.id, title: r.title, price: money(r.price), server: r.server, rank: r.rank, seller_id: r.seller_id,
    imageUrl: r.image_url ?? null,
    seller: { display_name: r.display_name, is_verified: r.is_verified, rating_avg: r.rating_avg },
  }));
}

export async function getListingById(id) {
  const listing = await queryOne(
    `select * from public.listings where id = $1 and deleted_at is null`, [id]
  );
  if (!listing) return null;
  listing.price = money(listing.price);
  const images = await query(
    `select url, sort_order from public.listing_images where listing_id = $1 order by sort_order`, [id]
  );
  return { ...listing, images };
}

export async function getSellerActiveListings(sellerId) {
  const rows = await query(
    `select l.id, l.title, l.price, l.server, l.rank, l.seller_id,
            (select url from public.listing_images li where li.listing_id = l.id order by li.sort_order limit 1) as image_url
       from public.listings l
      where l.seller_id = $1 and l.status = 'active' and l.deleted_at is null
      order by l.created_at desc`, [sellerId]
  );
  return rows.map((r) => ({
    id: r.id, title: r.title, price: money(r.price), server: r.server, rank: r.rank, seller_id: r.seller_id,
    imageUrl: r.image_url ?? null,
  }));
}

// ───────────── Profiles / reviews ─────────────
export async function getPublicProfile(id) {
  return queryOne(
    `select id, display_name, avatar_url, is_verified, rating_avg, trades_count, created_at
       from public.public_profiles where id = $1`, [id]
  );
}

export async function getProfileVerified(id) {
  return queryOne(`select id, is_verified from public.public_profiles where id = $1`, [id]);
}

export async function getSellerReviews(sellerId, limit = 10) {
  return query(
    `select id, stars, comment, created_at from public.reviews
      where seller_id = $1 order by created_at desc limit $2`, [sellerId, limit]
  );
}

// ───────────── Favorites ─────────────
export async function isFavorited(userId, listingId) {
  if (!userId) return false;
  const row = await queryOne(
    `select 1 from public.favorites where user_id = $1 and listing_id = $2`, [userId, listingId]
  );
  return Boolean(row);
}

export async function listFavorites(userId) {
  const rows = await query(
    `select l.id, l.title, l.price, l.server, l.rank, l.seller_id,
            (select url from public.listing_images li where li.listing_id = l.id order by li.sort_order limit 1) as image_url,
            p.display_name, p.is_verified, p.rating_avg
       from public.favorites f
       join public.listings l on l.id = f.listing_id and l.deleted_at is null
       left join public.public_profiles p on p.id = l.seller_id
      where f.user_id = $1
      order by f.created_at desc`, [userId]
  );
  return rows.map((r) => ({
    id: r.id, title: r.title, price: money(r.price), server: r.server, rank: r.rank, seller_id: r.seller_id,
    imageUrl: r.image_url ?? null,
    seller: { display_name: r.display_name, is_verified: r.is_verified, rating_avg: r.rating_avg },
  }));
}

// ───────────── Orders ─────────────
export async function listOrders(userId) {
  const rows = await query(
    `select o.id, o.status, o.amount, o.fee, o.created_at, o.buyer_id, o.seller_id, l.title as listing_title
       from public.orders o join public.listings l on l.id = o.listing_id
      where o.buyer_id = $1 or o.seller_id = $1
      order by o.created_at desc`, [userId]
  );
  return rows.map((r) => ({ ...r, amount: money(r.amount), fee: money(r.fee) }));
}

// Эрхтэй (buyer/seller/admin) бол захиалга буцаана, эс бөгөөс null.
export async function getOrderForParty(orderId, userId, admin = false) {
  const o = await queryOne(
    `select o.*, l.title as listing_title
       from public.orders o join public.listings l on l.id = o.listing_id
      where o.id = $1`, [orderId]
  );
  if (!o) return null;
  if (!admin && o.buyer_id !== userId && o.seller_id !== userId) return null;
  o.amount = money(o.amount); o.fee = money(o.fee);
  return o;
}

// Эдгээр нь захиалгын дэлгэрэнгүй унших функцууд. Эзэмшлийн шалгалтыг ДОТОР нь хийнэ
// (зөвхөн дуудагч хуудсанд найдахгүй) — userId захиалгын тал, эсвэл admin=true байх ёстой.
function partyGate() {
  return `($3 or exists (select 1 from public.orders o where o.id = $1 and $2 in (o.buyer_id, o.seller_id)))`;
}

export async function getChecklist(orderId, userId, admin = false) {
  return queryOne(
    `select tc.* from public.transfer_checklist tc where tc.order_id = $1 and ${partyGate()}`,
    [orderId, userId, admin]
  );
}

export async function getLatestDispute(orderId, userId, admin = false) {
  return queryOne(
    `select d.* from public.disputes d where d.order_id = $1 and ${partyGate()}
      order by d.created_at desc limit 1`,
    [orderId, userId, admin]
  );
}

export async function getMessages(orderId, userId, admin = false) {
  return query(
    `select m.id, m.sender_id, m.body, m.created_at from public.messages m
      where m.order_id = $1 and ${partyGate()} order by m.created_at asc`,
    [orderId, userId, admin]
  );
}

export async function getReviewForOrder(orderId, userId, admin = false) {
  return queryOne(
    `select r.id, r.stars, r.comment from public.reviews r where r.order_id = $1 and ${partyGate()}`,
    [orderId, userId, admin]
  );
}

// ───────────── Notifications ─────────────
export async function listNotifications(userId, limit = 50) {
  return query(
    `select id, type, title, body, order_id, is_read, created_at
       from public.notifications where user_id = $1 order by created_at desc limit $2`,
    [userId, limit]
  );
}

export async function getUnreadCount(userId) {
  const row = await queryOne(
    `select count(*)::int as n from public.notifications where user_id = $1 and is_read = false`, [userId]
  );
  return row?.n ?? 0;
}

// ───────────── Admin worklist ─────────────
export async function listOpenDisputes() {
  return query(
    `select d.id, d.reason, d.status, d.created_at, d.order_id, l.title as listing_title
       from public.disputes d
       join public.orders o on o.id = d.order_id
       join public.listings l on l.id = o.listing_id
      where d.status = 'open' order by d.created_at asc`
  );
}

export async function listPendingPayouts() {
  const rows = await query(
    `select o.id, o.amount, o.fee, o.created_at, l.title as listing_title
       from public.orders o join public.listings l on l.id = o.listing_id
      where o.status = 'completed' and o.payout_status = 'pending'
      order by o.created_at asc`
  );
  return rows.map((r) => ({ ...r, amount: money(r.amount), fee: money(r.fee) }));
}

// ───────────── Boost orders ─────────────
export async function getBoostOrder(id, userId, admin = false) {
  const o = await queryOne(`select * from public.boost_orders where id = $1`, [id]);
  if (!o) return null;
  if (!admin && o.buyer_id !== userId) return null;
  o.amount = money(o.amount);
  return o;
}

export async function listBoostOrders(userId) {
  const rows = await query(
    `select id, service, matches, amount, status, created_at
       from public.boost_orders where buyer_id = $1 order by created_at desc`,
    [userId]
  );
  return rows.map((r) => ({ ...r, amount: money(r.amount) }));
}
