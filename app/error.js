"use client";

// Route-segment алдааны хил (Next App Router). Хэвлэлийн (render) ба server-component алдааг
// барьж, дахин оролдох товч үзүүлнэ. LocaleProvider (root layout) дотор тул useT ажиллана.
import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function Error({ error, reset }) {
  const t = useT();

  useEffect(() => {
    // Дэлгэрэнгүйг зөвхөн консолд (хэрэглэгчид техник мессеж харуулахгүй)
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-semibold text-slate-50">{t("errorPage.title")}</h2>
      <p className="mt-2 text-sm text-slate-400">{t("errorPage.body")}</p>
      <button
        onClick={() => reset()}
        className="mt-5 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2 text-sm font-medium text-white hover:brightness-110"
      >
        {t("errorPage.retry")}
      </button>
    </div>
  );
}
