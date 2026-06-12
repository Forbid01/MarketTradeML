"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT, useLocale } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { formatMNT } from "@/lib/format";
import { createBoostOrder } from "@/lib/actions";
import { BOOST, RANK_LADDER, rankMatches, boostTotal, bulkDiscount } from "@/lib/boost";
import { Star, ShieldCheck, RefreshCw, ArrowRight, BadgeCheck, Target, GraduationCap } from "@/components/icons";

function Toggle({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        on ? "border-violet/50 bg-violet/15 text-[#b3a9ff]" : "border-white/10 text-slate-400 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function Card({ icon, title, desc, perMatch, matches, total, service, config, unit, perLabel, children }) {
  const t = useT();
  const locale = useLocale();
  const countLabel = unit || t("boost.matches");
  const router = useRouter();
  const call = useAction();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [promo, setPromo] = useState("");

  async function order() {
    setBusy(true);
    setErr(null);
    const r = await call(createBoostOrder, service, { ...config, promo: promo.trim() || undefined });
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    router.push(`/boost/${r.id}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold uppercase tracking-wide text-slate-50">{icon}{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{desc}</p>
        </div>
        <div className="shrink-0 rounded-lg border border-azure/30 bg-azure/10 px-3 py-1.5 text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{perLabel || t("boost.perMatch")}</div>
          <div className="text-sm font-bold text-azure">{formatMNT(perMatch, locale)}</div>
        </div>
      </div>

      <div className="mt-5 space-y-4">{children}</div>

      <input
        value={promo}
        onChange={(e) => setPromo(e.target.value.toUpperCase())}
        placeholder={t("boost.promoPh")}
        className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wide text-slate-50 placeholder:text-slate-500 outline-none focus:border-violet"
      />

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            {t("boost.total")} · {matches} {countLabel}
            {bulkDiscount(matches) > 0 && (
              <span className="ml-1.5 rounded bg-emerald-500/15 px-1 py-0.5 font-bold text-emerald-300">
                {t("boost.bulk", { pct: Math.round(bulkDiscount(matches) * 100) })}
              </span>
            )}
          </div>
          <div className="text-gradient-gold text-2xl font-extrabold">
            {formatMNT(total, locale)}
          </div>
        </div>
        <button
          onClick={order}
          disabled={matches <= 0 || busy}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet to-azure px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {t("boost.order")} <ArrowRight size={16} />
        </button>
      </div>
      {err && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/15 p-2 text-center text-xs text-red-300">
          {err} {err.includes("Нэвтэр") && <Link href="/login?next=/boost" className="underline">/login</Link>}
        </p>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, onChange }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className="font-semibold text-slate-100">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet"
      />
    </div>
  );
}

export function WinrateBoostCalc() {
  const t = useT();
  const [wins, setWins] = useState(BOOST.winrate.def);
  const [express, setExpress] = useState(false);
  const [duo, setDuo] = useState(false);
  const total = useMemo(() => boostTotal(wins, BOOST.winrate.perMatch, { express, duo }), [wins, express, duo]);
  return (
    <Card
      icon={<RefreshCw size={20} className="text-azure" />}
      title={t("boost.winrate.title")} desc={t("boost.winrate.desc")}
      perMatch={BOOST.winrate.perMatch} matches={wins} total={total}
      service="winrate" config={{ wins, express, duo }}
    >
      <Slider label={t("boost.winrate.winsLabel")} value={wins} min={BOOST.winrate.min} max={BOOST.winrate.max} onChange={setWins} />
      <div className="flex flex-wrap gap-2">
        <Toggle on={express} onClick={() => setExpress((v) => !v)}>{t("boost.express")}</Toggle>
        <Toggle on={duo} onClick={() => setDuo((v) => !v)}>{t("boost.duo")}</Toggle>
      </div>
    </Card>
  );
}

export function RankBoostCalc() {
  const t = useT();
  const [from, setFrom] = useState(4); // Epic
  const [to, setTo] = useState(6); // Mythic
  const [express, setExpress] = useState(false);
  const [duo, setDuo] = useState(false);
  const matches = useMemo(() => rankMatches(from, to), [from, to]);
  const total = useMemo(() => boostTotal(matches, BOOST.rank.perMatch, { express, duo }), [matches, express, duo]);
  const sel = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 focus:border-violet focus:ring-1 focus:ring-violet";
  return (
    <Card
      icon={<Star size={20} filled className="text-gold" />}
      title={t("boost.rank.title")} desc={t("boost.rank.desc")}
      perMatch={BOOST.rank.perMatch} matches={matches} total={total}
      service="rank" config={{ fromIdx: from, toIdx: to, express, duo }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">{t("boost.rank.from")}</label>
          <select className={sel} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
            {RANK_LADDER.map((r, i) => <option key={r} value={i}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">{t("boost.rank.to")}</label>
          <select className={sel} value={to} onChange={(e) => setTo(Number(e.target.value))}>
            {RANK_LADDER.map((r, i) => <option key={r} value={i}>{r}</option>)}
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-400">{t("boost.rank.est", { n: matches })}</p>
      <div className="flex flex-wrap gap-2">
        <Toggle on={express} onClick={() => setExpress((v) => !v)}>{t("boost.express")}</Toggle>
        <Toggle on={duo} onClick={() => setDuo((v) => !v)}>{t("boost.duo")}</Toggle>
      </div>
    </Card>
  );
}

export function SquadRentCalc() {
  const t = useT();
  const [m, setM] = useState(BOOST.squad.def);
  const [express, setExpress] = useState(false);
  const total = useMemo(() => boostTotal(m, BOOST.squad.perMatch, { express }), [m, express]);
  return (
    <Card
      icon={<ShieldCheck size={20} className="text-violet" />}
      title={t("boost.squad.title")} desc={t("boost.squad.desc")}
      perMatch={BOOST.squad.perMatch} matches={m} total={total}
      service="squad" config={{ matches: m, express }}
    >
      <Slider label={t("boost.squad.matchesLabel")} value={m} min={BOOST.squad.min} max={BOOST.squad.max} onChange={setM} />
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <BadgeCheck size={14} className="text-azure" /> {t("boost.squad.note")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Toggle on={express} onClick={() => setExpress((v) => !v)}>{t("boost.express")}</Toggle>
      </div>
    </Card>
  );
}

export function PlacementCalc() {
  const t = useT();
  const [m, setM] = useState(BOOST.placement.def);
  const [express, setExpress] = useState(false);
  const total = useMemo(() => boostTotal(m, BOOST.placement.perMatch, { express }), [m, express]);
  return (
    <Card
      icon={<Target size={20} className="text-azure" />}
      title={t("boost.placement.title")} desc={t("boost.placement.desc")}
      perMatch={BOOST.placement.perMatch} matches={m} total={total}
      service="placement" config={{ matches: m, express }}
    >
      <Slider label={t("boost.placement.matchesLabel")} value={m} min={BOOST.placement.min} max={BOOST.placement.max} onChange={setM} />
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <BadgeCheck size={14} className="text-azure" /> {t("boost.placement.note")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Toggle on={express} onClick={() => setExpress((v) => !v)}>{t("boost.express")}</Toggle>
      </div>
    </Card>
  );
}

export function CoachingCalc() {
  const t = useT();
  const [s, setS] = useState(BOOST.coaching.def);
  const [express, setExpress] = useState(false);
  const total = useMemo(() => boostTotal(s, BOOST.coaching.perMatch, { express }), [s, express]);
  return (
    <Card
      icon={<GraduationCap size={20} className="text-gold" />}
      title={t("boost.coaching.title")} desc={t("boost.coaching.desc")}
      perMatch={BOOST.coaching.perMatch} matches={s} total={total}
      service="coaching" config={{ sessions: s, express }}
      unit={t("boost.coaching.unit")} perLabel={t("boost.coaching.perUnit")}
    >
      <Slider label={t("boost.coaching.sessionsLabel")} value={s} min={BOOST.coaching.min} max={BOOST.coaching.max} onChange={setS} />
      <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <BadgeCheck size={14} className="text-gold" /> {t("boost.coaching.note")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Toggle on={express} onClick={() => setExpress((v) => !v)}>{t("boost.express")}</Toggle>
      </div>
    </Card>
  );
}
