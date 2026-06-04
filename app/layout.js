import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { LocaleProvider } from "@/lib/i18n/client";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "MLBB Маркетплейс — escrow хамгаалалттай аккаунт худалдаа",
  description:
    "Mobile Legends аккаунтыг escrow ба итгэлцлийн хамгаалалттай худалдан авах, зарах маркетплейс.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MLBB Market",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-900">
        <noscript>
          {/* JS-гүй browser-т scroll-reveal контентыг шууд харагдуулна */}
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <LocaleProvider locale={locale} dict={dictionaries[locale]}>
          <Header />
          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
          <InstallPrompt />
          <ServiceWorkerRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
