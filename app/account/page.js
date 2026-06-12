import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { BadgeCheck, Star } from "@/components/icons";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login");
  const t = await getT();

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-xl font-bold text-slate-50">{t("account.title")}</h1>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
        <Row label={t("account.name")} value={profile?.display_name} />
        <Row label={t("account.email")} value={user.email ?? "—"} />
        <Row
          label={t("account.verified")}
          value={
            profile?.is_verified ? (
              <span className="inline-flex items-center gap-1">
                <BadgeCheck size={16} className="text-azure" />
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
              <Star size={14} filled className="text-gold" />
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
          className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-center text-sm text-slate-300 hover:bg-white/[0.03] hover:text-slate-50"
        >
          {t("account.myOrders")}
        </Link>
        <div className="flex-1">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-50">{value}</span>
    </div>
  );
}
