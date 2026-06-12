import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/validation";
import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getListingById, getPublicProfile, getSellerReviews, getSellerActiveListings, isFavorited } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { PLATFORM_FEE_RATE } from "@/lib/constants";
import { getT, getLocale } from "@/lib/i18n/server";
import BuyButton from "@/components/BuyButton";
import OwnerControls from "@/components/OwnerControls";
import FavoriteButton from "@/components/FavoriteButton";
import GalleryLightbox from "@/components/GalleryLightbox";
import BackLink from "@/components/BackLink";
import ListingCard from "@/components/ListingCard";
import { ImageIcon, BadgeCheck, Star, ShieldCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// SEO/OG — зар тус бүрийн динамик метадата (хуваалцах, хайлтад)
export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!isDbConfigured) return { title: "MLBB Market" };
  try {
    const l = await getListingById(id);
    if (!l) return { title: "MLBB Market" };
    const locale = await getLocale();
    // layout-ийн title.template "%s — MLBB Market" суффиксээ өөрөө нэмнэ
    const title = `${l.title} · ${l.rank}`;
    const description = (l.description?.slice(0, 160)) || `${l.rank} · ${l.server} · ${formatMNT(l.price, locale)}`;
    // og:image-ийг ЗААЖ ӨГӨХГҮЙ — opengraph-image.js file convention (үнэ/ранктай
    // брэндийн карт) автоматаар og:image + twitter:image болж орно.
    return {
      title,
      description,
      alternates: { canonical: `/listings/${id}` },
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: "MLBB Market" };
  }
}

