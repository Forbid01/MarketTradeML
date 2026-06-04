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
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-1 min-w-[160px] flex-col">
        <label className="mb-1 text-xs text-slate-400">{t("home.search")}</label>
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder={t("home.searchPh")}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]"
        />
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-400">{t("home.rank")}</label>
        <select name="rank" defaultValue={sp.rank ?? ""} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]">
          <option value="">{t("home.all")}</option>
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-400">{t("home.server")}</label>
        <select name="server" defaultValue={sp.server ?? ""} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]">
          <option value="">{t("home.all")}</option>
          {SERVERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-slate-400">{t("home.sort")}</label>
        <select name="sort" defaultValue={sp.sort ?? "new"} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]">
          <option value="new">{t("home.sortNew")}</option>
          <option value="price_asc">{t("home.sortPriceAsc")}</option>
          <option value="price_desc">{t("home.sortPriceDesc")}</option>
        </select>
      </div>
      <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">
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
        <p className="py-16 text-center text-slate-500">{t("home.empty")}</p>
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
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#6D5DF6]/15 to-white/[0.03] p-6">
      <h1 className="text-2xl font-bold text-slate-50">{t("home.heroTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">{t("home.heroSub")}</p>
    </section>
  );
}
