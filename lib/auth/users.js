// Хэрэглэгчийн upsert/lookup (Auth.js нэвтрэлттэй холбоотой). ЗӨВХӨН сервер тал.
import { queryOne } from "@/lib/db";

// Нэвтрэх үед email-ээр хэрэглэгч үүсгэх/шинэчлэх. display_name fallback = email-ийн эхэн хэсэг.
// Давхар нэвтрэлтэд role/is_verified зэрэг итгэлцлийн багана хэвээр (guard trigger хамгаална).
export async function upsertUserByEmail(email, { name, image } = {}) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return null;
  const display = (name && String(name).trim()) || normalized.split("@")[0] || "Хэрэглэгч";
  return queryOne(
    `insert into public.users (email, display_name, image)
     values ($1, $2, $3)
     on conflict (email) do update set image = coalesce(excluded.image, public.users.image)
     returning id, email, display_name, role, is_verified`,
    [normalized, display, image ?? null]
  );
}

export async function getUserById(id) {
  if (!id) return null;
  return queryOne(
    `select id, email, display_name, image, avatar_url, role, is_verified, rating_avg, trades_count
       from public.users where id = $1 and deleted_at is null`,
    [id]
  );
}
