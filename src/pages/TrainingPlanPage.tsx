import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/seo/Seo';
import { TrainingPlanForm, type TrainingPlanResult as PlanResult } from '@/components/trainingPlan/TrainingPlanForm';
import { TrainingPlanResult } from '@/components/trainingPlan/TrainingPlanResult';
import { getProblemTypeBySlug } from '@/lib/constants/trainingPlan';
import { BUSINESS } from '@/lib/constants/business';
import { GraduationCap, MessageCircle, Phone } from 'lucide-react';
import { StickerButton } from '@/components/redesign/PublicDesignPrimitives';
import { GalacticHomeMiniFooter } from '@/components/home/GalacticHomeMiniFooter';
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF, GALACTIC_HOME_TEL_HREF } from '@/components/home/GalacticHomeNav';
import { GalacticPawCanvas } from '@/components/GalacticPawCanvas';

const pageShellClass = 'min-h-screen bg-[#0f041b] text-white';
const containerClass = 'mx-auto max-w-screen-2xl px-6 md:px-8';
const glassCardClass = 'rounded-3xl border border-white/10 bg-[#12051f]/90 backdrop-blur-xl';
const glossyStickerBaseClass =
  'group relative overflow-hidden rounded-3xl px-10 py-5 text-lg font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[\'\'] sm:px-12 sm:text-xl';
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;
const violetStickerClass =
  `${glossyStickerBaseClass} bg-[#5b21b6] text-white shadow-[0_6px_0_#7c3aed,0_14px_30px_rgba(124,58,237,0.45)] hover:bg-[#7c3aed] hover:shadow-[0_6px_0_#a78bfa,0_16px_34px_rgba(167,139,250,0.5)]`;

export default function TrainingPlanPage() {
  const { problemType: slug } = useParams<{ problemType?: string }>();
  const problemType = slug ? getProblemTypeBySlug(slug) : null;
  const [plan, setPlan] = useState<PlanResult | null>(null);

  return (
    <Layout bare>
      <Seo
        pageId="trainingPlan"
        title={problemType?.seoTitle}
        description={problemType?.seoDescription}
        canonicalPath={slug ? `/training-plan/${slug}` : '/training-plan'}
      />
      <div className={pageShellClass}>
        <GalacticHomeNav />

        {/* Hero */}
        <section
          className="relative overflow-hidden border-b border-white/10 py-12 md:py-16"
          style={{
            background: 'radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)',
          }}
        >
          <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
          <div className={`relative z-20 text-center ${containerClass}`}>
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-white" />
            <h1 className="mb-3 font-display text-3xl md:text-5xl">
              {problemType ? problemType.label : 'Free Personalized Training Plan'}
            </h1>
            <p className="mx-auto max-w-2xl text-white/80">
              {problemType?.intro
                ?? 'Tell us about your dog and their challenge. Our AI creates a personalized training plan just for you — completely free.'}
            </p>
          </div>
        </section>

        {/* Form or Result */}
        <section className="border-b border-white/10 bg-[#0a0214] py-12 md:py-16">
          <div className={containerClass}>
            <div className={`${glassCardClass} p-4 md:p-6`}>
              {plan ? (
                <TrainingPlanResult plan={plan} onReset={() => setPlan(null)} />
              ) : (
                <TrainingPlanForm
                  defaultProblemType={problemType?.key}
                  onPlanGenerated={setPlan}
                />
              )}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-10">
          <div className={`${containerClass} text-center`}>
            <p className="mb-4 text-white/75">Questions about training or our puppies?</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <StickerButton size="lg" className={pinkStickerClass} asChild>
                <a href={GALACTIC_HOME_SMS_HREF} className="inline-flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Text us now
                </a>
              </StickerButton>
              <StickerButton size="lg" className={violetStickerClass} asChild>
                <a href={GALACTIC_HOME_TEL_HREF} className="inline-flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  {BUSINESS.phone}
                </a>
              </StickerButton>
              <StickerButton size="lg" className={violetStickerClass} asChild>
                <Link to="/contact" className="inline-flex items-center gap-2">
                  Contact us form
                </Link>
              </StickerButton>
            </div>
          </div>
        </section>
        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
