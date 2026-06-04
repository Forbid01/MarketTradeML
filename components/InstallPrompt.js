"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

// Build Plan 4.3: PWA суулгах урилга.
// Android/desktop — beforeinstallprompt; iOS Safari — "Нүүр дэлгэцэд нэмэх" заавар.
const DISMISS_KEY = "mlbb-install-dismissed";

export default function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    if (standalone || dismissed) return;

    // iOS дээр beforeinstallprompt байхгүй → гар заавар
    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
      setIosHint(true);
      setShow(true);
    }

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    const onInstalled = () => setShow(false);

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-md rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="text-blue-600">
          <Smartphone size={22} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{t("install.title")}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {iosHint ? t("install.ios") : t("install.benefit")}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={dismiss} className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
          {t("install.dismiss")}
        </button>
        {!iosHint && deferred && (
          <button
            onClick={install}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            {t("install.install")}
          </button>
        )}
      </div>
    </div>
  );
}
