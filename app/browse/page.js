import Link from "next/link";
import { isDbConfigured } from "@/lib/db";
import { listActiveListings, BROWSE_PAGE_SIZE } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import { RANKS, SERVERS } from "@/lib/constants";
import ListingCard from "@/components/ListingCard";
import SetupNotice from "@/components/SetupNotice";
import { Search, X, Plus, ArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return {
    title: t("nav.browse"),
    description: t("home.heroSub"),
    alternates: { canonical: "/browse" },
  };
}

const INPUT =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 outline-none focus:border-violet focus:ring-1 focus:ring-violet";

function Field({ label, children }) {
  // label-ээр ороосноор input програмчлан холбогдоно (htmlFor/id шаардлагагүй)
  return (
    <label className="flex flex-col">
      <span className="mb-1 text-xs text-slate-400">{label}</span>
      {children}
    </label>
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

// Тухайн нэг filter-ийг хассан /browse URL үүсгэнэ (filter өөрчлөгдөхөд 1-р хуудаснаас).
function urlWithout(sp, omit) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === omit || k === "page" || v == null || v === "") continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `/browse?${s}` : "/browse";
}

// Одоогийн шүүлтийг хадгалаад заасан хуудас руу очих URL.
function pageUrl(sp, page) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v == null || v === "") continue;
    p.set(k, String(v));
  }
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/browse?${s}` : "/browse";
}

function FilterBar({ sp, t, activeCount = 0 }) {
  return (
    // sticky: урт үр дүнгээс шүүлтээ засахын тулд дээш гүйлгэх шаардлагагүй
    <form method="get" className="sticky top-14 z-10 flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-[#0B0E1A]/90 p-3 backdrop-blur">
      <label className="flex min-w-[160px] flex-1 flex-col">
        <span className="mb-1 text-xs text-slate-400">{t("home.search")}</span>
        <input name="q" defaultValue={sp.q ?? ""} placeholder={t("home.searchPh")} className={INPUT} />
      </label>
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
          <input name="min" aria-label={t("home.min")} defaultValue={sp.min ?? ""} inputMode="numeric" placeholder={t("home.min")} className={`${INPUT} w-20`} />
          <span className="text-slate-400">–</span>
          <input name="max" aria-label={t("home.max")} defaultValue={sp.max ?? ""} inputMode="numeric" placeholder={t("home.max")} className={`${INPUT} w-20`} />
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
        <input type="checkbox" name="verified" value="1" defaultChecked={Boolean(sp.verified)} className="h-4 w-4 accent-violet" />
        {t("home.verifiedOnly")}
      </label>
      <button type="submit" className="relative inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-1.5 text-sm font-medium text-white hover:brightness-110">
        <Search size={16} />
        {t("home.filter")}
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-[#06070E]">
            {activeCount}
          </span>
        )}
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

  const { items: listings, total, page } = await listActiveListings({
    q: sp.q,
    rank: sp.rank,
    server: sp.server,
    sort: sp.sort,
    minPrice: sp.min,
    maxPrice: sp.max,
    verified: Boolean(sp.verified),
    winRate: sp.winRate,
    level: sp.level,
    page: sp.page,
  });
  const totalPages = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  const chips = activeChips(sp);
  const showClear = chips.length > 0 || sp.verified || (sp.sort && sp.sort !== "new");

  return (
    <div className="space-y-6">
      <PageHead t={t} />
      <FilterBar sp={sp} t={t} activeCount={chips.length + (sp.verified ? 1 : 0) + (sp.sort && sp.sort !== "new" ? 1 : 0)} />

      {showClear && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Link
              key={c.key}
              href={urlWithout(sp, c.key)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300 transition hover:border-violet/40 hover:text-slate-50"
            >
              {c.label} <X size={12} className="text-slate-400" />
            </Link>
          ))}
          <Link href="/browse" className="text-xs font-medium text-azure hover:underline">{t("home.clearAll")}</Link>
        </div>
      )}

      <p className="text-sm text-slate-400">{t("home.results", { n: total })}</p>

      {!listings?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-16 text-center">
          <p className="text-slate-400">{t("home.empty")}</p>
          <Link
            href="/listings/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
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

      {totalPages > 1 && (
        <nav aria-label={t("home.pagination")} className="flex items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link
              href={pageUrl(sp, page - 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.03]"
            >
              <ArrowRight size={14} className="rotate-180" /> {t("home.prev")}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 px-4 py-2 text-sm text-slate-600">
              <ArrowRight size={14} className="rotate-180" /> {t("home.prev")}
            </span>
          )}
          <span className="text-sm text-slate-400">{t("home.page", { x: page, y: totalPages })}</span>
          {page < totalPages ? (
            <Link
              href={pageUrl(sp, page + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/[0.03]"
            >
              {t("home.next")} <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 px-4 py-2 text-sm text-slate-600">
              {t("home.next")} <ArrowRight size={14} />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

function PageHead({ t }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet/15 to-white/[0.03] p-6">
      <h1 className="text-2xl font-bold text-slate-50">{t("home.heroTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">{t("home.heroSub")}</p>
    </section>
  );
}
