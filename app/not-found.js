import Link from "next/link";
import { getT } from "@/lib/i18n/server";

// Локалчилсан 404 — notFound() болон тохирохгүй URL бүр эндээс гарна
// (өмнө нь Next-ийн англи default 404 харагдаж байсан).
export default async function NotFound() {
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <p className="text-gradient-gold text-6xl font-bold">
        404
      </p>
      <h1 className="text-xl font-bold uppercase tracking-wide text-slate-50">{t("notFound.title")}</h1>
      <p className="text-sm text-slate-400">{t("notFound.desc")}</p>
      <Link
        href="/"
        className="rounded-lg bg-gradient-to-r from-violet to-azure px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
      >
        {t("notFound.home")}
      </Link>
    </div>
  );
}
