"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setChecklistItem } from "@/lib/actions";
import { CHECKLIST_FIELDS } from "@/lib/constants";
import { useT } from "@/lib/i18n/client";
import { Bell, Check } from "@/components/icons";

// Build Plan 1.11: ШИНЭЧИЛСЭН шилжүүлгийн шалгах жагсаалт.
export default function TransferChecklist({ orderId, checklist, canEdit }) {
  const router = useRouter();
  const t = useT();
  const [state, setState] = useState(checklist ?? {});
  const [busy, setBusy] = useState(false);

  async function toggle(key, value) {
    if (!canEdit) return;
    setBusy(true);
    setState((s) => ({ ...s, [key]: value }));
    // Шууд table update БИШ — server-side тал шалгадаг server action (buyer-side талбарыг зөвхөн
    // худалдан авагч, seller-side-ийг зөвхөн зарагч тэмдэглэнэ).
    const { error } = await setChecklistItem(orderId, key, value);
    setBusy(false);
    if (error) {
      setState((s) => ({ ...s, [key]: !value })); // буцаах
    } else {
      router.refresh();
    }
  }

  const done = CHECKLIST_FIELDS.filter((f) => state[f.key]).length;

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{t("checklist.title")}</h3>
        <span className="text-xs text-slate-400">{done}/{CHECKLIST_FIELDS.length}</span>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-relaxed text-amber-700">
        <Bell size={14} className="mt-0.5 shrink-0 text-amber-600" />
        <span>{t("checklist.warning")}</span>
      </p>

      <ul className="space-y-1.5">
        {CHECKLIST_FIELDS.map((f) => {
          const checked = Boolean(state[f.key]);
          return (
            <li key={f.key}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <span className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!canEdit || busy}
                    onChange={(e) => toggle(f.key, e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-slate-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                  {checked && (
                    <Check
                      size={12}
                      strokeWidth={3}
                      className="pointer-events-none absolute text-white"
                    />
                  )}
                </span>
                <span className="flex-1 text-sm text-slate-600">
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
