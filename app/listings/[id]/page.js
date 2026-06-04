import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getListingById, getPublicProfile, getSellerReviews, isFavorited } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { PLATFORM_FEE_RATE } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import BuyButton from "@/components/BuyButton";
import OwnerControls from "@/components/OwnerControls";
import FavoriteButton from "@/components/FavoriteButton";
import { ImageIcon, BadgeCheck, Star, ShieldCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ListingDetail({ params }) {
  if (!isDbConfigured) redirect("/");
  const { id } = await params;
  const t = await getT();

  const listing = await getListingById(id);
  if (!listing) notFound();

  const seller = await getPublicProfile(listing.seller_id);

  const reviews = await getSellerReviews(listing.seller_id, 5);

  const { user, profile } = await getCurrentUser();
  const isOwner = profile?.id === listing.seller_id;

  const favorited = user && !isOwner ? await isFavorited(profile.id, id) : false;

  const images = listing.images ?? [];
  const fee = Math.round(listing.price * PLATFORM_FEE_RATE);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-50">{t("common.back")}</Link>

      {/* Зургийн галерей */}
      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto rounded-xl">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.url}
              src={img.url}
              alt={listing.title}
              className="h-56 w-auto rounded-lg border border-white/10 object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-500">
          <ImageIcon size={48} />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-[#38BDF8]/10 px-2 py-1 text-[#7dd3fc]">{listing.rank}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-slate-300">{listing.server}</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-slate-400">{t(`listingStatus.${listing.status}`)}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-50">{listing.title}</h1>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(listing.created_at)}</p>
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
                <Link href={`/sellers/${listing.seller_id}`} className="inline-flex items-center gap-1 font-medium text-slate-50 hover:text-[#38BDF8]">
                  {seller.display_name}
                  {seller.is_verified && <BadgeCheck size={16} className="text-[#38BDF8]" />}
                </Link>
                <span className="inline-flex items-center gap-1 text-sm text-[#F5C451]">
                  <Star size={14} filled className="text-amber-500" /> {Number(seller.rating_avg).toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t("listing.tradesCount", { n: seller.trades_count })}</p>
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
            <p className="text-2xl font-bold text-[#38BDF8]">{formatMNT(listing.price)}</p>
            <p className="mt-1 text-xs text-slate-500">{t("listing.feeNote", { fee: formatMNT(fee) })}</p>

            <div className="mt-3 border-t border-white/10 pt-3">
              {isOwner ? (
                <OwnerControls listingId={listing.id} status={listing.status} />
              ) : listing.status !== "active" ? (
                <p className="text-sm text-slate-400">{t("listing.notAvailable", { status: t(`listingStatus.${listing.status}`) })}</p>
              ) : !user ? (
                <Link
                  href={`/login?next=/listings/${listing.id}`}
                  className="block w-full rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-3 text-center text-sm font-semibold text-white hover:brightness-110"
                >
                  {t("listing.loginToBuy")}
                </Link>
              ) : (
                <BuyButton listingId={listing.id} />
              )}
            </div>
          </div>

          {user && !isOwner && <FavoriteButton listingId={listing.id} initialFavorited={favorited} />}

          {/* Escrow тайлбар */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-slate-400">
            <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldCheck size={16} className="text-[#38BDF8]" />
              {t("listing.escrowTitle")}
            </p>
            {t("listing.escrowBody")}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="text-center">
      <p className="text-base font-semibold text-slate-50">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
