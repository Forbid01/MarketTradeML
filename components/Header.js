import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileMenu from "@/components/MobileMenu";
import { Logo, Bell, Heart, BadgeCheck, Plus } from "@/components/icons";

export default async function Header() {
  const t = await getT();
  const { profile } = await getCurrentUser();
  // profile-ээр guard (JWT session нь DB мөрөөс удаан амьдарч болзошгүй → profile null үед crash-аас сэргийлнэ)
  const authed = Boolean(profile);
  const unread = profile ? await getUnreadCount(profile.id) : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <Logo className="text-blue-600" /> MLBB Market
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Desktop навигаци */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <Link href="/browse" className="px-3 py-1.5 text-slate-600 hover:text-slate-900">
              {t("nav.browse")}
            </Link>
            {authed ? (
              <>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                >
                  <Plus size={16} /> {t("nav.addListing")}
                </Link>
                <Link href="/orders" className="px-3 py-1.5 text-slate-600 hover:text-slate-900">
                  {t("nav.orders")}
                </Link>
                <Link
                  href="/favorites"
                  className="px-2 py-1.5 text-slate-600 hover:text-slate-900"
                  aria-label={t("nav.favorites")}
                >
                  <Heart />
                </Link>
                <Link
                  href="/notifications"
                  className="relative px-2 py-1.5 text-slate-600 hover:text-slate-900"
                  aria-label={t("nav.notifications")}
                >
                  <Bell />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                {profile?.role === "admin" && (
                  <Link href="/admin" className="px-3 py-1.5 text-amber-600 hover:text-amber-700">
                    {t("nav.admin")}
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  {profile?.display_name ?? t("nav.profile")}
                  {profile?.is_verified && <BadgeCheck size={16} className="text-blue-600" />}
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                {t("nav.login")}
              </Link>
            )}
          </nav>

          {/* Гар утасны навигаци */}
          <MobileMenu
            authed={authed}
            displayName={profile?.display_name}
            role={profile?.role}
            isVerified={profile?.is_verified}
            unread={unread}
          />
        </div>
      </div>
    </header>
  );
}
