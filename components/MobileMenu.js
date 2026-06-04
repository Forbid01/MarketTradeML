"use client";

// Гар утасны навигаци (md-ээс доош). Hamburger → доош унждаг цэс. Серверээс auth төлвийг
// props-оор авна (Header нь server component хэвээр). Tap target ≥44px.
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { Menu, X, Plus, Heart, Bell, BadgeCheck } from "@/components/icons";

export default function MobileMenu({ authed, displayName, role, isVerified, unread = 0 }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const link = "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("nav.menu")}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-200 hover:bg-white/5"
      >
        {open ? <Menu size={22} className="opacity-0" /> : <Menu size={22} />}
        {open && <X size={22} className="absolute" />}
        {!open && unread > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={close} aria-hidden />
          <nav className="absolute left-0 right-0 top-14 z-40 mx-2 rounded-xl border border-white/10 bg-[#0B0E1A] p-2 shadow-lg">
            <Link href="/browse" className={link} onClick={close}>{t("nav.browse")}</Link>
            {authed ? (
              <>
                <Link href="/listings/new" className={link} onClick={close}>
                  <Plus size={16} /> {t("nav.addListing")}
                </Link>
                <Link href="/orders" className={link} onClick={close}>{t("nav.orders")}</Link>
                <Link href="/favorites" className={link} onClick={close}>
                  <Heart size={16} /> {t("nav.favorites")}
                </Link>
                <Link href="/notifications" className={link} onClick={close}>
                  <Bell size={16} /> {t("nav.notifications")}
                  {unread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                {role === "admin" && (
                  <Link href="/admin" className={`${link} text-[#F5C451]`} onClick={close}>{t("nav.admin")}</Link>
                )}
                <Link href="/account" className={link} onClick={close}>
                  {displayName ?? t("nav.profile")}
                  {isVerified && <BadgeCheck size={16} className="text-[#38BDF8]" />}
                </Link>
              </>
            ) : (
              <Link href="/login" className={link} onClick={close}>{t("nav.login")}</Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
