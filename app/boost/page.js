import { getT } from "@/lib/i18n/server";
import { WinrateBoostCalc, RankBoostCalc, SquadRentCalc, PlacementCalc, CoachingCalc } from "@/components/boost/Calculators";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("boost.title"),
    description: t("boost.subtitle"),
    alternates: { canonical: "/boost" },
  };
}

export default async function BoostPage() {
  const t = await getT();
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-azure">{t("boost.nav")}</p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("boost.title")}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">{t("boost.subtitle")}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <WinrateBoostCalc />
        <RankBoostCalc />
        <SquadRentCalc />
        <PlacementCalc />
        <CoachingCalc />
      </div>
    </div>
  );
}
