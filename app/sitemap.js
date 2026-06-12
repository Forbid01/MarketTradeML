// Next metadata route → /sitemap.xml. Статик нийтийн хуудсууд + идэвхтэй зар,
// зарагчийн профайл бүр (crawler-т inventory харагдана). DB-гүй/алдаатай үед статикууд л.
import { query, isDbConfigured } from "@/lib/db";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://mlbb-market.vercel.app";
  const statics = ["", "/browse", "/boost", "/login"].map((r) => ({
    url: `${base}${r}`,
    changeFrequency: r === "/browse" ? "hourly" : "daily",
    priority: r === "" ? 1 : 0.7,
  }));
  if (!isDbConfigured) return statics;

  try {
    const [listings, sellers] = await Promise.all([
      query(
        `select id, updated_at from public.listings
          where status = 'active' and deleted_at is null
          order by updated_at desc limit 5000`
      ),
      query(
        `select l.seller_id as id, max(l.updated_at) as updated_at
           from public.listings l
          where l.status = 'active' and l.deleted_at is null
          group by l.seller_id limit 1000`
      ),
    ]);
    return [
      ...statics,
      ...listings.map((l) => ({
        url: `${base}/listings/${l.id}`,
        lastModified: l.updated_at,
        changeFrequency: "daily",
        priority: 0.8,
      })),
      ...sellers.map((s) => ({
        url: `${base}/sellers/${s.id}`,
        lastModified: s.updated_at,
        changeFrequency: "daily",
        priority: 0.5,
      })),
    ];
  } catch {
    return statics;
  }
}
