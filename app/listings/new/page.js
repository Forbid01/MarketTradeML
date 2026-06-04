import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import ListingForm from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login?next=/listings/new");
  const t = await getT();
  const me = profile && {
    display_name: profile.display_name,
    is_verified: profile.is_verified,
    rating_avg: profile.rating_avg,
    trades_count: profile.trades_count,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-bold text-slate-50">{t("listingForm.pageTitle")}</h1>
      <ListingForm me={me} />
    </div>
  );
}
