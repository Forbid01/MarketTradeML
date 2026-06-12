import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/lib/validation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getBoostOrder, getBoostReview, getBoostChat } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";
import BoostPay from "@/components/boost/BoostPay";
import BoostAdmin from "@/components/boost/BoostAdmin";
import BoostReviewForm from "@/components/boost/BoostReviewForm";
import OrderChat from "@/components/OrderChat";
import { Star } from "@/components/icons";

export const dynamic = "force-dynamic";

const TONE = {
  created: "amber", paid: "blue", in_progress: "violet",
  completed: "green", cancelled: "zinc", refunded: "red",
};

export default async function BoostOrderPage({ params }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/boost");

  const isAdmin = profile.role === "admin";
  const o = await getBoostOrder(id, profile.id, isAdmin);
  if (!o) notFound();

  const t = await getT();
  const locale = await getLocale();
  const review = o.status === "completed" ? await getBoostReview(o.id) : null;
  const isParty = isAdmin || o.buyer_id === profile.id || o.booster_id === profile.id;
  const chatOn = isParty && ["paid", "in_progress", "completed"].includes(o.status);
  const messages = chatOn ? await getBoostChat(o.id, profile.id, isAdmin) : [];

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/boost" className="text-sm text-slate-400 hover:text-slate-50">{t("boost.backToServices")}</Link>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-azure">{t("boost.orderTitle")}</p>
            <h1 className="mt-1 text-lg font-bold uppercase tracking-wide text-slate-50">{t(`boost.${o.service}.title`)}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {o.matches} {o.service === "coaching" ? t("boost.coaching.unit") : t("boost.matches")} · {formatDateTime(o.created_at, locale)}
            </p>
          </div>
          <StatusBadge label={t(`boost.status.${o.status}`)} tone={TONE[o.status] ?? "zinc"} />
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{t("boost.total")}</div>
          <div className="text-gradient-gold text-2xl font-extrabold">
            {formatMNT(o.amount, locale)}
          </div>
        </div>

        <div className="mt-4">
          {o.status === "created" && o.buyer_id === profile.id ? (
            <BoostPay boostId={o.id} />
          ) : o.status !== "created" ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-3 text-center text-sm text-emerald-300">
              {t(`boost.status.${o.status}`)}
            </p>
          ) : null}
        </div>
      </div>

      {o.booster_id && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{t("boost.booster")}</p>
              <p className="font-medium text-slate-50">{o.booster_name ?? "—"}</p>
            </div>
            {o.booster_rating != null && (
              <span className="inline-flex items-center gap-1 text-sm text-gold">
                <Star size={14} filled className="text-gold" /> {Number(o.booster_rating).toFixed(1)}
                <span className="text-xs text-slate-400">({o.booster_reviews ?? 0})</span>
              </span>
            )}
          </div>
        </div>
      )}

      {(o.status === "in_progress" || o.status === "completed") && o.matches > 0 && (() => {
        const done = o.status === "completed" ? o.matches : (o.progress ?? 0);
        const pct = Math.min(100, Math.round((done / o.matches) * 100));
        return (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>{t("boost.progress")}</span>
              <span className="font-semibold text-slate-100">{t("boost.matchesDone", { done, total: o.matches })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet to-azure transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      {((isAdmin && ["paid", "in_progress", "completed"].includes(o.status)) ||
        (o.booster_id === profile.id && ["paid", "in_progress"].includes(o.status))) && (
        <BoostAdmin
          boostId={o.id}
          status={o.status}
          matches={o.matches}
          progress={o.progress ?? 0}
          payoutStatus={o.payout_status ?? "pending"}
          isAdmin={isAdmin}
          isBooster={o.booster_id === profile.id}
        />
      )}

      {o.status === "completed" && o.buyer_id === profile.id && (
        review ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <h3 className="mb-1 font-semibold text-slate-300">{t("review.yours")}</h3>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} filled={i < review.stars} className={i < review.stars ? "text-gold" : "text-slate-600"} />
              ))}
            </div>
            {review.comment && <p className="mt-1 text-slate-400">{review.comment}</p>}
          </div>
        ) : (
          <BoostReviewForm boostId={o.id} />
        )
      )}

      {chatOn && <OrderChat kind="boost" orderId={o.id} myUserId={profile.id} initialMessages={messages ?? []} />}
    </div>
  );
}
