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
        <h1 className="text-xl font-bold text-slate-900">{t("notif.title")}</h1>
        {notifs?.some((n) => !n.is_read) && <MarkAllRead />}
      </div>

      {!notifs?.length ? (
        <p className="py-12 text-center text-slate-400">{t("notif.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => {
            const inner = (
              <div
                className={`rounded-xl border p-3 text-sm shadow-sm ${
                  n.is_read
                    ? "border-slate-200 bg-white"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{n.title}</span>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                </div>
                {n.body && <p className="mt-0.5 text-slate-500">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
              </div>
            );
            return (
              <li key={n.id}>
                {n.order_id ? <Link href={`/orders/${n.order_id}`}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
