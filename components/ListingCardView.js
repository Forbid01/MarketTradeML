// Зарын картын ЦЭВЭР харагдах хэсэг — hook-гүй тул server component дотор шууд
// (browse-ийн 48 карт client boundary үүсгэхгүй), client дотор ч (ListingForm preview)
// ажиллана. Орчуулсан текст/форматласан үнийг дуудагч талаас бэлэн өгнө.
import Link from "next/link";
import Image from "next/image";
import { ImageIcon, BadgeCheck, Star, ShieldCheck } from "@/components/icons";

const NEW_MS = 7 * 24 * 60 * 60 * 1000; // 7 хоног дотор үүссэн зар = "ШИНЭ"
function isFresh(createdAt) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  return Number.isFinite(t) && Date.now() - t < NEW_MS;
}

// labels: { fresh, escrow, status?: string|null, tier?: { label, color }|null }
export default function ListingCardView({ listing, seller, imageUrl, priceText, labels }) {
  const fresh = isFresh(listing.createdAt);
  // active бус зар (favorites-д үлдсэн sold/reserved) — бүдэгрүүлж badge-аар тэмдэглэнэ
  const inactive = Boolean(labels.status);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-0.5 hover:border-violet/40 hover:bg-white/[0.06] hover:shadow-[0_18px_50px_-24px_rgba(109,93,246,0.7)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-white/5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition duration-500 group-hover:scale-105 ${inactive ? "opacity-40 grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-600">
            <ImageIcon size={40} />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-[#06070E]/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-azure ring-1 ring-azure/20 backdrop-blur">
          {listing.rank}
        </span>
        {inactive && (
          <span className="absolute right-2 top-2 rounded-md bg-[#06070E]/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300 ring-1 ring-white/20 backdrop-blur">
            {labels.status}
          </span>
        )}
        {!inactive && fresh && (
          <span className="absolute right-2 top-2 rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#06070E]">
            {labels.fresh}
          </span>
        )}
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-[#06070E]/75 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/20 backdrop-blur">
          <ShieldCheck size={11} /> {labels.escrow}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-slate-100">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="text-base font-bold text-azure">{priceText}</span>
          <span className="text-xs text-slate-400">{listing.server}</span>
        </div>
        {seller && (
          <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 text-xs text-slate-400">
            {labels.tier && (
              <span
                className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ color: labels.tier.color, backgroundColor: `${labels.tier.color}1f` }}
              >
                {labels.tier.label}
              </span>
            )}
            <span className="truncate">{seller.display_name}</span>
            {seller.is_verified && <BadgeCheck size={14} className="shrink-0 text-azure" />}
            {seller.rating_avg > 0 && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-gold">
                <Star size={12} filled /> {Number(seller.rating_avg).toFixed(1)}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
