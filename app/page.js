import Link from "next/link";
import { cookies } from "next/headers";
import { isDbConfigured } from "@/lib/db";
import { getMarketStats, getRecentReviews, getRecentSales } from "@/lib/queries";
import { getT, getLocale } from "@/lib/i18n/server";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import Parallax from "@/components/landing/Parallax";
import LiveCounters from "@/components/landing/LiveCounters";
import StepsTimeline from "@/components/landing/StepsTimeline";
import ScrollProgress from "@/components/landing/ScrollProgress";
import SectionDots from "@/components/landing/SectionDots";
import Marquee from "@/components/landing/Marquee";
import Preloader from "@/components/landing/Preloader";
import SmoothScroll from "@/components/landing/SmoothScroll";
import ScrambleText from "@/components/landing/ScrambleText";
import ThemeShift from "@/components/landing/ThemeShift";
import CTAPinned from "@/components/landing/CTAPinned";
import RecentSales from "@/components/landing/RecentSales";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import { Shield, BadgeCheck, Lock, Logo, Facebook, Instagram } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getT();

  // Preloader-ийг зөвхөн анхны зочлолтод (cookie байхгүй) серверт рендэрлэнэ → first-paint-д бүрхэнэ.
  const introSeen = (await cookies()).get("mlbb_intro")?.value === "1";

  // Live counter / social proof — бодит тоо. ЗЭРЭГЦЭЭ татна (3 дараалсан round-trip биш);
  // DB-гүй/алдаатай бол тус бүр алгасна.
  let stats = null, reviews = [], sales = [];
  if (isDbConfigured) {
    [stats, reviews, sales] = await Promise.all([
      getMarketStats().catch(() => null),
      getRecentReviews(6).catch(() => []),
      getRecentSales(8).catch(() => []),
    ]);
  }
  const locale = await getLocale();
  const features = [
    { Icon: Shield, title: t("landing.feat1Title"), body: t("landing.feat1Body"), v: "left" },
    { Icon: BadgeCheck, title: t("landing.feat2Title"), body: t("landing.feat2Body"), v: "up" },
    { Icon: Lock, title: t("landing.feat3Title"), body: t("landing.feat3Body"), v: "right" },
  ];
  const steps = [
    { n: "01", title: t("landing.step1Title"), body: t("landing.step1Body") },
    { n: "02", title: t("landing.step2Title"), body: t("landing.step2Body") },
    { n: "03", title: t("landing.step3Title"), body: t("landing.step3Body") },
    { n: "04", title: t("landing.step4Title"), body: t("landing.step4Body") },
  ];

  // Секцүүдийн жагсаалт өгөгдлөөс хамаарна: sold/voices нь хоосон үед рендэрлэгддэггүй
  // тул нөхцөлтэйгээр оруулна (үгүй бол dot navigator үхмэл цэг заана).
  const sectionIds = [
    "hero", "trust", "steps", "stats",
    ...(sales.length ? ["sold"] : []),
    ...(reviews.length ? ["voices"] : []),
    "faq", "cta",
  ];

  // overflow-x-clip (hidden БИШ): hidden нь доторх position:sticky-г (CTAPinned) эвддэг,
  // clip нь scroll container үүсгэлгүй хэвтээ халиалтыг л хайчилна.
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-x-clip">
      {!introSeen && <Preloader />}
      <SmoothScroll />
      {/* Секц бүрд дэвсгэрийн өнгөний уур амьсгал шилжинэ (sold/voices орсон — өнгөний "нүх"-гүй) */}
      <ThemeShift map={{ hero: "violet", trust: "azure", steps: "deep", stats: "gold", sold: "azure", voices: "violet", faq: "violet", cta: "gold" }} />
      <ScrollProgress />
      <SectionDots ids={sectionIds} />

      <div id="hero">
        <Hero />
      </div>

      {/* Trust marquee */}
      <Marquee />

      {/* Trust / features */}
      <section id="trust" className="relative px-4 py-20 sm:py-28">
        <Parallax speed={140} className="pointer-events-none absolute -left-20 top-10 -z-10">
          <div className="h-72 w-72 rounded-full bg-violet/12 blur-[120px]" />
        </Parallax>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <ScrambleText as="p" text={t("landing.trustEyebrow")} className="text-xs font-semibold uppercase tracking-[0.22em] text-azure" />
              <ScrambleText as="h2" text={t("landing.trustTitle")} duration={1100} className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl" />
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 120} variant={f.v}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet/40 hover:bg-white/[0.06] hover:shadow-[0_20px_60px_-24px_rgba(109,93,246,0.7)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet/30 to-azure/20 text-[#bfe9ff]">
                    <f.Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold uppercase tracking-wide text-slate-50">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — scrubbed timeline */}
      <section id="steps" className="relative overflow-hidden border-y border-white/5 bg-[#0B0E1A]/60 px-4 py-20 sm:py-28">
        <Parallax speed={180} className="pointer-events-none absolute -right-24 top-0 -z-10">
          <div className="h-80 w-80 rounded-full bg-azure/10 blur-[130px]" />
        </Parallax>
        <StepsTimeline eyebrow={t("landing.stepsEyebrow")} title={t("landing.stepsTitle")} steps={steps} />
      </section>

      {/* Stats — нэг хүчтэй тоо баримтын зурвас (бодит тоо эсвэл чанарын баталгаа) */}
      <section id="stats" className="relative px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal variant="scale">
            <LiveCounters stats={stats} />
          </Reveal>
        </div>
      </section>

      {/* Сүүлийн арилжаа (борлуулалт байвал) — id: ThemeShift/SectionDots-ийн нэг хэсэг */}
      {sales.length > 0 && (
        <div id="sold">
          <RecentSales sales={sales} label={t("landing.soldLabel")} locale={locale} />
        </div>
      )}

      {/* Testimonials — бодит сэтгэгдэл байвал */}
      {reviews.length > 0 && (
        <section id="voices" className="relative px-4 py-20 sm:py-28">
          <Testimonials reviews={reviews} />
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="relative px-4 py-20 sm:py-28">
        <Reveal variant="blur">
          <FAQ />
        </Reveal>
      </section>

      {/* Final CTA — pinned/sticky scroll урсгал (гарчиг → тайлбар → товч ээлжлэн угсарна) */}
      <section id="cta" className="pb-16">
        <CTAPinned title={t("landing.finalTitle")} sub={t("landing.finalSub")} cta={t("landing.finalCta")} />
      </section>

      <footer className="border-t border-white/5 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left">
              <Link href="/" className="inline-flex items-center gap-2 font-bold uppercase tracking-wide text-slate-50">
                <Logo className="text-azure" /> MLBB Market
              </Link>
              <p className="mx-auto mt-2 max-w-xs text-xs text-slate-400 sm:mx-0">{t("landing.heroBadge")}</p>
            </div>
            {/* Сошиал холбоосууд (навигаци header-т бий тул энд давтахгүй) */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/AmarmurunMandakh"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-violet/40 hover:bg-white/5 hover:text-slate-50"
              >
                <Facebook size={18} />
              </a>
              <a
                href="https://www.instagram.com/forbid_01/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-violet/40 hover:bg-white/5 hover:text-slate-50"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>
          {/* slate-600 нь бараан дэвсгэрт AA contrast хангадаггүй — 500 болгосон */}
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-slate-400">{t("landing.footNote")}</p>
        </div>
      </footer>
    </div>
  );
}
