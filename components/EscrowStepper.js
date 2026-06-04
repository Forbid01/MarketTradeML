import { getT } from "@/lib/i18n/server";
import { Check, ArrowRight } from "@/components/icons";

const STEP_KEYS = ["created", "paid", "transferring", "inspecting", "completed"];

export default async function EscrowStepper({ status }) {
  // Салаалсан төлвүүдийг тусад нь харуулна.
  if (["disputed", "cancelled", "expired", "refunded"].includes(status)) {
    return null;
  }
  const t = await getT();
  const current = STEP_KEYS.indexOf(status);

  return (
    <ol className="flex items-center gap-1 overflow-x-auto py-2 text-[11px]">
      {STEP_KEYS.map((key, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={key} className="flex items-center gap-1">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                active
                  ? "bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white ring-2 ring-[#38BDF8]/30"
                  : done
                    ? "bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] text-white"
                    : "border border-white/15 text-slate-500"
              }`}
            >
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={active ? "text-[#38BDF8]" : "text-slate-500"}>{t(`stepper.${key}`)}</span>
            {i < STEP_KEYS.length - 1 && <ArrowRight size={14} className="mx-1 text-slate-500" />}
          </li>
        );
      })}
    </ol>
  );
}
