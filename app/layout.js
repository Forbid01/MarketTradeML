import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header, { HeaderFallback } from "@/components/Header";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallPrompt from "@/components/InstallPrompt";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { clientDict } from "@/lib/i18n/clientDict";
import { makeT } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/client";

// cyrillic subset ЗААВАЛ: үгүй бол монгол UI текст бүхэлдээ OS fallback фонтоор гардаг
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "cyrillic"] });

export const metadata = {
  // metadataBase: OG/canonical зэрэг харьцангуй URL-уудыг абсолют болгох суурь
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://mlbb-market.vercel.app"),
  title: {
    default: "MLBB Маркетплейс — escrow хамгаалалттай аккаунт худалдаа",
    template: "%s — MLBB Market",
  },
  description:
    "Mobile Legends аккаунтыг escrow ба итгэлцлийн хамгаалалттай худалдан авах, зарах маркетплейс.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MLBB Market",
  },
  // apple: PNG заавал (iOS apple-touch-icon SVG дэмждэггүй — нүүр дэлгэцэд хоосон icon гардаг байсан)
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#06070E",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const t = makeT(dictionaries[locale]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-slate-100 antialiased">
        <noscript>
          {/* JS-гүй browser-т scroll-reveal контентыг шууд харагдуулна */}
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        {/* clientDict: client компонентуудын хэрэглэдэг namespace-уудын subset л serialize хийгдэнэ */}
        <LocaleProvider locale={locale} dict={clientDict(dictionaries[locale])}>
          {/* Keyboard хэрэглэгчдэд header-ийг алгасах линк (focus авмагц харагдана) */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[#0B0E1A] focus:px-4 focus:py-2 focus:text-sm focus:text-slate-50 focus:ring-1 focus:ring-violet"
          >
            {t("a11y.skip")}
          </a>
          {/* Header auth+DB уншилттай — Suspense-ээр стрийм хийж эхний paint-ийг блоклохгүй */}
          <Suspense fallback={<HeaderFallback />}>
            <Header />
          </Suspense>
          <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
          <InstallPrompt />
          <ServiceWorkerRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
