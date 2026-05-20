import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/seo/Seo';
import { fetchActiveFaqItems, groupFaqBySection } from '@/lib/faq-api';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle } from 'lucide-react';
import { StickerButton } from '@/components/redesign/PublicDesignPrimitives';
import { GalacticHomeMiniFooter } from '@/components/home/GalacticHomeMiniFooter';
import { GalacticHomeNav, GALACTIC_HOME_SMS_HREF } from '@/components/home/GalacticHomeNav';
import { GalacticPawCanvas } from '@/components/GalacticPawCanvas';

const SECTION_ICONS: Record<string, string> = {
  deposits: '\uD83D\uDCB0',
  process: '\uD83D\uDCCB',
  pickup: '\uD83D\uDCC5',
  food_care: '\uD83C\uDF7D\uFE0F',
  health: '\uD83D\uDC89',
  first_days: '\uD83C\uDFE0',
};
const SECTION_DESCRIPTIONS: Record<string, string> = {
  deposits: 'Questions about our deposit process, payments, and securing your future puppy.',
  first_days: 'What to expect in the first days at home and how to settle your puppy in.',
  food_care: 'Daily feeding, care routines, and keeping your puppy healthy and comfortable.',
  health: 'Health records, vet checks, and care guidance from our team.',
  pickup: 'Pickup windows, travel timing, and preparing for go-home day.',
  process: 'How our overall process works, from inquiry to bringing your puppy home.',
};
const pageShellClass = 'min-h-screen bg-[#0f041b] text-white';
const containerClass = 'mx-auto max-w-screen-2xl px-6 md:px-8';
const sectionCardClass = 'rounded-3xl border border-white/10 bg-[#12051f]/90 backdrop-blur-xl';
const glossyStickerBaseClass =
  'group relative overflow-hidden rounded-3xl px-8 py-3 text-sm font-bold normal-case tracking-normal before:pointer-events-none before:absolute before:inset-x-3 before:top-1.5 before:h-[48%] before:rounded-full before:bg-white/25 before:blur-md before:content-[\'\']';
const pinkStickerClass =
  `${glossyStickerBaseClass} bg-[#ff3399] text-white shadow-[0_6px_0_#ff66b3,0_14px_30px_rgba(255,102,179,0.45)] hover:bg-[#ff1a8c] hover:shadow-[0_6px_0_#ff85c2,0_16px_34px_rgba(255,133,194,0.5)]`;

export default function FaqPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['faq-items'],
    queryFn: fetchActiveFaqItems,
  });

  const sections = groupFaqBySection(items);

  // Inject FAQPage JSON-LD structured data for SEO
  useEffect(() => {
    if (items.length === 0) return;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer.replace(/[*#\n]/g, ' ').trim(),
        },
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    // Remove existing if present
    document.getElementById('faq-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('faq-jsonld')?.remove();
    };
  }, [items]);

  return (
    <Layout bare>
      <Seo pageId="faq" />
      <div className={pageShellClass}>
        <GalacticHomeNav />

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-white/10 py-14 text-white md:py-20"
        style={{
          background: 'radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)',
        }}
      >
        <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
        <div className={`relative z-20 text-center ${containerClass}`}>
          <h1 className="mb-3 font-display text-4xl uppercase tracking-tight md:text-6xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            Everything you need to know about reserving a puppy, deposits, pickup,
            and caring for your new family member.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="border-b border-white/10 bg-[#0a0214] py-12 md:py-16">
        <div className={containerClass}>
        {isLoading ? (
          <div className={`${sectionCardClass} flex justify-center py-12`}>
            <div className="animate-pulse text-white/70">Loading FAQ...</div>
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-white/70 py-12">
            No FAQ items available yet. Check back soon!
          </p>
        ) : (
          <Tabs defaultValue={sections[0]?.key} className={`${sectionCardClass} p-3 md:p-4`}>
            <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
              <aside className="rounded-2xl border border-white/10 bg-[#12051f]/70 p-3">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#ff66b3]">FAQ Topics</p>
                <TabsList className="flex h-auto w-full flex-col gap-2 bg-transparent p-0">
                  {sections.map((section) => (
                    <TabsTrigger
                      key={section.key}
                      value={section.key}
                      className="w-full justify-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white/85 data-[state=active]:border-[#ff66b3]/70 data-[state=active]:bg-[#ff3399]/15 data-[state=active]:text-white"
                    >
                      <span>{SECTION_ICONS[section.key] ?? ''}</span>
                      <span className="truncate">{section.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="mt-4 rounded-xl border border-white/10 bg-[#0f0720]/80 p-3 text-center">
                  <p className="mb-2 font-semibold text-white">Still have questions?</p>
                  <p className="mb-3 text-sm text-white/70">We're happy to help.</p>
                  <StickerButton size="lg" className={pinkStickerClass} asChild>
                    <a href={GALACTIC_HOME_SMS_HREF} className="inline-flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Text us now
                    </a>
                  </StickerButton>
                </div>
              </aside>

              <div className="rounded-2xl border border-white/10 bg-[#12051f]/50 p-3 md:p-4">
                {sections.map((section) => (
                  <TabsContent key={section.key} value={section.key} className="mt-0 space-y-4">
                    <header className="border-b border-white/10 pb-3">
                      <h2 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
                        <span className="text-2xl">{SECTION_ICONS[section.key] ?? ''}</span>
                        {section.label}
                      </h2>
                      <p className="mt-2 text-white/70">
                        {SECTION_DESCRIPTIONS[section.key] ?? 'Helpful information for this topic.'}
                      </p>
                    </header>

                    <Accordion type="single" collapsible className="space-y-2">
                      {section.items.map((item) => (
                        <AccordionItem
                          key={item.id}
                          value={item.id}
                          className="rounded-xl border border-white/10 bg-[#171033]/80 px-4"
                        >
                          <AccordionTrigger className="text-left font-semibold text-white hover:no-underline">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="whitespace-pre-line pb-4 leading-relaxed text-white/80">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>
                ))}
              </div>
            </div>
          </Tabs>
        )}
        </div>
      </section>
      <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
