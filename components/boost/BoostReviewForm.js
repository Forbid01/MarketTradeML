"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitBoostReview } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { Star } from "@/components/icons";

// Дууссан boost захиалгыг (booster-ийг) үнэлэх.
export default function BoostReviewForm({ boostId }) {
  const router = useRouter();
  const t = useT();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await submitBoostReview(boostId, stars, comment);
    setBusy(false);
    if (r.error) setErr(r.error);
    else router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold text-slate-300">{t("review.formTitle")}</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setStars(n)}
            className={n <= stars ? "text-[#F5C451]" : "text-slate-600"} aria-label={`${n}`}>
            <Star size={24} filled={n <= stars} />
          </button>
        ))}
      </div>
      <textarea
        value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
        placeholder={t("review.commentPh")}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]"
      />
      {err && <p className="text-sm text-red-300">{err}</p>}
      <button disabled={busy}
        className="rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50">
        {t("review.submit")}
      </button>
    </form>
  );
}
