import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listOrders, listBoostOrders } from "@/lib/queries";
import { ORDER_STATUS } from "@/lib/constants";
import { formatMNT, formatDateTime, timeLeft } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import StatusBadge from "@/components/StatusBadge";
import { Clock } from "@/components/icons";

export const dynamic = "force-dynamic";

const BOOST_TONE = {
  created: "amber", paid: "blue", in_progress: "violet",
  completed: "green", cancelled: "zinc", refunded: "red",
};

const GROUPS = {
  active: ["created", "paid", "transferring", "inspecting"],
  disputed: ["disputed"],
  done: ["completed", "cancelled", "expired", "refunded"],
};
const TABS = ["all", "active", "disputed", "done"];

// Дараагийн үйлдэл: [i18n түлхүүр, энэ хэрэглэгч өөрөө хийх ёстой эсэх].
function nextAction(status, isBuyer) {
  switch (status) {
    case "created": return isBuyer ? ["pay", true] : ["waitPay", false];
    case "paid": return isBuyer ? ["waitTransfer", false] : ["transfer", true];
    case "transferring": return isBuyer ? ["inspect", true] : ["waitInspect", false];
    case "inspecting": return isBuyer ? ["confirm", true] : ["waitConfirm", false];
    case "disputed": return ["dispute", false];
    default: return [null, false];
  }
}

export default async function OrdersPage({ searchParams }) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/orders");
  const t = await getT();
  const locale = await getLocale();
  const sp = (await searchParams) ?? {};
  const tab = TABS.includes(sp.tab) ? sp.tab : "all";

  const [orders, boostOrders] = await Promise.all([
    listOrders(profile.id),
    listBoostOrders(profile.id),
  ]);

  // Дашбоард тоо (бүх захиалгаас)
  let spent = 0, earned = 0, escrow = 0;
  for (const o of orders) {
    const isBuyer = o.buyer_id === profile.id;
    if (o.status === "completed") {
      if (isBuyer) spent += o.amount;
      else earned += o.amount - o.fee;
    }
    if (["paid", "transferring", "inspecting", "disputed"].includes(o.status)) escrow += o.amount;
  }

  const filtered = tab === "all" ? orders : orders.filter((o) => GROUPS[tab].includes(o.status));

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-50">{t("order.title")}</h1>

      {/* Захиалга огт байхгүй үед 0₮ статистик утгагүй — нуух */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t("order.stat.spent")} value={formatMNT(spent, locale)} />
          <Stat label={t("order.stat.earned")} value={formatMNT(earned, locale)} />
          <Stat label={t("order.stat.escrow")} value={formatMNT(escrow, locale)} accent />
        </div>
      )}

      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((tb) => {
          const on = tb === tab;
          return (
            <Link
              key={tb}
              href={tb === "all" ? "/orders" : `/orders?tab=${tb}`}
              className={`flex-1 rounded-md px-3 py-1.5 text-center text-xs font-medium transition ${
                on ? "bg-gradient-to-r from-violet to-azure text-white" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              {t(`order.tab.${tb}`)}
            </Link>
          );
        })}
      </div>

      {!filtered.length ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-slate-400">{t(`order.emptyTab.${tab}`)}</p>
          {(tab === "all" || tab === "active") && (
            <Link
              href="/browse"
              className="rounded-lg bg-gradient-to-r from-violet to-azure px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
            >
              {t("order.emptyCta")}
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => {
            const tone = ORDER_STATUS[o.status]?.tone ?? "zinc";
            const isBuyer = o.buyer_id === profile.id;
            const role = isBuyer ? t("order.buyer") : t("order.seller");
            const [actKey, actionable] = nextAction(o.status, isBuyer);
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-violet/40 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">{role}</span>
                        <p className="truncate text-sm font-medium text-slate-50">{o.listing_title ?? t("common.listing")}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatMNT(o.amount, locale)} · {formatDateTime(o.created_at, locale)}
                      </p>
                      {actKey && (
                        <p className={`mt-1 text-xs font-medium ${actionable ? "text-azure" : "text-slate-400"}`}>
                          {actionable ? "→ " : ""}{t(`order.act.${actKey}`)}
                        </p>
                      )}
                      {o.status === "inspecting" && o.inspection_ends && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-gold">
                          <Clock size={12} /> {timeLeft(o.inspection_ends, locale)}
                        </p>
                      )}
                    </div>
                    <StatusBadge label={t(`orderStatus.${o.status}`)} tone={tone} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {tab === "all" && boostOrders.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-azure">{t("boost.title")}</h2>
          <ul className="space-y-2">
            {boostOrders.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/boost/${b.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-violet/40 hover:bg-white/[0.06]"
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

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className={`truncate text-sm font-extrabold sm:text-base ${accent ? "text-gradient-gold" : "text-slate-50"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}
