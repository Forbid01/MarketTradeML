import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { getT } from "@/lib/i18n/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MobileMenu from "@/components/MobileMenu";
import NavLink from "@/components/NavLink";
import { Logo, Bell, Heart, BadgeCheck, Plus } from "@/components/icons";

// Suspense fallback — auth/DB хүлээлгүй шууд зурагдах статик header (layout стрийм хийнэ).
export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06070E]/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <span className="flex items-center gap-2 font-bold uppercase tracking-wide text-slate-50">
          <Logo className="text-azure" /> MLBB Market
        </span>
        <div className="flex items-center gap-2">
          <span className="h-7 w-24 animate-pulse rounded-full bg-white/5" />
          <span className="hidden h-7 w-48 animate-pulse rounded-full bg-white/5 md:block" />
        </div>
      </div>
    </header>
  );
}

export default async function Header() {
  const t = await getT();
  // DB/auth унасан ч header (сайт бүхэлдээ) ажиллах ёстой — алдааг нэвтрээгүй мэт үзнэ.
  let profile = null;
  let unread = 0;
  try {
    ({ profile } = await getCurrentUser());
    if (profile) unread = await getUnreadCount(profile.id);
  } catch (e) {
    console.error("header data:", e?.message ?? e);
  }
  // profile-ээр guard (JWT session нь DB мөрөөс удаан амьдарч болзошгүй → profile null үед crash-аас сэргийлнэ)
  const authed = Boolean(profile);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06070E]/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase tracking-wide text-slate-50">
          <Logo className="text-azure" /> MLBB Market
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {/* Desktop навигаци */}
          <nav className="hidden items-center gap-2 text-sm md:flex">
            <NavLink href="/browse" className="px-3 py-1.5 text-slate-300 hover:text-white">
              {t("nav.browse")}
            </NavLink>
            <NavLink href="/boost" className="px-3 py-1.5 text-slate-300 hover:text-white">
              {t("nav.boost")}
            </NavLink>
            {authed ? (
              <>
                <Link
                  href="/listings/new"
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet to-azure px-3 py-1.5 font-semibold text-white hover:brightness-110"
                >
                  <Plus size={16} /> {t("nav.addListing")}
                </Link>
                <NavLink href="/orders" className="px-3 py-1.5 text-slate-300 hover:text-white">
                  {t("nav.orders")}
                </NavLink>
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
                  aria-label={unread > 0 ? `${t("nav.notifications")} (${unread})` : t("nav.notifications")}
                >
                  <Bell />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-violet to-azure px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                {profile?.role === "admin" && (
                  <Link href="/admin" className="px-3 py-1.5 text-gold hover:text-[#fcd47a]">
                    {t("nav.admin")}
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-300 hover:text-white"
                >
                  {profile?.display_name ?? t("nav.profile")}
                  {profile?.is_verified && <BadgeCheck size={16} className="text-azure" />}
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
