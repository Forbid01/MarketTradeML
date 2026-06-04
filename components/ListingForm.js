"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createListing, editListing, addListingImage, deleteListingImage } from "@/lib/actions";
import { RANKS, SERVERS } from "@/lib/constants";
import { listingSchema } from "@/lib/validation";
import { compressImage } from "@/lib/image";
import { useT } from "@/lib/i18n/client";
import { ImageIcon } from "@/components/icons";

export default function ListingForm({ listing = null, images = [] }) {
  const router = useRouter();
  const t = useT();
  const editing = Boolean(listing);

  const [form, setForm] = useState({
    title: listing?.title ?? "",
    price: listing?.price != null ? String(listing.price) : "",
    server: listing?.server ?? SERVERS[0],
    rank: listing?.rank ?? RANKS[6], // Mythic
    description: listing?.description ?? "",
    level: listing?.level != null ? String(listing.level) : "",
    heroes_count: listing?.heroes_count != null ? String(listing.heroes_count) : "",
    skins_count: listing?.skins_count != null ? String(listing.skins_count) : "",
    win_rate: listing?.win_rate != null ? String(listing.win_rate) : "",
  });
  const [files, setFiles] = useState([]);
  const [imgs, setImgs] = useState(images);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function removeImg(id) {
    const r = await deleteListingImage(id);
    if (r.ok) setImgs((a) => a.filter((x) => x.id !== id));
    else setErr(r.error);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const price = parseInt(form.price, 10);
      if (!Number.isFinite(price) || price <= 0) throw new Error(t("listingForm.errPrice"));
      if (form.title.trim().length < 3) throw new Error(t("listingForm.errTitle"));

      const intOrNull = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
      };
      const numOrNull = (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      };

      const payload = {
        title: form.title.trim(),
        price,
        server: form.server,
        rank: form.rank,
        description: form.description.trim() || null,
        level: intOrNull(form.level),
        heroes_count: intOrNull(form.heroes_count),
        skins_count: intOrNull(form.skins_count),
        win_rate: numOrNull(form.win_rate),
      };

      // Нэгдсэн zod баталгаажуулалт (DB CHECK-ууд эцсийн сервер талын баталгаа хэвээр).
      const parsed = listingSchema.safeParse(payload);
      if (!parsed.success) {
        const path = parsed.error.issues[0]?.path?.[0];
        throw new Error(
          path === "price" ? t("listingForm.errPrice")
          : path === "title" ? t("listingForm.errTitle")
          : t("listingForm.errInvalid")
        );
      }

      let targetId;
      if (editing) {
        const r = await editListing(listing.id, parsed.data);
        if (r.error) throw new Error(r.error);
        targetId = listing.id;
      } else {
        const r = await createListing(parsed.data);
        if (r.error) throw new Error(r.error);
        if (!r.id) throw new Error(t("listingForm.errInvalid"));
        targetId = r.id;
      }

      // Шинэ зургийг best-effort upload (30с timeout). Алдаа гарсан ч зар руу шилжинэ.
      const base = imgs?.length ?? 0;
      for (let i = 0; i < files.length; i++) {
        try {
          const blob = await compressImage(files[i]);
          if (blob.size > 7_000_000) continue;
          const fd = new FormData();
          fd.append("file", blob);
          fd.append("sort", String(base + i));
          await Promise.race([
            addListingImage(targetId, fd),
            new Promise((resolve) => setTimeout(() => resolve({ error: "timeout" }), 30000)),
          ]);
        } catch {}
      }

      router.push(`/listings/${targetId}`);
      router.refresh();
    } catch (e) {
      setErr(e.message ?? String(e));
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-slate-200">{t("listingForm.title")}</label>
        <input
          className={field}
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder={t("listingForm.titlePh")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-slate-200">{t("listingForm.price")}</label>
          <input
            className={field}
            required
            inputMode="numeric"
            value={form.price}
            onChange={(e) => update("price", e.target.value.replace(/[^0-9]/g, ""))}
            placeholder={t("listingForm.pricePh")}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-200">{t("listingForm.server")}</label>
          <select className={field} value={form.server} onChange={(e) => update("server", e.target.value)}>
            {SERVERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-200">{t("listingForm.rank")}</label>
        <select className={field} value={form.rank} onChange={(e) => update("rank", e.target.value)}>
          {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-200">{t("listingForm.description")}</label>
        <textarea
          className={field}
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder={t("listingForm.descPh")}
        />
      </div>

      <details className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <summary className="cursor-pointer text-sm text-slate-200">{t("listingForm.more")}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("listingForm.level")}</label>
            <input className={field} inputMode="numeric" value={form.level} onChange={(e) => update("level", e.target.value.replace(/[^0-9]/g, ""))} placeholder="70" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("listingForm.heroes")}</label>
            <input className={field} inputMode="numeric" value={form.heroes_count} onChange={(e) => update("heroes_count", e.target.value.replace(/[^0-9]/g, ""))} placeholder="50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("listingForm.skins")}</label>
            <input className={field} inputMode="numeric" value={form.skins_count} onChange={(e) => update("skins_count", e.target.value.replace(/[^0-9]/g, ""))} placeholder="30" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{t("listingForm.winRate")}</label>
            <input className={field} inputMode="decimal" value={form.win_rate} onChange={(e) => update("win_rate", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="55.5" />
          </div>
        </div>
      </details>

      {editing && imgs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imgs.map((im) => (
            <div key={im.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
              <button
                type="button"
                onClick={() => removeImg(im.id)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white"
                aria-label={t("listingForm.deleteImage")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1 flex items-center gap-1.5 text-sm text-slate-200">
          <ImageIcon size={16} className="text-slate-400" /> {t("listingForm.images")}
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-[#6D5DF6] file:to-[#38BDF8] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">{t("listingForm.imagesSelected", { n: files.length })}</p>
        )}
      </div>

      {err && <p className="rounded-lg border border-red-500/30 bg-red-500/15 p-2 text-sm text-red-300">{err}</p>}

      <button
        disabled={busy}
        className="w-full rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
      >
        {busy ? t("listingForm.submitting") : editing ? t("listingForm.save") : t("listingForm.submit")}
      </button>
    </form>
  );
}
