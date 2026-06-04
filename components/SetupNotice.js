import { getT } from "@/lib/i18n/server";
import { Wrench } from "@/components/icons";

export default async function SetupNotice() {
  const t = await getT();
  const steps = [t("setup.step1"), t("setup.step2"), t("setup.step3"), t("setup.step4")];
  return (
    <div className="rounded-xl border border-[#F5C451]/30 bg-[#F5C451]/10 p-5 text-sm text-amber-100">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-[#F5C451]">
        <Wrench size={18} /> {t("setup.title")}
      </h2>
      <p className="mb-3 text-amber-100/90">{t("setup.intro")}</p>
      <ol className="list-decimal space-y-1 pl-5 text-amber-100/80">
        {steps.map((s, i) => (
          <li key={i}>
            <code className="rounded bg-black/40 px-1 text-amber-100">{s}</code>
          </li>
        ))}
      </ol>
    </div>
  );
}