export default async function ListingDetail({ params }) {
  if (!isDbConfigured) redirect("/");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getT();
  const locale = await getLocale();

  const listing = await getListingById(id);
  if (!listing) notFound();

  // Бие даасан уншилтуудыг зэрэгцээ татна (дараалсан round-trip → 1 хүлээлт)
  const [seller, reviews, sellerListings, { user, profile }] = await Promise.all([
    getPublicProfile(listing.seller_id),
    getSellerReviews(listing.seller_id, 5),
    getSellerActiveListings(listing.seller_id),
    getCurrentUser(),
  ]);
  const isOwner = profile?.id === listing.seller_id;
  // Cross-sell: одоо үзэж буй зараа хасаад эхний 4-ийг үзүүлнэ
  const moreFromSeller = sellerListings.filter((l) => l.id !== listing.id).slice(0, 4);

  const favorited = user && !isOwner ? await isFavorited(profile.id, id) : false;

  const images = listing.images ?? [];
  const fee = Math.round(listing.price * PLATFORM_FEE_RATE);

  // Хайлтын системд бүтээгдэхүүний бүтэцтэй өгөгдөл (rich results)
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://mlbb-market.vercel.app";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || `${listing.rank} · ${listing.server}`,
    image: images.map((i) => i.url),
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "MNT",
      availability:
        listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site}/listings/${listing.id}`,
    },
  };

  return (
    // pb-28: мобайл fixed CTA bar контентыг халхлахгүй (sm-ээс дээш bar байхгүй)
    <div className="mx-auto max-w-3xl space-y-6 pb-28 sm:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BackLink className="text-sm text-slate-400 hover:text-slate-50">{t("common.back")}</BackLink>

      {/* Зургийн галерей — next/image + товшиход бүтэн дэлгэцийн lightbox */}
      {images.length > 0 ? (
        <GalleryLightbox images={images} title={listing.title} />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400">
          <ImageIcon size={48} />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-azure/10 px-2 py-1 text-[#7dd3fc]">{listing.rank}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-slate-300">{listing.server}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-slate-400">{t(`listingStatus.${listing.status}`)}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-50">{listing.title}</h1>
            <p className="mt-1 text-xs text-slate-400">{formatDateTime(listing.created_at, locale)}</p>
          </div>

          {(listing.level != null ||
            listing.heroes_count != null ||
            listing.skins_count != null ||
            listing.win_rate != null) && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-4">
              <Spec label={t("listing.specLevel")} value={listing.level} />
              <Spec label={t("listing.specHeroes")} value={listing.heroes_count} />
              <Spec label={t("listing.specSkins")} value={listing.skins_count} />
              <Spec label={t("listing.specWinRate")} value={listing.win_rate != null ? `${listing.win_rate}%` : null} />
            </div>
          )}

          {listing.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{listing.description}</p>
          )}

          {/* Зарагч */}
          {seller && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <Link href={`/sellers/${listing.seller_id}`} className="inline-flex items-center gap-1 font-medium text-slate-50 hover:text-azure">
                  {seller.display_name}
                  {seller.is_verified && <BadgeCheck size={16} className="text-azure" />}
                </Link>
                {Number(seller.rating_avg) > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-gold">
                    <Star size={14} filled className="text-amber-500" /> {Number(seller.rating_avg).toFixed(1)}
                  </span>
                ) : (
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">{t("seller.newSeller")}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{t("listing.tradesCount", { n: seller.trades_count })}</p>
            </div>
          )}

          {/* Сүүлийн review */}
          {reviews?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">{t("listing.recentReviews")}</h3>
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        filled={i < r.stars}
                        className={i < r.stars ? "text-amber-500" : "text-white/15"}
                      />
                    ))}
                  </div>
                  {r.comment && <p className="mt-1 text-slate-300">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Үнэ + үйлдэл */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-2xl font-bold text-azure">{formatMNT(listing.price, locale)}</p>
            <p className="mt-1 text-xs text-slate-400">{t("listing.feeNote", { fee: formatMNT(fee, locale) })}</p>

            <div className="mt-3 border-t border-white/10 pt-3">
              {isOwner ? (
                <OwnerControls listingId={listing.id} status={listing.status} />
              ) : listing.status !== "active" ? (
                <p className="text-sm text-slate-400">{t("listing.notAvailable", { status: t(`listingStatus.${listing.status}`) })}</p>
              ) : !user ? (
                <Link
                  href={`/login?next=/listings/${listing.id}`}
                  className="block w-full rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-3 text-center text-sm font-semibold text-white hover:brightness-110"
                >
                  {t("listing.loginToBuy")}
                </Link>
              ) : (
                <BuyButton listingId={listing.id} price={listing.price} />
              )}
            </div>
          </div>

          {user && !isOwner && <FavoriteButton listingId={listing.id} initialFavorited={favorited} />}

          {/* Escrow тайлбар */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-400">
            <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldCheck size={16} className="text-azure" />
              {t("listing.escrowTitle")}
            </p>
            {t("listing.escrowBody")}
          </div>
        </aside>
      </div>

      {/* Cross-sell: энэ зарагчийн бусад идэвхтэй зар (конверс/AOV) */}
      {moreFromSeller.length > 0 && (
        <section className="space-y-3 border-t border-white/5 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            {t("listing.moreFromSeller", { name: seller?.display_name ?? "" })}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {moreFromSeller.map((l) => (
              <ListingCard key={l.id} listing={l} imageUrl={l.imageUrl} />
            ))}
          </div>
        </section>
      )}

      {/* Мобайл fixed CTA bar — гар утсанд aside бүх контентын доор ордог тул гол
          conversion элементийг үргэлж харагдуулна. .page-enter backwards fill тул fixed аюулгүй. */}
      {listing.status === "active" && !isOwner && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0B0E1A]/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-lg font-bold leading-tight text-azure">{formatMNT(listing.price, locale)}</p>
              <p className="text-[10px] text-slate-400">{t("listing.feeNote", { fee: formatMNT(fee, locale) })}</p>
            </div>
            <div className="min-w-0 flex-1">
              {!user ? (
                <Link
                  href={`/login?next=/listings/${listing.id}`}
                  className="block w-full rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-3 text-center text-sm font-semibold text-white hover:brightness-110"
                >
                  {t("listing.loginToBuy")}
                </Link>
              ) : (
                <BuyButton listingId={listing.id} price={listing.price} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="text-center">
      <p className="text-base font-semibold text-slate-50">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
