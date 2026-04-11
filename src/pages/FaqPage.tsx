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
      <section className="bg-primary/5 py-12 md:py-16">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
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
          <Tabs defaultValue={sections[0]?.key} className="max-w-3xl mx-auto">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-8">
              {sections.map((section) => (
                <TabsTrigger
                  key={section.key}
                  value={section.key}
                  className="text-xs sm:text-sm px-3 py-2"
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
                      className="border rounded-lg px-4"
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
      <section className="bg-muted/30 py-10">
        <div className="container text-center">
          <p className="text-muted-foreground mb-2">
            Still have questions? We're happy to help.
          </p>
          <a
            href={`tel:${BUSINESS.phoneRaw}`}
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <Phone className="h-4 w-4" />
            {BUSINESS.phone}
          </a>
        </div>
      </section>
    </Layout>
  );
}
