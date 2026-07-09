import { PRICE_INCLUDES } from "@/data/price-includes";
import { appEnv } from "@/lib/env";

type Variant = "dark" | "light";

const VARIANT_CLASSES: Record<Variant, { section: string; heading: string; title: string; body: string; icon: string }> = {
  dark: {
    section: "rounded-2xl border border-white/10 bg-white/5 p-6",
    heading: "text-white/60",
    title: "text-white",
    body: "text-white/70",
    icon: "text-[#ff3399]",
  },
  light: {
    section: "rounded-2xl border border-line bg-white p-6",
    heading: "text-inkSoft",
    title: "text-ink",
    body: "text-inkSoft",
    icon: "text-primaryDeep",
  },
};

/**
 * Content-driven "what's included" block — see src/data/price-includes.ts.
 * Gated behind VITE_SHOW_PRICE_INCLUDES (default off) until Carlos confirms
 * every line item is currently accurate. `variant` matches the host page's
 * theme — PuppyDetail/BreedLocation are dark, BreedDetail is light.
 */
export function PriceIncludes({ variant = "dark" }: { variant?: Variant }) {
  if (!appEnv.showPriceIncludes) return null;
  const c = VARIANT_CLASSES[variant];

  return (
    <section className={c.section}>
      <h2 className={`mb-4 text-sm font-bold uppercase tracking-wider ${c.heading}`}>
        Price Includes
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PRICE_INCLUDES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${c.icon}`} aria-hidden />
              <div>
                <div className={`font-semibold ${c.title}`}>{item.title}</div>
                <p className={`text-sm ${c.body}`}>{item.oneLiner}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
