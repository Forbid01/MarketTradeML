import { getT } from "@/lib/i18n/server";
import Reveal from "@/components/landing/Reveal";
import { Star } from "@/components/icons";

// Хэрэглэгчийн бодит сэтгэгдэл (testimonials). Хоосон бол хэсэг бүхэлдээ нуугдана.
// Картууд зүүн/баруунаас ээлжлэн stagger-тэй орж ирнэ (доод хагасын монотон
// variant="up"-ийг задалсан choreography).
export default async function Testimonials({ reviews }) {
  if (!reviews?.length) return null;
  const t = await getT();

  return (
    <div className="mx-auto max-w-6xl">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-azure">{t("landing.testimonialsEyebrow")}</p>
          <h2 className="mt-3 text-3xl font-extrabold uppercase tracking-tight text-slate-50 sm:text-4xl">{t("landing.testimonialsTitle")}</h2>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r, idx) => (
          <Reveal key={r.id} variant={idx % 2 ? "right" : "left"} delay={idx * 100}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} filled={i < r.stars} className={i < r.stars ? "text-gold" : "text-white/15"} />
                ))}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-300">“{r.comment}”</p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {t("landing.testimonialBuyer")}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
