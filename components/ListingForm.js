"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createListing, editListing, addListingImage, deleteListingImage } from "@/lib/actions";
import { RANKS, SERVERS } from "@/lib/constants";
import { listingSchema } from "@/lib/validation";
import { compressImage } from "@/lib/image";
import { useT } from "@/lib/i18n/client";
import ListingCard from "@/components/ListingCard";
import { ImageIcon, ArrowRight, Check, ShieldCheck } from "@/components/icons";

const field =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-[#6D5DF6] focus:ring-1 focus:ring-[#6D5DF6]";

export default function ListingForm({ listing = null, images = [], me = null }) {
  const router = useRouter();
  const t = useT();
  const editing = Boolean(listing);
  const stepsRaw = t("listingForm.steps");
  const stepList = Array.isArray(stepsRaw) ? stepsRaw : [];

  const [step, setStep] = useState(0);
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
  const [files, setFiles] = useState([]); // шинэ зураг (дараалал = sort_order)
  const [imgs, setImgs] = useState(images); // одоо байгаа зураг (засах үед)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Сонгосон файлуудын object URL preview — files өөрчлөгдөхөд л дахин үүсгэж, effect-д цэвэрлэнэ.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const priceNum = parseInt(form.price, 10);
  const basicsOk = form.title.trim().length >= 3 && Number.isFinite(priceNum) && priceNum > 0;
  const coverUrl = previews[0] ?? imgs[0]?.url ?? null;
  const previewListing = {
    id: "preview",
    title: form.title.trim() || t("listingForm.titlePh"),
    price: Number.isFinite(priceNum) ? priceNum : 0,
    server: form.server,
    rank: form.rank,
    createdAt: new Date().toISOString(),
  };

  function pickFiles(e) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles((arr) => [...arr, ...picked]);
    e.target.value = ""; // ижил файлыг дахин сонгох боломж
  }
  function moveFile(i, dir) {
    setFiles((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  const removeFile = (i) => setFiles((arr) => arr.filter((_, k) => k !== i));
  async function removeImg(id) {
    const r = await deleteListingImage(id);
    if (r.ok) setImgs((a) => a.filter((x) => x.id !== id));
    else setErr(r.error);
  }

  function goNext() {
    setErr(null);
    if (step === 0 && !basicsOk) {
      setErr(priceNum > 0 ? t("listingForm.errTitle") : t("listingForm.errPrice"));
      return;
    }
    setStep((s) => Math.min(stepList.length - 1, s + 1));
  }
  const goPrev = () => { setErr(null); setStep((s) => Math.max(0, s - 1)); };

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const intOrNull = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
      const numOrNull = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
      const payload = {
        title: form.title.trim(),
        price: priceNum,
        server: form.server,
        rank: form.rank,
        description: form.description.trim() || null,
        level: intOrNull(form.level),
        heroes_count: intOrNull(form.heroes_count),
        skins_count: intOrNull(form.skins_count),
        win_rate: numOrNull(form.win_rate),
      };
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

      // Зургийг дараалаар нь best-effort upload (30с timeout). Алдаа гарсан ч зар руу шилжинэ.
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

  const last = stepList.length - 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        {/* Stepper */}
        <ol className="mb-5 flex items-center gap-2">
          {stepList.map((label, i) => {
            const done = i < step;
            const on = i === step;
            return (
              <li key={i} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                    on ? "border-[#38BDF8] bg-[#38BDF8]/15 text-[#38BDF8]"
                    : done ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                    : "border-white/15 text-slate-500"
                  }`}
                >
                  {done ? <Check size={14} /> : i + 1}
                </button>
                <span className={`hidden text-xs font-medium sm:inline ${on ? "text-slate-50" : "text-slate-500"}`}>{label}</span>
                {i < last && <span className={`h-px flex-1 ${done ? "bg-emerald-400/40" : "bg-white/10"}`} />}
              </li>
            );
          })}
        </ol>

        {/* Step 0 — Үндсэн */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-200">{t("listingForm.title")}</label>
              <input className={field} required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder={t("listingForm.titlePh")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-slate-200">{t("listingForm.price")}</label>
                <input className={field} required inputMode="numeric" value={form.price} onChange={(e) => update("price", e.target.value.replace(/[^0-9]/g, ""))} placeholder={t("listingForm.pricePh")} />
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
          </div>
        )}

        {/* Step 1 — Үзүүлэлт */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-200">{t("listingForm.description")}</label>
              <textarea className={field} rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder={t("listingForm.descPh")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-xs text-slate-400">{t("listingForm.level")}</label><input className={field} inputMode="numeric" value={form.level} onChange={(e) => update("level", e.target.value.replace(/[^0-9]/g, ""))} placeholder="70" /></div>
              <div><label className="mb-1 block text-xs text-slate-400">{t("listingForm.heroes")}</label><input className={field} inputMode="numeric" value={form.heroes_count} onChange={(e) => update("heroes_count", e.target.value.replace(/[^0-9]/g, ""))} placeholder="50" /></div>
              <div><label className="mb-1 block text-xs text-slate-400">{t("listingForm.skins")}</label><input className={field} inputMode="numeric" value={form.skins_count} onChange={(e) => update("skins_count", e.target.value.replace(/[^0-9]/g, ""))} placeholder="30" /></div>
              <div><label className="mb-1 block text-xs text-slate-400">{t("listingForm.winRate")}</label><input className={field} inputMode="decimal" value={form.win_rate} onChange={(e) => update("win_rate", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="55.5" /></div>
            </div>
          </div>
        )}

        {/* Step 2 — Зураг */}
        {step === 2 && (
          <div className="space-y-4">
            {imgs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imgs.map((im) => (
                  <div key={im.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt="" className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
                    <button type="button" onClick={() => removeImg(im.id)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white" aria-label={t("listingForm.deleteImage")}>×</button>
                  </div>
                ))}
              </div>
            )}
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-24 rounded-lg border border-white/10 object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-[#F5C451] px-1 text-[9px] font-bold uppercase text-[#06070E]">{t("listingForm.cover")}</span>}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#06070E]/70 px-1 text-sm leading-none text-slate-100">
                      <button type="button" disabled={i === 0} onClick={() => moveFile(i, -1)} aria-label={t("listingForm.moveLeft")} className="px-1 disabled:opacity-30">‹</button>
                      <button type="button" disabled={i === previews.length - 1} onClick={() => moveFile(i, 1)} aria-label={t("listingForm.moveRight")} className="px-1 disabled:opacity-30">›</button>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-xs text-white" aria-label={t("listingForm.deleteImage")}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-8 text-center transition hover:border-[#6D5DF6]/40">
              <ImageIcon size={28} className="text-slate-500" />
              <span className="text-sm text-slate-400">{t("listingForm.addMore")}</span>
              <input type="file" accept="image/*" multiple onChange={pickFiles} className="hidden" />
            </label>
            {files.length > 0 && <p className="text-xs text-slate-500">{t("listingForm.imagesSelected", { n: files.length })}</p>}
          </div>
        )}

        {/* Step 3 — Шалгах */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="lg:hidden">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#38BDF8]">{t("listingForm.reviewNote")}</p>
              <div className="max-w-[240px]">
                <ListingCard listing={previewListing} seller={me} imageUrl={coverUrl} />
              </div>
            </div>
            <div className="flex gap-2 rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-3 text-xs leading-relaxed text-[#F5C451]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" />
              <p>{t("listingForm.moontonWarn")}</p>
            </div>
          </div>
        )}

        {err && <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/15 p-2 text-sm text-red-300">{err}</p>}

        {/* Nav */}
        <div className="mt-5 flex items-center justify-between gap-2">
          <button type="button" onClick={goPrev} disabled={step === 0 || busy} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.04] disabled:opacity-40">
            {t("listingForm.prev")}
          </button>
          {step < last ? (
            <button type="button" onClick={goNext} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-5 py-2 text-sm font-semibold text-white hover:brightness-110">
              {t("listingForm.next")} <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={busy || !basicsOk} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
              {busy ? t("listingForm.submitting") : editing ? t("listingForm.save") : t("listingForm.submit")}
            </button>
          )}
        </div>
      </div>

      {/* Live preview (lg sticky) */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#38BDF8]">{t("listingForm.previewTitle")}</p>
          <ListingCard listing={previewListing} seller={me} imageUrl={coverUrl} />
        </div>
      </aside>
    </div>
  );
}
