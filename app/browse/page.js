import { isDbConfigured } from "@/lib/db";
import { listActiveListings } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { RANKS, SERVERS } from "@/lib/constants";
import ListingCard from "@/components/ListingCard";
import SetupNotice from "@/components/SetupNotice";
import { Search } from "@/components/icons";

export const dynamic = "force-dynamic";

function FilterBar({ sp, t }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-1 min-w-[160px] flex-col">
        <label className="mb-1 text-xs text-slate-500">{t("home.search")}</label>
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("home.searchPh")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-500">{t("home.rank")}</label>
        <select name="rank" defaultValue={sp.rank ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
          <option value="">{t("home.all")}</option>
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-500">{t("home.server")}</label>
        <select name="server" defaultValue={sp.server ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
          <option value="">{t("home.all")}</option>
          {SERVERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-500">{t("home.sort")}</label>
        <select name="sort" defaultValue={sp.sort ?? "new"} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
          <option value="new">{t("home.sortNew")}</option>
          <option value="price_asc">{t("home.sortPriceAsc")}</option>
          <option value="price_desc">{t("home.sortPriceDesc")}</option>
        </select>
      </div>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        <Search size={16} />
        {t("home.filter")}
      </button>
    </form>
  );
}

export default async function Browse({ searchParams }) {
  const sp = (await searchParams) ?? {};
  const t = await getT();

  if (!isDbConfigured) {
    return (
      <div className="space-y-6">
        <PageHead t={t} />
        <SetupNotice />
      </div>
    );
  }

  const listings = await listActiveListings({
    q: sp.q,
    rank: sp.rank,
    server: sp.server,
    sort: sp.sort,
  });

  return (
    <div className="space-y-6">
      <PageHead t={t} />
      <FilterBar sp={sp} t={t} />

      {!listings?.length ? (
        <p className="py-16 text-center text-slate-400">{t("home.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              seller={l.seller}
              imageUrl={l.imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHead({ t }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{t("home.heroTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("home.heroSub")}</p>
    </section>
  );
}
