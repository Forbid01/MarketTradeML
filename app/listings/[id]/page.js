import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { listingImageUrl } from "@/lib/supabase/storage";
import { formatMNT, formatDateTime } from "@/lib/format";
import { PLATFORM_FEE_RATE } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";
import BuyButton from "@/components/BuyButton";
import OwnerControls from "@/components/OwnerControls";
import FavoriteButton from "@/components/FavoriteButton";
import { ImageIcon, BadgeCheck, Star, ShieldCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ListingDetail({ params }) {
  if (!isSupabaseConfigured) redirect("/");
  const { id } = await params;
  const supabase = await createClient();
  const t = await getT();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_images(storage_path, sort_order)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!listing) notFound();

  const { data: seller } = await supabase
    .from("public_profiles")
    .select("id, display_name, is_verified, rating_avg, trades_count")
    .eq("id", listing.seller_id)
    .maybeSingle();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, stars, comment, created_at")
    .eq("seller_id", listing.seller_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { user, profile } = await getCurrentUser();
  const isOwner = profile?.id === listing.seller_id;

  let favorited = false;
  if (user && !isOwner) {
    const { data: f } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("listing_id", id)
      .maybeSingle();
    favorited = Boolean(f);
  }
  const images = (listing.listing_images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  const fee = Math.round(listing.price * PLATFORM_FEE_RATE);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">{t("common.back")}</Link>

      {/* Зургийн галерей */}
      {images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto rounded-xl">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.storage_path}
              src={listingImageUrl(img.storage_path)}
              alt={listing.title}
              className="h-56 w-auto rounded-lg border border-slate-200 object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
          <ImageIcon size={48} />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{listing.rank}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{listing.server}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500">{t(`listingStatus.${listing.status}`)}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
            <p className="mt-1 text-xs text-slate-400">{formatDateTime(listing.created_at)}</p>
          </div>

          {(listing.level != null ||
            listing.heroes_count != null ||
            listing.skins_count != null ||
            listing.win_rate != null) && (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
              <Spec label={t("listing.specLevel")} value={listing.level} />
              <Spec label={t("listing.specHeroes")} value={listing.heroes_count} />
              <Spec label={t("listing.specSkins")} value={listing.skins_count} />
              <Spec label={t("listing.specWinRate")} value={listing.win_rate != null ? `${listing.win_rate}%` : null} />
            </div>
          )}

          {listing.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{listing.description}</p>
          )}

          {/* Зарагч */}
          {seller && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <Link href={`/sellers/${listing.seller_id}`} className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-blue-600">
                  {seller.display_name}
                  {seller.is_verified && <BadgeCheck size={16} className="text-blue-600" />}
                </Link>
                <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                  <Star size={14} filled className="text-amber-500" /> {Number(seller.rating_avg).toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t("listing.tradesCount", { n: seller.trades_count })}</p>
            </div>
          )}

          {/* Сүүлийн review */}
          {reviews?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-600">{t("listing.recentReviews")}</h3>
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        filled={i < r.stars}
                        className={i < r.stars ? "text-amber-500" : "text-slate-300"}
                      />
                    ))}
                  </div>
                  {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Үнэ + үйлдэл */}
        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{formatMNT(listing.price)}</p>
            <p className="mt-1 text-xs text-slate-400">{t("listing.feeNote", { fee: formatMNT(fee) })}</p>

            <div className="mt-3 border-t border-slate-200 pt-3">
              {isOwner ? (
                <OwnerControls listingId={listing.id} status={listing.status} />
              ) : listing.status !== "active" ? (
                <p className="text-sm text-slate-500">{t("listing.notAvailable", { status: t(`listingStatus.${listing.status}`) })}</p>
              ) : !user ? (
                <Link
                  href={`/login?next=/listings/${listing.id}`}
                  className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-slate-600">
              <ShieldCheck size={16} className="text-blue-600" />
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
      <p className="text-base font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}
