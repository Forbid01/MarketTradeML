import Link from "next/link";
import { formatMNT } from "@/lib/format";
import { ImageIcon, BadgeCheck, Star } from "@/components/icons";

export default function ListingCard({ listing, seller, imageUrl }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:border-[#6D5DF6]/40 hover:bg-white/[0.06]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-white/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
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
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-100">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-base font-bold text-[#38BDF8]">{formatMNT(listing.price)}</span>
          <span className="text-xs text-slate-500">{listing.server}</span>
        </div>
        {seller && (
          <div className="flex items-center gap-1 border-t border-white/5 pt-2 text-xs text-slate-400">
            <span className="truncate">{seller.display_name}</span>
            {seller.is_verified && <BadgeCheck size={14} className="text-[#38BDF8]" />}
            {seller.rating_avg > 0 && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-[#F5C451]">
                <Star size={12} filled /> {Number(seller.rating_avg).toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
