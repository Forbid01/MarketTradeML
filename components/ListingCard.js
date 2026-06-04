import Link from "next/link";
import { formatMNT } from "@/lib/format";
import { ImageIcon, BadgeCheck, Star } from "@/components/icons";

export default function ListingCard({ listing, seller, imageUrl }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-400 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon size={40} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-blue-700 shadow-sm">
          {listing.rank}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-900">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-base font-semibold text-blue-600">{formatMNT(listing.price)}</span>
          <span className="text-xs text-slate-400">{listing.server}</span>
        </div>
        {seller && (
          <div className="flex items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span className="truncate">{seller.display_name}</span>
            {seller.is_verified && <BadgeCheck size={14} className="text-blue-600" />}
            {seller.rating_avg > 0 && (
              <span className="ml-auto inline-flex items-center gap-0.5 text-amber-500">
                <Star size={12} filled /> {Number(seller.rating_avg).toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
