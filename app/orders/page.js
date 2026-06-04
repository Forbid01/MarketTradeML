import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { formatMNT, formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { user, profile, supabase } = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");
  const t = await getT();

  // RLS зөвхөн миний (buyer/seller) захиалгыг буцаана.
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, amount, fee, created_at, buyer_id, seller_id, listings(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t("order.title")}</h1>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">{t("common.error")}</p>
      ) : !orders?.length ? (
        <p className="py-12 text-center text-slate-400">{t("order.empty")}</p>
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
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {o.listings?.title ?? t("common.listing")}
                    </p>
                    <p className="text-xs text-slate-500">
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
    </div>
  );
}
