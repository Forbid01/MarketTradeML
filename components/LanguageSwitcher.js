"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/client";

export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();

  function setLocale(l) {
    document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      onClick={() => setLocale(locale === "mn" ? "en" : "mn")}
      className="rounded-lg border border-white/10 px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-white/[0.03] hover:text-azure"
      aria-label="Хэл солих / Switch language"
    >
      {locale === "mn" ? "EN" : "МН"}
    </button>
  );
}
