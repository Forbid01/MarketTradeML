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
    { n: "01", title: t("landing.step1Title"), body: t("landing.step1Body") },
    { n: "02", title: t("landing.step2Title"), body: t("landing.step2Body") },
    { n: "03", title: t("landing.step3Title"), body: t("landing.step3Body") },
    { n: "04", title: t("landing.step4Title"), body: t("landing.step4Body") },
  ];

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -mt-6 w-screen overflow-hidden">
      <Hero />

      {/* Trust / features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#38BDF8]">{t("landing.trustEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("landing.trustTitle")}</h2>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 110}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-[#6D5DF6]/40 hover:bg-white/[0.06]">
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

      {/* How it works — numbered */}
      <section className="border-y border-white/5 bg-[#0B0E1A]/60 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#F5C451]">{t("landing.stepsEyebrow")}</p>
              <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("landing.stepsTitle")}</h2>
            </div>
          </Reveal>
          <div className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div aria-hidden className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[#6D5DF6]/40 to-transparent lg:block" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="bg-gradient-to-br from-[#F5C451] to-[#6D5DF6] bg-clip-text text-4xl font-black tracking-tight text-transparent">{s.n}</div>
                  <h3 className="mt-3 text-base font-bold uppercase tracking-wide text-slate-50">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal><Stats /></Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24">
        <Reveal>
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-[#6D5DF6]/30 bg-gradient-to-br from-[#6D5DF6]/15 via-[#0B0E1A] to-[#06070E] px-6 py-16 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#F5C451]/15 blur-[90px]" />
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
