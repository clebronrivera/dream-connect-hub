import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/seo/Seo';
import { TrainingPlanForm, type TrainingPlanResult as PlanResult } from '@/components/trainingPlan/TrainingPlanForm';
import { TrainingPlanResult } from '@/components/trainingPlan/TrainingPlanResult';
import { getProblemTypeBySlug } from '@/lib/constants/trainingPlan';
import { BUSINESS } from '@/lib/constants/business';
import { GraduationCap, Phone } from 'lucide-react';
import { DreamTag, StickerButton } from '@/components/redesign/PublicDesignPrimitives';

export default function TrainingPlanPage() {
  const { problemType: slug } = useParams<{ problemType?: string }>();
  const problemType = slug ? getProblemTypeBySlug(slug) : null;
  const [plan, setPlan] = useState<PlanResult | null>(null);

  const seoTitle = problemType?.seoTitle ?? 'Free Personalized Training Plan — Dream Puppies';
  const seoDescription = problemType?.seoDescription
    ?? 'Get a free AI-powered training plan personalized for your dog. Step-by-step guidance from Dream Puppies.';

  return (
    <Layout>
      <Seo title={seoTitle} description={seoDescription} canonicalPath={slug ? `/training-plan/${slug}` : '/training-plan'} />

      {/* Hero */}
      <section className="bg-bg py-12 md:py-16 text-white">
        <div className="container text-center">
          <DreamTag className="mb-3 bg-sun">Free service for every family</DreamTag>
          <GraduationCap className="h-10 w-10 text-white mx-auto mb-3" />
          <h1 className="font-display text-3xl md:text-5xl mb-3">
            {problemType ? problemType.label : 'Free Personalized Training Plan'}
          </h1>
          <p className="text-white/80 max-w-2xl mx-auto">
            {problemType?.intro
              ?? 'Tell us about your dog and their challenge. Our AI creates a personalized training plan just for you — completely free.'}
          </p>
        </div>
      </section>

      {/* Form or Result */}
      <section className="container py-12 md:py-16">
        {plan ? (
          <TrainingPlanResult plan={plan} onReset={() => setPlan(null)} />
        ) : (
          <TrainingPlanForm
            defaultProblemType={problemType?.key}
            onPlanGenerated={setPlan}
          />
        )}
      </section>

      {/* Contact CTA */}
      <section className="bg-paper py-10">
        <div className="container text-center">
          <p className="text-muted-foreground mb-2">
            Questions about training or our puppies?
          </p>
          <StickerButton asChild>
            <a href={`tel:${BUSINESS.phoneRaw}`} className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {BUSINESS.phone}
            </a>
          </StickerButton>
        </div>
      </section>
    </Layout>
  );
}
