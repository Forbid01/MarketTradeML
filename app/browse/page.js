import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { listActiveListings } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { RANKS, SERVERS } from "@/lib/constants";
import ListingCard from "@/components/ListingCard";
import SetupNotice from "@/components/SetupNotice";
import { Search, X, Plus } from "@/components/icons";

export const dynamic = "force-dynamic";

const INPUT =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]";

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs text-slate-400">{label}</label>
      {children}
    </div>
  );
}

// Идэвхтэй filter бүрийг chip болгоно (хасах URL chip дотор).
function activeChips(sp) {
  const out = [];
  if (sp.q) out.push({ key: "q", label: `"${sp.q}"` });
  if (sp.rank) out.push({ key: "rank", label: sp.rank });
  if (sp.server) out.push({ key: "server", label: sp.server });
  if (sp.min) out.push({ key: "min", label: `≥ ${sp.min}₮` });
  if (sp.max) out.push({ key: "max", label: `≤ ${sp.max}₮` });
  if (sp.winRate) out.push({ key: "winRate", label: `WR ≥ ${sp.winRate}%` });
  if (sp.level) out.push({ key: "level", label: `Lv ≥ ${sp.level}` });
  return out;
}

// Тухайн нэг filter-ийг хассан /browse URL үүсгэнэ.
function urlWithout(sp, omit) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === omit || v == null || v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `/browse?${s}` : "/browse";
}

function FilterBar({ sp, t }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex min-w-[160px] flex-1 flex-col">
        <label className="mb-1 text-xs text-slate-400">{t("home.search")}</label>
        <input name="q" defaultValue={sp.q ?? ""} placeholder={t("home.searchPh")} className={INPUT} />
      </div>
      <Field label={t("home.rank")}>
        <select name="rank" defaultValue={sp.rank ?? ""} className={INPUT}>
          <option value="">{t("home.all")}</option>
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label={t("home.server")}>
        <select name="server" defaultValue={sp.server ?? ""} className={INPUT}>
          <option value="">{t("home.all")}</option>
          {SERVERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label={t("home.priceRange")}>
        <div className="flex items-center gap-1">
          <input name="min" defaultValue={sp.min ?? ""} inputMode="numeric" placeholder={t("home.min")} className={`${INPUT} w-20`} />
          <span className="text-slate-500">–</span>
          <input name="max" defaultValue={sp.max ?? ""} inputMode="numeric" placeholder={t("home.max")} className={`${INPUT} w-20`} />
        </div>
      </Field>
      <Field label={t("home.winRateMin")}>
        <input name="winRate" defaultValue={sp.winRate ?? ""} inputMode="numeric" placeholder="55" className={`${INPUT} w-16`} />
      </Field>
      <Field label={t("home.levelMin")}>
        <input name="level" defaultValue={sp.level ?? ""} inputMode="numeric" placeholder="30" className={`${INPUT} w-16`} />
      </Field>
      <Field label={t("home.sort")}>
        <select name="sort" defaultValue={sp.sort ?? "new"} className={INPUT}>
          <option value="new">{t("home.sortNew")}</option>
          <option value="price_asc">{t("home.sortPriceAsc")}</option>
          <option value="price_desc">{t("home.sortPriceDesc")}</option>
          <option value="rating">{t("home.sortRating")}</option>
        </select>
      </Field>
      <label className="flex items-center gap-1.5 pb-1.5 text-xs text-slate-300">
        <input type="checkbox" name="verified" value="1" defaultChecked={Boolean(sp.verified)} className="h-4 w-4 accent-[#6D5DF6]" />
        {t("home.verifiedOnly")}
      </label>
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
    minPrice: sp.min,
    maxPrice: sp.max,
    verified: Boolean(sp.verified),
    winRate: sp.winRate,
    level: sp.level,
  });
  const chips = activeChips(sp);
  const showClear = chips.length > 0 || sp.verified || (sp.sort && sp.sort !== "new");

  return (
    <div className="space-y-6">
      <PageHead t={t} />
      <FilterBar sp={sp} t={t} />

      {showClear && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={urlWithout(sp, c.key)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition hover:border-[#6D5DF6]/40 hover:text-slate-50"
            >
              {c.label} <X size={12} className="text-slate-500" />
            </Link>
          ))}
          <Link href="/browse" className="text-xs font-medium text-[#38BDF8] hover:underline">{t("home.clearAll")}</Link>
        </div>
      )}

      <p className="text-sm text-slate-400">{t("home.results", { n: listings?.length ?? 0 })}</p>

      {!listings?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <p className="text-slate-400">{t("home.empty")}</p>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            <Plus size={16} /> {t("home.emptyCta")}
          </Link>
        </div>
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

function PageHead({ t }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#6D5DF6]/15 to-white/[0.03] p-6">
      <h1 className="text-2xl font-bold text-slate-50">{t("home.heroTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">{t("home.heroSub")}</p>
    </section>
  );
}
