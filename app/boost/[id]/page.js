import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getBoostOrder } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";
import BoostPay from "@/components/boost/BoostPay";

export const dynamic = "force-dynamic";

const TONE = {
  created: "amber", paid: "blue", in_progress: "violet",
  completed: "green", cancelled: "zinc", refunded: "red",
};

export default async function BoostOrderPage({ params }) {
  const { id } = await params;
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/boost");

  const isAdmin = profile.role === "admin";
  const o = await getBoostOrder(id, profile.id, isAdmin);
  if (!o) notFound();

  const t = await getT();
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/boost" className="text-sm text-slate-400 hover:text-slate-50">{t("boost.backToServices")}</Link>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#38BDF8]">{t("boost.orderTitle")}</p>
            <h1 className="mt-1 text-lg font-bold uppercase tracking-wide text-slate-50">{t(`boost.${o.service}.title`)}</h1>
            <p className="mt-1 text-xs text-slate-500">
              {o.matches} {t("boost.matches")} · {formatDateTime(o.created_at, locale)}
            </p>
          </div>
          <StatusBadge label={t(`boost.status.${o.status}`)} tone={TONE[o.status] ?? "zinc"} />
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">{t("boost.total")}</div>
          <div className="bg-gradient-to-r from-[#F5C451] to-[#38BDF8] bg-clip-text text-2xl font-extrabold text-transparent">
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
    </div>
  );
}
