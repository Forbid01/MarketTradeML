"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { requestOtp } from "@/lib/actions";
import { useT } from "@/lib/i18n/client";
import { useAction } from "@/lib/hooks";
import { Mail, Lock, ArrowRight } from "@/components/icons";

// Зөвхөн дотоод зам руу redirect (open-redirect-аас сэргийлнэ).
function safeNext(v) {
  if (typeof v !== "string" || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const t = useT();
  const call = useAction();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function signInGoogle() {
    setBusy(true);
    setMsg(null);
    const res = await call(signIn, "google", { callbackUrl: next });
    if (res?.error) { setMsg(res.error); setBusy(false); }
  }

  async function sendOtp(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    // И-мэйл рүү 6 оронтой баталгаажуулах код илгээнэ (бүртгэлгүй бол шинээр үүсгэнэ).
    const res = await call(requestOtp, email);
    setBusy(false);
    if (res?.error) setMsg(res.error);
    else {
      setOtpSent(true);
      setMsg(t("login.codeSent"));
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await call(signIn, "otp", { email, code: otp, redirect: false });
    setBusy(false);
    if (res?.error) {
      // Auth.js түүхий кодоо ("CredentialsSignin" г.м) буцаадаг — хэрэглэгчид
      // локалчилсан ойлгомжтой мессеж харуулна.
      setMsg(res.error === "CredentialsSignin" ? t("login.badCode") : t("common.error"));
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-slate-50">{t("login.title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("login.subtitle")}</p>
      </div>

      <button
        onClick={signInGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-50 hover:border-violet/40 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        {t("login.google")}
      </button>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-white/10" /> {t("login.or")} <span className="h-px flex-1 bg-white/10" />
      </div>

      {!otpSent ? (
        <form onSubmit={sendOtp} className="space-y-3">
          <label htmlFor="login-email" className="block text-sm text-slate-300">{t("login.email")}</label>
          <input
            id="login-email"
            aria-describedby="login-msg"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@gmail.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-violet focus:ring-1 focus:ring-violet"
          />
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            <Mail size={16} />
            {t("login.getCode")}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-3">
          <label htmlFor="login-otp" className="block text-sm text-slate-300">{t("login.code")}</label>
          <input
            id="login-otp"
            aria-describedby="login-msg"
            inputMode="numeric"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="000000"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-lg tracking-widest text-slate-50 outline-none placeholder:text-slate-500 focus:border-violet focus:ring-1 focus:ring-violet"
          />
          <button
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet to-azure px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            <Lock size={16} />
            {t("login.verify")}
          </button>
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            className="flex w-full items-center justify-center gap-1 text-xs text-slate-400 hover:text-slate-50"
          >
            <ArrowRight size={14} />
            {t("login.changeEmail")}
          </button>
        </form>
      )}

      {msg && <p id="login-msg" role="alert" className="text-center text-sm text-gold">{msg}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
