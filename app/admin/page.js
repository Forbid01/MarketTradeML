import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOpenDisputes, listPendingPayouts } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import { Shield, BadgeCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// Build Plan 1.13 (Phase 1): хөнгөн админ worklist.
export default async function AdminPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/admin");
  const t = await getT();
  const locale = await getLocale();
  if (profile?.role !== "admin") {
    return <p className="py-12 text-center text-slate-400">{t("admin.onlyAdmin")}</p>;
  }

  const [disputes, payouts] = await Promise.all([
    listOpenDisputes(),
    listPendingPayouts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-50">{t("admin.title")}</h1>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-300">
          <Shield size={16} className="text-red-300" />
          {t("admin.openDisputes", { n: disputes?.length ?? 0 })}
        </h2>
        {!disputes?.length ? (
          <p className="text-sm text-slate-400">{t("admin.noDisputes")}</p>
        ) : (
          disputes.map((d) => (
            <Link
              key={d.id}
              href={`/orders/${d.order_id}`}
              className="block rounded-lg border border-red-500/30 bg-red-500/15 p-3 text-sm hover:border-red-500/50"
            >
              <p className="font-medium text-slate-50">{d.listing_title ?? "Захиалга"}</p>
              <p className="text-slate-400">{d.reason}</p>
              <p className="text-xs text-slate-400">{formatDateTime(d.created_at, locale)}</p>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
          <BadgeCheck size={16} className="text-emerald-300" />
          {t("admin.pendingPayouts", { n: payouts?.length ?? 0 })}
        </h2>
        <p className="text-xs text-slate-400">{t("admin.payoutHint")}</p>
        {!payouts?.length ? (
          <p className="text-sm text-slate-400">{t("admin.noPayouts")}</p>
        ) : (
          payouts.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm hover:border-violet/40"
            >
              <span className="text-slate-50">{o.listing_title ?? "Захиалга"}</span>
              <span className="text-emerald-300">{formatMNT(o.amount - o.fee, locale)}</span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
