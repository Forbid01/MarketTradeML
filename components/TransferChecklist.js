"use client";

import { useState } from "react";
import { setChecklistItem } from "@/lib/actions";
import { CHECKLIST_FIELDS } from "@/lib/constants";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { Bell, Check } from "@/components/icons";

// Build Plan 1.11: ШИНЭЧИЛСЭН шилжүүлгийн шалгах жагсаалт.
// Серверийн checklist prop-ыг үнэний эх сурвалж болгож, optimistic override-уудыг
// давхарлана — router.refresh()-ээр шинэ серверийн төлөв ирэхэд override-ууд цэвэрлэгдэж
// нөгөө талын (buyer/seller) өөрчлөлт алдагдалгүй харагдана.
export default function TransferChecklist({ orderId, checklist, canEdit }) {
  const t = useT();
  const call = useAction();
  const [overrides, setOverrides] = useState({});
  const [prevChecklist, setPrevChecklist] = useState(checklist);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Серверээс шинэ prop ирмэгц optimistic давхаргыг хаяна (render үеийн state тохируулга —
  // эффект дотор setState хийхээс зайлсхийнэ).
  if (prevChecklist !== checklist) {
    setPrevChecklist(checklist);
    setOverrides({});
  }
  const state = { ...(checklist ?? {}), ...overrides };

  async function toggle(key, value) {
    if (!canEdit) return;
    setBusy(true);
    setErr(null);
    setOverrides((s) => ({ ...s, [key]: value }));
    // Шууд table update БИШ — server-side тал шалгадаг server action (buyer-side талбарыг зөвхөн
    // худалдан авагч, seller-side-ийг зөвхөн зарагч тэмдэглэнэ).
    const { error } = await call(setChecklistItem, orderId, key, value);
    setBusy(false);
    if (error) {
      setOverrides((s) => ({ ...s, [key]: !value })); // буцаах
      setErr(error);
    }
    // Амжилтад refresh ХИЙХГҮЙ: optimistic override UI-г аль хэдийн зөв болгосон,
    // toggle бүрд чат/escrow бүхий хүнд хуудсыг бүхэлд нь дахин зурдаг байсан.
    // Нөгөө талын өөрчлөлт дараагийн navigation/refresh-ээр prop-sync дамжин ирнэ.
  }

  const done = CHECKLIST_FIELDS.filter((f) => state[f.key]).length;

  return (
    <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-50">{t("checklist.title")}</h3>
        <span className="text-xs text-slate-400">{done}/{CHECKLIST_FIELDS.length}</span>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 p-2 text-xs leading-relaxed text-gold">
        <Bell size={14} className="mt-0.5 shrink-0 text-gold" />
        <span>{t("checklist.warning")}</span>
      </p>

      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}

      <ul className="space-y-1.5">
        {CHECKLIST_FIELDS.map((f) => {
          const checked = Boolean(state[f.key]);
          return (
            <li key={f.key}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canEdit || busy}
                    onChange={(e) => toggle(f.key, e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-white/15 bg-white/5 checked:border-violet checked:bg-gradient-to-r checked:from-violet checked:to-azure focus:ring-1 focus:ring-violet disabled:cursor-not-allowed"
                  />
                  {checked && (
                    <Check
                      size={12}
                      strokeWidth={3}
                      className="pointer-events-none absolute text-white"
                    />
                  )}
                </span>
                <span className="flex-1 text-sm text-slate-300">
                  {t(`checklist.fields.${f.key}`)}
                  <span className="ml-1 text-[10px] uppercase text-slate-400">
                    {f.side === "seller" ? t("checklist.sideSeller") : t("checklist.sideBuyer")}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
