import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listingImageUrl } from "@/lib/supabase/storage";
import { getT } from "@/lib/i18n/server";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { user, supabase } = await getCurrentUser();
  if (!user) redirect("/login?next=/favorites");
  const t = await getT();

  // RLS зөвхөн миний favorites-ийг буцаана; listings-ийг embed-ээр авна.
  const { data: rows, error } = await supabase
    .from("favorites")
    .select("listing_id, created_at, listings(id, title, price, server, rank, status, seller_id, listing_images(storage_path, sort_order))")
    .order("created_at", { ascending: false });

  const listings = (rows ?? []).map((r) => r.listings).filter(Boolean);

  let profileMap = {};
  if (listings.length) {
    const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
    const { data: profiles } = await supabase
      .from("public_profiles")
      .select("id, display_name, is_verified, rating_avg")
      .in("id", sellerIds);
    for (const p of profiles ?? []) profileMap[p.id] = p;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t("favorites.title")}</h1>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">{t("common.error")}</p>
      ) : !listings.length ? (
        <p className="py-12 text-center text-slate-400">{t("favorites.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => {
            const img = (l.listing_images ?? []).sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <ListingCard
                key={l.id}
                listing={l}
                seller={profileMap[l.seller_id]}
                imageUrl={listingImageUrl(img?.storage_path)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
