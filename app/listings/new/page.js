import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import ListingForm from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const { user } = await getCurrentUser();
  if (!user) redirect("/login?next=/listings/new");
  const t = await getT();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-slate-50">{t("listingForm.pageTitle")}</h1>
      <ListingForm />
    </div>
  );
}
