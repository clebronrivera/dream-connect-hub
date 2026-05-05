import { Calendar, CheckCircle2, Heart, MessageCircle, Phone } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF, GALACTIC_HOME_TEL_HREF } from "@/components/home/GalacticHomeNav";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";
import { StickerButton } from "@/components/redesign/PublicDesignPrimitives";

const pageShellClass = "min-h-screen bg-[#0f041b] text-white";
const containerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";
const glassCardClass = "rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl";
const glossyStickerBaseClass =
  "group relative overflow-hidden rounded-3xl px-10 py-5 text-lg font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[''] sm:px-12 sm:text-xl";
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const violetStickerClass =
  `${glossyStickerBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

const announcementCards = [
  {
    title: "Expected Litters",
    body: "See what is planned next, with clear breeding and expected go-home windows.",
    icon: Calendar,
  },
  {
    title: "Text-First Updates",
    body: "We send early notice by text when a litter is close and families can prepare.",
    icon: MessageCircle,
  },
  {
    title: "Family Matching",
    body: "No slot complexity. We focus on fit, timeline, and direct communication.",
    icon: Heart,
  },
];

const sampleLitter = {
  title: "Mini Goldendoodle Litter — Bella x Teddy",
  stage: "Pre-birth announcement",
  breedingDate: "May 12, 2026",
  expectedWhelping: "July 14, 2026",
  expectedGoHome: "September 8, 2026",
  summary:
    "Cream and apricot Mini Goldendoodles expected. Home-raised with daily socialization and family handling from day one.",
};

export default function UpcomingLittersV2Mockup() {
  return (
    <Layout bare>
      <Seo pageId="upcomingLitters" title="Upcoming Litters (Mockup)" />
      <div className={pageShellClass}>
        <GalacticHomeNav />

        <section
          className="relative overflow-hidden border-b border-white/10 py-16 md:py-20"
          style={{
            background: "radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)",
          }}
        >
          <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />

          <div className={`relative z-20 text-center ${containerClass}`}>
            <div className="mb-4 inline-flex items-center rounded-full border border-[#ff3399]/40 bg-[#ff3399]/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white">
              Upcoming Puppies Announcement
            </div>
            <h1 className="mx-auto mb-4 max-w-4xl font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              What is coming next.
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/80 md:text-xl">
              A cleaner, announcement-first upcoming litters page: no slot clutter, no deposit complexity, just clear timing and direct contact.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <StickerButton size="lg" className={pinkStickerClass} asChild>
                <a href={GALACTIC_HOME_SMS_HREF} className="flex items-center justify-center gap-x-3">
                  <MessageCircle className="size-6 shrink-0" aria-hidden />
                  <span>Text us for updates</span>
                </a>
              </StickerButton>
              <StickerButton size="lg" className={violetStickerClass} asChild>
                <a href={GALACTIC_HOME_TEL_HREF} className="flex items-center justify-center gap-x-3">
                  <Phone className="size-6 shrink-0" aria-hidden />
                  <span>Call our team</span>
                </a>
              </StickerButton>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0a0214] py-14 md:py-16">
          <div className={containerClass}>
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">Announcement Layout Concept</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {announcementCards.map(({ title, body, icon: Icon }) => (
                <article key={title} className={`${glassCardClass} p-6`}>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#ff3399]/10">
                    <Icon className="size-6 text-[#ff3399]" aria-hidden />
                  </div>
                  <h3 className="mb-2 text-xl font-bold">{title}</h3>
                  <p className="text-white/70">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-14 md:py-16">
          <div className={containerClass}>
            <div className="mb-8 text-center">
              <h2 className="font-display text-3xl font-black tracking-tight md:text-4xl">
                Example Upcoming Litter Card
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-white/70">
                This is how one upcoming litter announcement could look on the redesigned page.
              </p>
            </div>

            <article className={`${glassCardClass} mx-auto max-w-4xl p-7 md:p-9`}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#ff3399]/40 bg-[#ff3399]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                  {sampleLitter.stage}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
                  Mini Goldendoodle
                </span>
              </div>

              <h3 className="mb-4 font-display text-2xl font-black tracking-tight md:text-3xl">
                {sampleLitter.title}
              </h3>

              <p className="mb-6 text-white/75">{sampleLitter.summary}</p>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/60">Breeding Date</div>
                  <div className="text-base font-semibold text-white">{sampleLitter.breedingDate}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/60">Expected Whelping</div>
                  <div className="text-base font-semibold text-white">{sampleLitter.expectedWhelping}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 text-xs uppercase tracking-[0.14em] text-white/60">Expected Go-Home</div>
                  <div className="text-base font-semibold text-white">{sampleLitter.expectedGoHome}</div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <StickerButton size="lg" className={pinkStickerClass} asChild>
                  <a href={GALACTIC_HOME_SMS_HREF} className="flex items-center justify-center gap-x-3">
                    <MessageCircle className="size-5 shrink-0" aria-hidden />
                    <span>Text to pre-reserve</span>
                  </a>
                </StickerButton>
                <StickerButton size="lg" className={violetStickerClass} asChild>
                  <a href={GALACTIC_HOME_TEL_HREF} className="flex items-center justify-center gap-x-3">
                    <Phone className="size-5 shrink-0" aria-hidden />
                    <span>Call for details</span>
                  </a>
                </StickerButton>
              </div>
            </article>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className={`${containerClass} max-w-4xl`}>
            <div className={`${glassCardClass} p-8 md:p-10`}>
              <h2 className="mb-6 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
                Suggested Wire-Up Plan
              </h2>
              <ul className="space-y-4 text-white/80">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#ff3399]" aria-hidden />
                  Replace current hero with this announcement-first hero and dual CTA pattern.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#ff3399]" aria-hidden />
                  Keep `UpcomingLittersSection` data logic, but simplify card framing to match this visual system.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#ff3399]" aria-hidden />
                  Preserve current pre-birth visibility behavior; this redesign is presentation-only.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
