import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/seo/Seo';
import { fetchActiveFaqItems, groupFaqBySection } from '@/lib/faq-api';
import { BUSINESS } from '@/lib/constants/business';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone } from 'lucide-react';
import { DreamTag, StickerButton } from '@/components/redesign/PublicDesignPrimitives';

const SECTION_ICONS: Record<string, string> = {
  deposits: '\uD83D\uDCB0',
  process: '\uD83D\uDCCB',
  pickup: '\uD83D\uDCC5',
  food_care: '\uD83C\uDF7D\uFE0F',
  health: '\uD83D\uDC89',
  first_days: '\uD83C\uDFE0',
};

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
    <Layout>
      <Seo
        title="FAQ — Dream Puppies"
        description="Frequently asked questions about deposits, pricing, pickup, health, and care from Dream Puppies — a family hobby breeding program in Florida and North Carolina."
        canonicalPath="/faq"
      />

      {/* Hero */}
      <section className="bg-bg py-14 text-white md:py-20">
        <div className="container text-center">
          <DreamTag className="mb-3 bg-sun">Family answers, plain-spoken</DreamTag>
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
      <section className="container py-12 md:py-16">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading FAQ...</div>
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No FAQ items available yet. Check back soon!
          </p>
        ) : (
          <Tabs defaultValue={sections[0]?.key} className="mx-auto max-w-3xl">
            <TabsList className="mb-8 flex h-auto flex-wrap gap-1 bg-muted/50 p-1">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  className="px-3 py-2 text-xs uppercase tracking-[0.04em] sm:text-sm"
                >
                  <span className="mr-1.5">{SECTION_ICONS[section.key] ?? ''}</span>
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key}>
                <Accordion type="single" collapsible className="space-y-2">
                  {section.items.map((item) => (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="rounded-lg border border-line px-4"
                    >
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground whitespace-pre-line leading-relaxed pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </section>

      {/* Contact CTA */}
      <section className="bg-paper py-10">
        <div className="container text-center">
          <p className="mb-2 text-muted-foreground">
            Still have questions? We're happy to help.
          </p>
          <StickerButton asChild className="font-bold uppercase tracking-[0.06em]">
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
