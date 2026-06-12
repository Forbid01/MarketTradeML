import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { getT, getLocale } from "@/lib/i18n/server";
import MarkAllRead from "@/components/MarkAllRead";
import { Bell, Mail, Star, Heart, Shield, ClipboardCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// Мэдэгдлийн төрөл бүрд icon + өнгө (type нь schema-гийн notify функцүүдээс)
const TYPE_ICON = {
  order_status: { Icon: ClipboardCheck, cls: "text-azure" },
  message: { Icon: Mail, cls: "text-[#b3a9ff]" },
  listing_sold: { Icon: Star, cls: "text-gold" },
  price_drop: { Icon: Heart, cls: "text-rose-300" },
  boost_overpaid: { Icon: Shield, cls: "text-red-300" },
};

// УБ-ын цагаар өнөөдөр/энэ 7 хоног/өмнөх гэж бүлэглэнэ (хүсэлт бүрд нэг удаа,
// render-ээс гадуурх туслах — server component тул цагийн утга нэг хүсэлтэд тогтмол)
function groupNotifs(notifs) {
  const nowUB = Date.now();
  const dayUB = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
  const groups = { today: [], week: [], earlier: [] };
  for (const n of notifs ?? []) {
    const d = new Date(n.created_at);
    const itemDay = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
    const key = itemDay === dayUB ? "today" : nowUB - d.getTime() < 7 * 24 * 3600_000 ? "week" : "earlier";
    groups[key].push(n);
  }
  return [
    ["today", groups.today],
    ["week", groups.week],
    ["earlier", groups.earlier],
  ].filter(([, list]) => list.length > 0);
}

export default async function NotificationsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/notifications");
  const t = await getT();
  const locale = await getLocale();

  const notifs = await listNotifications(profile.id);
  const sections = groupNotifs(notifs);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-50">{t("notif.title")}</h1>
        {notifs?.some((n) => !n.is_read) && <MarkAllRead />}
      </div>

      {!notifs?.length ? (
        <p className="py-12 text-center text-slate-400">{t("notif.empty")}</p>
      ) : (
        sections.map(([key, list]) => (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t(`notif.group.${key}`)}
            </h2>
            <ul className="space-y-2">
              {list.map((n) => {
                const { Icon, cls } = TYPE_ICON[n.type] ?? { Icon: Bell, cls: "text-slate-400" };
                const inner = (
                  <div
                    className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                      n.is_read ? "border-white/10 bg-white/[0.03]" : "border-azure/30 bg-azure/10"
                    }`}
                  >
                    <span className={`mt-0.5 shrink-0 ${cls}`}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-50">{n.title}</span>
                        {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-azure" />}
                      </div>
                      {n.body && <p className="mt-0.5 text-slate-400">{n.body}</p>}
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at, locale)}</p>
                    </div>
                  </div>
                );
                const href = n.order_id ? `/orders/${n.order_id}` : n.boost_order_id ? `/boost/${n.boost_order_id}` : null;
                return <li key={n.id}>{href ? <Link href={href}>{inner}</Link> : inner}</li>;
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
