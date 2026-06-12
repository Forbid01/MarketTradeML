import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/validation";
import { isDbConfigured } from "@/lib/db";
import { getPublicProfile, getSellerActiveListings, getSellerReviews } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import ListingCard from "@/components/ListingCard";
import { BadgeCheck, Star } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!isDbConfigured || !isUuid(id)) return {};
  try {
    const seller = await getPublicProfile(id);
    if (!seller) return {};
    return { title: seller.display_name, alternates: { canonical: `/sellers/${id}` } };
  } catch {
    return {};
  }
}

export default async function SellerPage({ params }) {
  if (!isDbConfigured) redirect("/");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getT();
  const locale = await getLocale();

  const seller = await getPublicProfile(id);
  if (!seller) notFound();

  const [listings, reviews] = await Promise.all([
    getSellerActiveListings(id),
    getSellerReviews(id, 10),
  ]);

  return (
    <div className="space-y-6">
      {/* Профайл толгой */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-azure/10 text-2xl font-semibold text-azure">
          {seller.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="flex items-center gap-1 text-xl font-bold text-slate-50">
            {seller.display_name}
            {seller.is_verified && <BadgeCheck size={20} className="text-azure" aria-label="Баталгаажсан" />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-400">
            {Number(seller.rating_avg) > 0 ? (
              <>
                <Star size={16} filled className="text-gold" />
                {t("seller.meta", {
                  rating: Number(seller.rating_avg).toFixed(1),
                  n: seller.trades_count,
                  date: formatDateTime(seller.created_at, locale),
                })}
              </>
            ) : (
              <>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">{t("seller.newSeller")}</span>
                {t("seller.metaNew", { n: seller.trades_count, date: formatDateTime(seller.created_at, locale) })}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Идэвхтэй зар */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">{t("seller.activeListings", { n: listings?.length ?? 0 })}</h2>
        {!listings?.length ? (
          <p className="text-sm text-slate-400">{t("seller.noListings")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                seller={seller}
                imageUrl={l.imageUrl}
              />
            ))}
          </div>
        )}
      </section>

      {/* Үнэлгээ */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-300">{t("seller.reviews", { n: reviews?.length ?? 0 })}</h2>
        {!reviews?.length ? (
          <p className="text-sm text-slate-400">{t("seller.noReviews")}</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-0.5" aria-label={`${r.stars}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      filled={i < r.stars}
                      className={i < r.stars ? "text-gold" : "text-white/15"}
                    />
                  ))}
                </span>
                <span className="text-xs text-slate-400">{formatDateTime(r.created_at, locale)}</span>
              </div>
              {r.comment && <p className="mt-1 text-slate-300">{r.comment}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
