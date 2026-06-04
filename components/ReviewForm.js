"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitReview } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { Star } from "@/components/icons";

// Build Plan 1.14: review — зөвхөн 'completed' захиалгад худалдан авагч өгнө.
// rating_avg/trades_count-г DB trigger тооцоолно.
export default function ReviewForm({ orderId }) {
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
    const res = await submitReview(orderId, stars, comment.trim() || null);
    setBusy(false);
    if (res?.error) setErr(res.error);
    else router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-600">{t("review.formTitle")}</h3>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setStars(n)}
            className={n <= stars ? "text-amber-500" : "text-slate-300"}
            aria-label={`${n} од`}
          >
            <Star size={24} filled={n <= stars} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder={t("review.commentPh")}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      {err && <p className="text-sm text-red-700">{err}</p>}
      <button
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {t("review.submit")}
      </button>
    </form>
  );
}
