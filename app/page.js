import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import Stats from "@/components/landing/Stats";
import { Shield, BadgeCheck, Lock, ArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getT();

  const features = [
    { Icon: Shield, title: t("landing.feat1Title"), body: t("landing.feat1Body") },
    { Icon: BadgeCheck, title: t("landing.feat2Title"), body: t("landing.feat2Body") },
    { Icon: Lock, title: t("landing.feat3Title"), body: t("landing.feat3Body") },
  ];
  const steps = [
    { n: 1, title: t("landing.step1Title"), body: t("landing.step1Body") },
    { n: 2, title: t("landing.step2Title"), body: t("landing.step2Body") },
    { n: 3, title: t("landing.step3Title"), body: t("landing.step3Body") },
    { n: 4, title: t("landing.step4Title"), body: t("landing.step4Body") },
  ];

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-hidden bg-white text-slate-900">
      <Hero />

      {/* Features / trust */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">{t("landing.trustEyebrow")}</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{t("landing.trustTitle")}</h2>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 110}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                    <f.Icon size={24} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">{t("landing.stepsEyebrow")}</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">{t("landing.stepsTitle")}</h2>
            </div>
          </Reveal>
          <div className="relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* connector line (desktop) */}
            <div aria-hidden className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent lg:block" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-bold text-blue-600">
                    {s.n}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <Stats />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-amber-50 px-6 py-14 text-center shadow-sm">
            <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-amber-200/40 blur-[80px]" />
            <h2 className="relative text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t("landing.finalTitle")}</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-slate-600">{t("landing.finalSub")}</p>
            <Link
              href="/browse"
              className="relative mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_34px_-8px_rgba(37,99,235,0.5)] transition hover:bg-blue-700"
            >
              {t("landing.finalCta")} <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer note */}
      <footer className="border-t border-slate-200 px-4 py-8">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-slate-500">{t("landing.footNote")}</p>
      </footer>
    </div>
  );
}
