"use client";

import { useT, useLocale } from "@/lib/i18n/client";
import { useReducedMotion, useCountUp } from "@/lib/hooks";
import { formatMNT } from "@/lib/format";

// "100%" / "48ц" / "$0" зэрэг чанарын утгыг {prefix, value, suffix} болгон задална.
function parseStat(s) {
  const m = String(s).match(/^(\D*)(\d[\d,.]*)(.*)$/);
  if (!m) return { prefix: "", value: 0, suffix: String(s ?? "") };
  return { prefix: m[1], value: parseFloat(m[2].replace(/,/g, "")) || 0, suffix: m[3] };
}

// Тоог viewport-д орохд count-up хийнэ. reduced-motion үед шууд эцсийн утга.
function Counter({ value, label, format, prefix = "", suffix = "", locale, reduce }) {
  const [ref, animated] = useCountUp(value, { reduce });
  const shown = Math.round(animated);
  const display =
    format === "mnt" ? formatMNT(shown, locale)
    : format === "int" ? new Intl.NumberFormat(locale === "en" ? "en-US" : "mn-MN").format(shown)
    : `${prefix}${shown}${suffix}`;

  return (
    <div ref={ref} className="text-center">
      <div className="text-gradient-gold text-2xl font-extrabold tracking-tight sm:text-4xl">{display}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</div>
    </div>
  );
}

// Нэг хүчтэй "тоо баримт" зурвас: бодит тоо (>0) бол түүнийг, эс бөгөөс чанарын баталгааг
// (100% escrow, 48ц шалгалт, 0₮ шимтгэл) харуулна — шинэ маркетплейс ч хоосон/тэг харагдахгүй.
export default function LiveCounters({ stats }) {
  const t = useT();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const s = stats ?? { listings: 0, trades: 0, protected: 0 };

  const q1 = parseStat(t("landing.stat1Num"));
  const q2 = parseStat(t("landing.stat2Num"));
  const q3 = parseStat(t("landing.stat3Num"));
  const cells = [
    s.listings > 0
      ? { value: s.listings, label: t("landing.live.listings"), format: "int" }
      : { value: q1.value, prefix: q1.prefix, suffix: q1.suffix, label: t("landing.stat1Label"), format: "raw" },
    s.trades > 0
      ? { value: s.trades, label: t("landing.live.trades"), format: "int" }
      : { value: q2.value, prefix: q2.prefix, suffix: q2.suffix, label: t("landing.stat2Label"), format: "raw" },
    s.protected > 0
      ? { value: s.protected, label: t("landing.live.protected"), format: "mnt" }
      : { value: q3.value, prefix: q3.prefix, suffix: q3.suffix, label: t("landing.stat3Label"), format: "raw" },
  ];

  return (
    <div>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-azure">{t("landing.live.eyebrow")}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:gap-4 sm:p-8">
        {cells.map((c, i) => (
          <Counter key={i} value={c.value} label={c.label} format={c.format} prefix={c.prefix} suffix={c.suffix} locale={locale} reduce={reduce} />
        ))}
      </div>
    </div>
  );
}
