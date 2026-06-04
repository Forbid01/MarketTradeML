"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Check, BadgeCheck } from "@/components/icons";

// Referral холбоос + loyalty оноо. Холбоосыг хуулах товчтой.
export default function ReferralCard({ code, points = 0, siteUrl = "" }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const base = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const link = code ? `${base}/?ref=${code}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard блоклогдсон бол алгасна */
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <BadgeCheck size={16} className="text-[#6D5DF6]" />
          {t("account.referral.title")}
        </h2>
        <div className="rounded-lg border border-[#F5C451]/30 bg-[#F5C451]/10 px-3 py-1 text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{t("account.loyalty")}</div>
          <div className="text-sm font-bold text-[#F5C451]">{points}</div>
        </div>
      </div>

      <p className="text-xs text-slate-400">{t("account.referral.desc")}</p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 truncate rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 outline-none"
        />
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-3 py-2 text-xs font-medium text-white hover:brightness-110"
        >
          {copied ? <Check size={14} /> : null}
          {copied ? t("account.referral.copied") : t("account.referral.copy")}
        </button>
      </div>
    </div>
  );
}
