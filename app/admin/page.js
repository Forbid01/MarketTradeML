import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOpenDisputes, listPendingPayouts } from "@/lib/queries";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { Shield, BadgeCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// Build Plan 1.13 (Phase 1): хөнгөн админ worklist.
export default async function AdminPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/admin");
  const t = await getT();
  if (profile?.role !== "admin") {
    return <p className="py-12 text-center text-slate-500">{t("admin.onlyAdmin")}</p>;
  }

  const [disputes, payouts] = await Promise.all([
    listOpenDisputes(),
    listPendingPayouts(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">{t("admin.title")}</h1>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
          <Shield size={16} className="text-red-700" />
          {t("admin.openDisputes", { n: disputes?.length ?? 0 })}
        </h2>
        {!disputes?.length ? (
          <p className="text-sm text-slate-500">{t("admin.noDisputes")}</p>
        ) : (
          disputes.map((d) => (
            <Link
              key={d.id}
              href={`/orders/${d.order_id}`}
              className="block rounded-lg border border-red-200 bg-red-50 p-3 text-sm hover:border-red-300 hover:shadow-sm"
            >
              <p className="font-medium text-slate-900">{d.listing_title ?? "Захиалга"}</p>
              <p className="text-slate-500">{d.reason}</p>
              <p className="text-xs text-slate-400">{formatDateTime(d.created_at)}</p>
            </Link>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
          <BadgeCheck size={16} className="text-emerald-700" />
          {t("admin.pendingPayouts", { n: payouts?.length ?? 0 })}
        </h2>
        <p className="text-xs text-slate-500">{t("admin.payoutHint")}</p>
        {!payouts?.length ? (
          <p className="text-sm text-slate-500">{t("admin.noPayouts")}</p>
        ) : (
          payouts.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-blue-400 hover:shadow-md"
            >
              <span className="text-slate-900">{o.listing_title ?? "Захиалга"}</span>
              <span className="text-emerald-700">{formatMNT(o.amount - o.fee)}</span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
