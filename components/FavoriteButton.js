"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { Heart } from "@/components/icons";

// Зар хадгалах (favorites). RLS зөвхөн өөрийн мөрийг зөвшөөрнө.
export default function FavoriteButton({ listingId, initialFavorited }) {
  const router = useRouter();
  const supabase = createClient();
  const t = useT();
  const [fav, setFav] = useState(Boolean(initialFavorited));
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    if (fav) {
      await supabase.from("favorites").delete().eq("listing_id", listingId);
      setFav(false);
    } else {
      const { data: uid } = await supabase.rpc("current_user_id");
      if (uid) {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: uid, listing_id: listingId });
        if (!error) setFav(true);
      }
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
