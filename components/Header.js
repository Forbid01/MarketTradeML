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
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06070E]/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase tracking-wide text-slate-50">
          <Logo className="text-[#38BDF8]" /> MLBB Market
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Desktop навигаци */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <Link href="/browse" className="px-3 py-1.5 text-slate-300 hover:text-white">
              {t("nav.browse")}
            </Link>
            {authed ? (
              <>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-3 py-1.5 font-semibold text-white hover:brightness-110"
                >
                  <Plus size={16} /> {t("nav.addListing")}
                </Link>
                <Link href="/orders" className="px-3 py-1.5 text-slate-300 hover:text-white">
                  {t("nav.orders")}
                </Link>
                <Link
                  href="/favorites"
                  className="px-2 py-1.5 text-slate-300 hover:text-white"
                  aria-label={t("nav.favorites")}
                >
                  <Heart />
                </Link>
                <Link
                  href="/notifications"
                  className="relative px-2 py-1.5 text-slate-300 hover:text-white"
                  aria-label={t("nav.notifications")}
                >
                  <Bell />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                {profile?.role === "admin" && (
                  <Link href="/admin" className="px-3 py-1.5 text-[#F5C451] hover:text-[#fcd47a]">
                    {t("nav.admin")}
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  {profile?.display_name ?? t("nav.profile")}
                  {profile?.is_verified && <BadgeCheck size={16} className="text-[#38BDF8]" />}
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/10"
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
