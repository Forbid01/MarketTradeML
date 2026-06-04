"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleFavorite } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { Heart } from "@/components/icons";

// Зар хадгалах (favorites). RLS зөвхөн өөрийн мөрийг зөвшөөрнө.
export default function FavoriteButton({ listingId, initialFavorited }) {
  const router = useRouter();
  const t = useT();
  const [fav, setFav] = useState(Boolean(initialFavorited));
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const r = await toggleFavorite(listingId);
    if (!r.error) {
      setFav(r.favorited);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
        fav
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Heart size={16} filled={fav} className={fav ? "text-rose-500" : "text-slate-500"} />
      {fav ? t("favorite.saved") : t("favorite.save")}
    </button>
  );
}
