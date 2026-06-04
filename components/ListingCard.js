"use client";

import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/client";
import { formatMNT } from "@/lib/format";
import { sellerTier } from "@/lib/sellerTier";
import { ImageIcon, BadgeCheck, Star, ShieldCheck } from "@/components/icons";

const NEW_MS = 7 * 24 * 60 * 60 * 1000; // 7 хоног дотор үүссэн зар = "ШИНЭ"
function isFresh(createdAt) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_MS;
}

export default function ListingCard({ listing, seller, imageUrl }) {
  const t = useT();
  const locale = useLocale();
  const fresh = isFresh(listing.createdAt);
  const tier = seller ? sellerTier(seller.trades_count) : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-[#6D5DF6]/40 hover:bg-white/[0.06] hover:shadow-[0_18px_50px_-24px_rgba(109,93,246,0.7)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-white/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-600">
            <ImageIcon size={40} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-[#06070E]/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#38BDF8] ring-1 ring-[#38BDF8]/20 backdrop-blur">
          {listing.rank}
        </span>
        {fresh && (
          <span className="absolute right-2 top-2 rounded-md bg-[#F5C451] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#06070E]">
            {t("card.new")}
          </span>
        )}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-[#06070E]/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/20 backdrop-blur">
          <ShieldCheck size={11} /> {t("card.escrow")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-100">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-base font-bold text-[#38BDF8]">{formatMNT(listing.price, locale)}</span>
          <span className="text-xs text-slate-500">{listing.server}</span>
        </div>
        {seller && (
          <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 text-xs text-slate-400">
            {tier && (
              <span
                className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ color: tier.color, backgroundColor: `${tier.color}1f` }}
              >
                {t(`sellerTier.${tier.key}`)}
              </span>
            )}
            <span className="truncate">{seller.display_name}</span>
            {seller.is_verified && <BadgeCheck size={14} className="shrink-0 text-[#38BDF8]" />}
            {seller.rating_avg > 0 && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[#F5C451]">
                <Star size={12} filled /> {Number(seller.rating_avg).toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
