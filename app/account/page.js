import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { BadgeCheck, Star } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-xl font-bold text-slate-900">{t("account.title")}</h1>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <Row label={t("account.name")} value={profile?.display_name} />
        <Row label={t("account.phone")} value={profile?.phone ?? user.phone ?? "—"} />
        <Row label={t("account.email")} value={user.email ?? "—"} />
        <Row
          label={t("account.verified")}
          value={
            profile?.is_verified ? (
              <span className="inline-flex items-center gap-1">
                <BadgeCheck size={16} className="text-blue-600" />
                {t("account.yes")}
              </span>
            ) : (
              t("account.no")
            )
          }
        />
        <Row
          label={t("account.rating")}
          value={
            <span className="inline-flex items-center gap-1">
              <Star size={14} filled className="text-amber-500" />
              {Number(profile?.rating_avg ?? 0).toFixed(1)}
            </span>
          }
        />
        <Row label={t("account.trades")} value={profile?.trades_count ?? 0} />
        {profile?.role === "admin" && <Row label={t("account.role")} value={t("account.admin")} />}
      </div>

      <div className="flex gap-2">
        <Link
          href="/orders"
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-center text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          {t("account.myOrders")}
        </Link>
        <form action="/auth/signout" method="post" className="flex-1">
          <button className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100">
            {t("account.signout")}
          </button>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
