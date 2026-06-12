// DB-д суурилсан энгийн rate limit — server action болон route handler хоёул ашиглана.
// ЗӨВХӨН сервер тал.
import { queryOne } from "@/lib/db";

export const RL = "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.";

// <action>:<key> bucket-д сүүлийн цонхны тоог хязгаарлана.
export async function rateOk(action, key, max, perSeconds) {
  const bucket = `${action}:${key}`;
  try {
    // Нэг statement (нэг snapshot): сүүлийн цонхны тоог үзээд хязгаараас доош бол л шинэ
    // event оруулна. Шалгалт + insert-ийг ижил statement-д нэгтгэснээр өмнөх select-дараа-
    // insert хоёрын хооронд байсан app round-trip TOCTOU цонхыг хаана.
    const row = await queryOne(
      `with recent as (
         select count(*)::int n from public.rate_events
          where bucket = $1 and created_at > now() - ($2 || ' seconds')::interval
       ), ins as (
         insert into public.rate_events (bucket)
         select $1 where (select n from recent) < $3::int
         returning 1
       )
       select exists (select 1 from ins) as allowed`,
      [bucket, String(perSeconds), max]
    );
    return row?.allowed ?? true;
  } catch {
    return true; // limiter эвдэрвэл хэрэглэгчийг блоклохгүй
  }
}
