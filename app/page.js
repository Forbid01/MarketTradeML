import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import Parallax from "@/components/landing/Parallax";
import Stats from "@/components/landing/Stats";
import StepsTimeline from "@/components/landing/StepsTimeline";
import ScrollProgress from "@/components/landing/ScrollProgress";
import { Shield, BadgeCheck, Lock, ArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getT();

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

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-hidden">
      <ScrollProgress />
      <Hero />

      {/* Trust / features */}
      <section className="relative px-4 py-20 sm:py-28">
        <Parallax speed={140} className="pointer-events-none absolute -left-20 top-10 -z-10">
          <div className="h-72 w-72 rounded-full bg-[#6D5DF6]/12 blur-[120px]" />
        </Parallax>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#38BDF8]">{t("landing.trustEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("landing.trustTitle")}</h2>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 120} variant={f.v}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#6D5DF6]/40 hover:bg-white/[0.06] hover:shadow-[0_20px_60px_-24px_rgba(109,93,246,0.7)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#6D5DF6]/30 to-[#38BDF8]/20 text-[#bfe9ff]">
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
      <section className="relative overflow-hidden border-y border-white/5 bg-[#0B0E1A]/60 px-4 py-20 sm:py-28">
        <Parallax speed={180} className="pointer-events-none absolute -right-24 top-0 -z-10">
          <div className="h-80 w-80 rounded-full bg-[#38BDF8]/10 blur-[130px]" />
        </Parallax>
        <StepsTimeline eyebrow={t("landing.stepsEyebrow")} title={t("landing.stepsTitle")} steps={steps} />
      </section>

      {/* Stats */}
      <section className="relative px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <Reveal variant="scale">
            <Stats />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-28">
        <Reveal variant="scale">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#6D5DF6]/30 bg-gradient-to-br from-[#6D5DF6]/15 via-[#0B0E1A] to-[#06070E] px-6 py-16 text-center">
            <Parallax speed={120} zoom={0.15} className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2">
              <div className="h-full w-full rounded-full bg-[#F5C451]/15 blur-[90px]" />
            </Parallax>
            <h2 className="relative text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-5xl">{t("landing.finalTitle")}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-slate-400">{t("landing.finalSub")}</p>
            <Link
              href="/browse"
              className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F5C451] to-[#6D5DF6] px-8 py-4 text-sm font-bold uppercase tracking-wide text-[#06070E] shadow-[0_12px_40px_-8px_rgba(245,196,81,0.5)] transition hover:brightness-110"
            >
              {t("landing.finalCta")} <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 px-4 py-10">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-slate-500">{t("landing.footNote")}</p>
      </footer>
    </div>
  );
}
