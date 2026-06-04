"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "@/components/icons";
import { useT } from "@/lib/i18n/client";
import { useClientValue } from "@/lib/hooks";

// Build Plan 4.3: PWA суулгах урилга.
// Android/desktop — beforeinstallprompt; iOS Safari — "Нүүр дэлгэцэд нэмэх" заавар.
const DISMISS_KEY = "mlbb-install-dismissed";

// Browser орчныг mount-д нэг л удаа уншина (useClientValue → SSR-safe, синхрон setState-гүй).
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
  window.navigator.standalone === true;
const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const wasDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
};

export default function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const standalone = useClientValue(isStandalone);
  const ios = useClientValue(isIosDevice);
  const alreadyDismissed = useClientValue(wasDismissed);

  useEffect(() => {
    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  }

  // iOS-д beforeinstallprompt байхгүй → гар заавар; Android-д deferred prompt товч.
  const iosHint = ios && deferred == null;
  const show =
    !standalone && !alreadyDismissed && !dismissed && !installed && (ios || deferred != null);
  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-md rounded-xl border border-white/10 bg-[#0B0E1A]/95 p-3 shadow-lg backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="text-[#38BDF8]">
          <Smartphone size={22} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-100">{t("install.title")}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {iosHint ? t("install.ios") : t("install.benefit")}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={dismiss} className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200">
          {t("install.dismiss")}
        </button>
        {!iosHint && deferred && (
          <button
            onClick={install}
            className="rounded-lg bg-gradient-to-r from-[#6D5DF6] to-[#38BDF8] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
          >
            {t("install.install")}
          </button>
        )}
      </div>
    </div>
  );
}
