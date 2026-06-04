import { notFound, redirect } from "next/navigation";
import { isDbConfigured } from "@/lib/db";
import { getPublicProfile, getSellerActiveListings, getSellerReviews } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import ListingCard from "@/components/ListingCard";
import { BadgeCheck, Star } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SellerPage({ params }) {
  if (!isDbConfigured) redirect("/");
  const { id } = await params;
  const t = await getT();

  const seller = await getPublicProfile(id);
  if (!seller) notFound();

  const [listings, reviews] = await Promise.all([
    getSellerActiveListings(id),
    getSellerReviews(id, 10),
  ]);

  return (
    <div className="space-y-6">
      {/* Профайл толгой */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-2xl font-semibold text-blue-600">
          {seller.display_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="flex items-center gap-1 text-xl font-bold text-slate-900">
            {seller.display_name}
            {seller.is_verified && <BadgeCheck size={20} className="text-blue-600" aria-label="Баталгаажсан" />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <Star size={16} filled className="text-amber-500" />
            {t("seller.meta", {
              rating: Number(seller.rating_avg).toFixed(1),
              n: seller.trades_count,
              date: formatDateTime(seller.created_at),
            })}
          </p>
        </div>
      </div>

      {/* Идэвхтэй зар */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-600">{t("seller.activeListings", { n: listings?.length ?? 0 })}</h2>
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
        <h2 className="text-sm font-semibold text-slate-600">{t("seller.reviews", { n: reviews?.length ?? 0 })}</h2>
        {!reviews?.length ? (
          <p className="text-sm text-slate-400">{t("seller.noReviews")}</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-0.5" aria-label={`${r.stars}/5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      filled={i < r.stars}
                      className={i < r.stars ? "text-amber-500" : "text-slate-300"}
                    />
                  ))}
                </span>
                <span className="text-xs text-slate-400">{formatDateTime(r.created_at)}</span>
              </div>
              {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
