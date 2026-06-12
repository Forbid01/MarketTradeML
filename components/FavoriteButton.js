"use client";

import { useState } from "react";
import { toggleFavorite } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { Heart } from "@/components/icons";

// Зар хадгалах (favorites). RLS зөвхөн өөрийн мөрийг зөвшөөрнө.
export default function FavoriteButton({ listingId, initialFavorited }) {
  const t = useT();
  const call = useAction();
  const [fav, setFav] = useState(Boolean(initialFavorited));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function toggle() {
    setBusy(true);
    setErr(null);
    const r = await call(toggleFavorite, listingId);
    if (r.error) setErr(r.error);
    else setFav(r.favorited); // локал төлөв хангалттай — router.refresh() бүх хуудсыг дэмий refetch хийдэг байсан
    setBusy(false);
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={toggle}
        disabled={busy}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
          fav
            ? "border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
            : "border-white/10 text-slate-300 hover:bg-white/[0.03]"
        }`}
      >
        <Heart size={16} filled={fav} className={fav ? "text-rose-500" : "text-slate-400"} />
        {fav ? t("favorite.saved") : t("favorite.save")}
      </button>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </div>
  );
}
