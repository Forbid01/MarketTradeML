import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import MarkAllRead from "@/components/MarkAllRead";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login?next=/notifications");
  const t = await getT();

  const notifs = await listNotifications(profile.id);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-50">{t("notif.title")}</h1>
        {notifs?.some((n) => !n.is_read) && <MarkAllRead />}
      </div>

      {!notifs?.length ? (
        <p className="py-12 text-center text-slate-500">{t("notif.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => {
            const inner = (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  n.is_read
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-[#38BDF8]/30 bg-[#38BDF8]/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-50">{n.title}</span>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />}
                </div>
                {n.body && <p className="mt-0.5 text-slate-400">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
              </div>
            );
            const href = n.order_id ? `/orders/${n.order_id}` : n.boost_order_id ? `/boost/${n.boost_order_id}` : null;
            return (
              <li key={n.id}>
                {href ? <Link href={href}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
