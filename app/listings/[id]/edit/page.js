import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getListingById } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import ListingForm from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect(`/login?next=/listings/${id}/edit`);

  const listing = await getListingById(id);
  if (!listing) notFound();
  // Зөвхөн эзэн, зарагдаагүй зар
  if (listing.seller_id !== profile.id || !["active", "draft", "hidden"].includes(listing.status)) {
    redirect(`/listings/${id}`);
  }
  const t = await getT();
  const me = {
    display_name: profile.display_name,
    is_verified: profile.is_verified,
    rating_avg: profile.rating_avg,
    trades_count: profile.trades_count,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/listings/${id}`} className="text-sm text-slate-400 hover:text-slate-50">{t("common.back")}</Link>
      <h1 className="text-xl font-bold text-slate-50">{t("listingForm.editTitle")}</h1>
      <ListingForm listing={listing} images={listing.images ?? []} me={me} />
    </div>
  );
}
