import { useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { GalacticHomeNav } from "@/components/home/GalacticHomeNav";
import { GalacticHomeMiniFooter } from "@/components/home/GalacticHomeMiniFooter";
import { GalacticPawCanvas } from "@/components/GalacticPawCanvas";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";

const pageShellClass = "min-h-screen bg-[#0f041b] text-white";
const containerClass = "mx-auto max-w-screen-2xl px-6 md:px-8";

export default function About() {
  const businessInfo = useBusinessInfoOrDefaults();

  useEffect(() => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://puppyheavenllc.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'About',
          item: 'https://puppyheavenllc.com/about',
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    script.textContent = JSON.stringify(jsonLd);

    document.getElementById('breadcrumb-jsonld')?.remove();
    document.head.appendChild(script);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
    };
  }, []);

  return (
    <Layout bare>
      <Seo pageId="about" />
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
            <h1 className="mx-auto mb-4 max-w-4xl font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              About Dream Puppies
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-white/80 md:text-xl">
              Dedicated to raising happy, healthy puppies for families in Orlando, FL and Raeford, NC.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 bg-[#0a0214] py-14 md:py-16">
          <div className={containerClass}>
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold md:text-3xl">Our Mission</h2>
                <p className="text-base leading-relaxed text-white/80">
                  At Dream Puppies, we believe every family deserves a companion that brings joy, loyalty, and unconditional love. Our mission is to breed healthy, well-socialized puppies with excellent temperaments, ensuring they thrive in their forever homes across Florida and North Carolina.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold md:text-3xl">Our Standards</h2>
                <p className="text-base leading-relaxed text-white/80">
                  We raise our puppies using gentle, evidence-based methods in family environments. Every puppy is health-tested, socialized from day one, and sent home with comprehensive care guides and lifetime support. We stand behind every Dream Puppies companion with a health guarantee and our commitment to responsible breeding.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold md:text-3xl">Serving Our Communities</h2>
                <p className="text-base leading-relaxed text-white/80">
                  Based in Orlando, Florida and Raeford, North Carolina, we're conveniently located to serve families throughout the Southeast. Whether you're local or planning to travel, we offer transparent communication, flexible scheduling, and personalized support to help you bring your new family member home.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="font-display text-2xl font-bold md:text-3xl">Your Questions, Our Answers</h2>
                <p className="text-base leading-relaxed text-white/80">
                  Ready to learn more about a puppy? Call us at <a href={`tel:+1${businessInfo.phoneRaw}`} className="text-white font-semibold hover:text-white/80 transition-colors">{businessInfo.phone}</a> or explore our available puppies and upcoming litters. We're here to answer every question and ensure you find the perfect Dream Puppy for your family.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GalacticHomeMiniFooter />
      </div>
    </Layout>
  );
}
