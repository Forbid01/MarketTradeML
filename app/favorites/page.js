import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listFavorites } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/favorites");
  const t = await getT();

  const listings = await listFavorites(profile.id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-50">{t("favorites.title")}</h1>
      {!listings.length ? (
        <p className="py-12 text-center text-slate-500">{t("favorites.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} seller={l.seller} imageUrl={l.imageUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
