import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOrders, listBoostOrders } from "@/lib/queries";
import { ORDER_STATUS } from "@/lib/constants";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const BOOST_TONE = {
  created: "amber", paid: "blue", in_progress: "violet",
  completed: "green", cancelled: "zinc", refunded: "red",
};

export default async function OrdersPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/orders");
  const t = await getT();
  const locale = await getLocale();

  // Зөвхөн миний (buyer/seller) захиалгыг буцаана. Query throw → error.js.
  const [orders, boostOrders] = await Promise.all([
    listOrders(profile.id),
    listBoostOrders(profile.id),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-50">{t("order.title")}</h1>

      {!orders?.length ? (
        <p className="py-12 text-center text-slate-500">{t("order.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const tone = ORDER_STATUS[o.status]?.tone ?? "zinc";
            const label = t(`orderStatus.${o.status}`);
            const role = o.buyer_id === profile?.id ? t("order.buyer") : t("order.seller");
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#6D5DF6]/40 hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">
                      {o.listing_title ?? t("common.listing")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {role} · {formatMNT(o.amount)} · {formatDateTime(o.created_at)}
                    </p>
                  </div>
                  <StatusBadge label={label} tone={tone} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {boostOrders.length > 0 && (
        <section className="space-y-2 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#38BDF8]">{t("boost.title")}</h2>
          <ul className="space-y-2">
            {boostOrders.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boost/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#6D5DF6]/40 hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-50">{t(`boost.${b.service}.title`)}</p>
                    <p className="text-xs text-slate-400">
                      {b.matches} {t("boost.matches")} · {formatMNT(b.amount, locale)} · {formatDateTime(b.created_at, locale)}
                    </p>
                  </div>
                  <StatusBadge label={t(`boost.status.${b.status}`)} tone={BOOST_TONE[b.status] ?? "zinc"} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
