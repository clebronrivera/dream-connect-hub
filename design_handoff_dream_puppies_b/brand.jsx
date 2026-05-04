// Shared design tokens, primitives, and seed data for Dream Puppies redesign.
// Three directions consume these. Variables are the same; expression varies.

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "palette": "lavender",
  "density": "comfortable",
  "showStorybookGrain": true
}/*EDITMODE-END*/;

// ----- Palettes (HSL-friendly, anchored on the lavender direction the user picked) -----
const PALETTES = {
  lavender: {
    bg: "#FAF6FF",
    surface: "#FFFFFF",
    ink: "#2D2A4A",
    inkSoft: "#5A5478",
    primary: "#7C5CFF",        // a vivid violet, more confident than #A78BFA
    primarySoft: "#E4DBFF",
    accent: "#FBCFE8",          // bubblegum pink
    accentDeep: "#EC4899",
    sun: "#FFD66B",
    leaf: "#86E6B7",
    line: "#E8E0F5",
  },
};

const PALETTE = PALETTES.lavender;

// ----- Seed data: puppies, litters, breeds, reviews -----
// Two real available puppies + 30 reserved spots across 5 upcoming litters.
const PUPPIES_AVAILABLE = [
  {
    id: "p1", name: "Biscuit", breed: "Mini Goldendoodle", sex: "Male",
    weeks: 9, color: "Apricot", price: 3200, status: "Available",
    location: "Orlando, FL", personality: "Cuddly couch potato with zoomies on demand",
    hue: 28,
  },
  {
    id: "p2", name: "Juniper", breed: "Mini Poodle", sex: "Female",
    weeks: 11, color: "Red", price: 3800, status: "Available",
    location: "Raeford, NC", personality: "Tiny diva who thinks she runs the house",
    hue: 12,
  },
];

// Reserved/Sold to make grid feel populated
const PUPPIES_PAST = [
  { id: "g1", name: "Mochi", breed: "Mini Goldendoodle", sex: "Female", weeks: 12, color: "Cream", status: "Reserved", hue: 38 },
  { id: "g2", name: "Pebble", breed: "Labradoodle", sex: "Male", weeks: 10, color: "Chocolate", status: "Reserved", hue: 18 },
  { id: "g3", name: "Olive", breed: "Mini Poodle", sex: "Female", weeks: 13, color: "Black", status: "Sold", hue: 260 },
  { id: "g4", name: "Hazel", breed: "Shih Tzu", sex: "Female", weeks: 9, color: "Gold", status: "Sold", hue: 45 },
];

const UPCOMING_LITTERS = [
  {
    id: "L1", title: "Coral & Atlas",
    breed: "Mini Goldendoodle",
    parentsHue: [28, 38],
    expectedColor: "Apricot to red — sometimes a touch of cream",
    sizeNote: "Adults 18–28 lb. Sizes vary due to genetics.",
    dueDate: "May 18, 2026",
    readyDate: "Ready home Jul 13",
    spots: 8, reserved: 3,
  },
  {
    id: "L2", title: "Poppy & Finch",
    breed: "Mini Poodle",
    parentsHue: [12, 18],
    expectedColor: "Red, with possible apricot variation",
    sizeNote: "Adults 12–18 lb. Sizes vary due to genetics.",
    dueDate: "Jun 02, 2026",
    readyDate: "Ready home Jul 28",
    spots: 6, reserved: 1,
  },
  {
    id: "L3", title: "Willow & Bash",
    breed: "Labradoodle",
    parentsHue: [22, 28],
    expectedColor: "Chocolate to caramel — possible cream",
    sizeNote: "Adults 30–55 lb. Sizes vary due to genetics.",
    dueDate: "Jun 15, 2026",
    readyDate: "Ready home Aug 10",
    spots: 7, reserved: 2,
  },
  {
    id: "L4", title: "Sage & Rumi",
    breed: "Shih Tzu",
    parentsHue: [40, 50],
    expectedColor: "Gold and white",
    sizeNote: "Adults 9–16 lb. Sizes vary due to genetics.",
    dueDate: "Jul 04, 2026",
    readyDate: "Ready home Aug 29",
    spots: 5, reserved: 0,
  },
  {
    id: "L5", title: "Indigo & Pip",
    breed: "Mini Goldendoodle",
    parentsHue: [260, 30],
    expectedColor: "Apricot, possible parti",
    sizeNote: "Adults 18–28 lb. Sizes vary due to genetics.",
    dueDate: "Jul 22, 2026",
    readyDate: "Ready home Sep 16",
    spots: 6, reserved: 1,
  },
];

const BREEDS = [
  { name: "Mini Goldendoodle", weight: "18–28 lb", coat: "Curly · Wavy", energy: 4, grooming: 4, family: 5, hue: 32, hypo: true,
    blurb: "Sunshine in a fluff coat. Endlessly cheerful and family-glued." },
  { name: "Labradoodle", weight: "30–55 lb", coat: "Wavy · Curly", energy: 5, grooming: 4, family: 5, hue: 28, hypo: true,
    blurb: "The original family doodle. Patient, playful, in for the long haul." },
  { name: "Mini Poodle", weight: "12–18 lb", coat: "Curly", energy: 3, grooming: 5, family: 5, hue: 16, hypo: true,
    blurb: "Tiny scholar. Trains in a single session and nags you to repeat." },
  { name: "Shih Tzu", weight: "9–16 lb", coat: "Long", energy: 2, grooming: 5, family: 5, hue: 50, hypo: true,
    blurb: "Built for laps, purpose-engineered for nap synchrony." },
];

const REVIEWS = [
  { name: "The Alvarez Family", city: "Tampa, FL", breed: "Mini Goldendoodle",
    quote: "Biscuit chose us before we chose her. The Lebron-Rivera family treated us like in-laws from day one.",
    stars: 5 },
  { name: "Marcus & Dee", city: "Charlotte, NC", breed: "Mini Poodle",
    quote: "Their training plan saved our furniture and probably our marriage. Worth every dollar.",
    stars: 5 },
  { name: "Priya N.", city: "Orlando, FL", breed: "Labradoodle",
    quote: "Three months of weekly photos and updates before pickup. We knew her better than half our cousins.",
    stars: 5 },
  { name: "The Okafor-Bennetts", city: "Raeford, NC", breed: "Shih Tzu",
    quote: "Real vet records. Real microchip. Real warranty. After two scammy breeders this felt like a miracle.",
    stars: 5 },
];

const FAQS = [
  { q: "Where are the puppies raised?", a: "In our home, underfoot. We're family-operated across Orlando, FL and Charlotte, NC — never a kennel, never a barn." },
  { q: "What's included with a puppy?", a: "AKC paperwork where applicable, microchip, age-appropriate vaccines, vet check, two-year genetic health guarantee, starter food, blanket scented with mom, and a 7-day text-anytime onboarding." },
  { q: "Can I reserve before the litter is born?", a: "Yes — that's exactly how upcoming litters work. A $500 deposit holds your spot and goes toward the total." },
  { q: "What does a deposit actually do?", a: "Locks your pick order. First deposit picks first, second picks second, and so on. Refundable up to two weeks before pickup if a health issue is found." },
  { q: "Do you ship?", a: "We ground-transport via certified pet courier within the southeast. For everywhere else, we strongly prefer you fly to meet your puppy in cabin." },
  { q: "Will the puppy be hypoallergenic?", a: "All our breeds are low-shed and considered hypoallergenic, but no dog is 100%. We recommend a meet-and-greet first." },
];

const ESSENTIALS_KITS = [
  { name: "First-Night Kit", price: 89, includes: ["Mom-scented blanket", "Starter food (2 wks)", "Slow feeder", "Pee pads x20"], hue: 30 },
  { name: "Crate Training Kit", price: 149, includes: ["36in crate divider", "Calming insert", "Chew safe lick mat", "Training cheat sheet"], hue: 220 },
  { name: "Walk Ready Kit", price: 119, includes: ["Step-in harness", "Hands-free leash", "Treat pouch", "Reflective tag"], hue: 140 },
  { name: "Forever Kit", price: 249, includes: ["Everything above", "Snuffle mat", "Grooming starter set", "First-vet stipend"], hue: 280 },
];

// ----- Primitives -----

function PuppyPlaceholder({ hue = 30, breed = "puppy", size = 220, accent = "#7C5CFF", ear = 0 }) {
  // Procedural illustrated puppy "portrait" using SVG. Not a photo — a rendering.
  // hue drives the coat color; ear toggles floppy/perky.
  const coat = `hsl(${hue} 55% 72%)`;
  const coatDeep = `hsl(${hue} 50% 56%)`;
  const muzzle = `hsl(${hue} 30% 88%)`;
  const id = `pp-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} style={{ display: "block" }} aria-label={`${breed} placeholder rendering`}>
      <defs>
        <radialGradient id={`bg-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={accent} stopOpacity="0.04"/>
        </radialGradient>
      </defs>
      <rect width="220" height="220" rx="24" fill={`url(#bg-${id})`}/>
      {/* body */}
      <ellipse cx="110" cy="170" rx="68" ry="36" fill={coatDeep}/>
      {/* head */}
      <circle cx="110" cy="108" r="62" fill={coat}/>
      {/* ears */}
      {ear === 0 ? (
        <>
          <ellipse cx="62" cy="92" rx="22" ry="38" fill={coatDeep} transform="rotate(-18 62 92)"/>
          <ellipse cx="158" cy="92" rx="22" ry="38" fill={coatDeep} transform="rotate(18 158 92)"/>
        </>
      ) : (
        <>
          <path d="M58 60 L78 78 L62 102 Z" fill={coatDeep}/>
          <path d="M162 60 L142 78 L158 102 Z" fill={coatDeep}/>
        </>
      )}
      {/* muzzle */}
      <ellipse cx="110" cy="130" rx="34" ry="24" fill={muzzle}/>
      {/* eyes */}
      <circle cx="90" cy="105" r="6" fill="#1a1530"/>
      <circle cx="130" cy="105" r="6" fill="#1a1530"/>
      <circle cx="92" cy="103" r="2" fill="#fff"/>
      <circle cx="132" cy="103" r="2" fill="#fff"/>
      {/* nose */}
      <ellipse cx="110" cy="124" rx="7" ry="5" fill="#1a1530"/>
      {/* mouth */}
      <path d="M110 130 Q104 138 100 134" stroke="#1a1530" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M110 130 Q116 138 120 134" stroke="#1a1530" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* paws */}
      <circle cx="78" cy="198" r="11" fill={coat}/>
      <circle cx="142" cy="198" r="11" fill={coat}/>
      {/* cheek blush */}
      <circle cx="78" cy="120" r="6" fill={accent} opacity="0.3"/>
      <circle cx="142" cy="120" r="6" fill={accent} opacity="0.3"/>
    </svg>
  );
}

function Sparkle({ size = 14, fill = "#FFD66B" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "inline-block" }}>
      <path d="M12 2 L13.6 9.4 L21 12 L13.6 14.6 L12 22 L10.4 14.6 L3 12 L10.4 9.4 Z" fill={fill}/>
    </svg>
  );
}

function Squiggle({ width = 120, color = "#7C5CFF", thickness = 3 }) {
  return (
    <svg viewBox="0 0 120 18" width={width} height={width * 0.15} style={{ display: "block" }}>
      <path d="M2 9 Q 15 1, 30 9 T 60 9 T 90 9 T 118 9" stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function PawIcon({ size = 16, fill = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} style={{display:"inline-block",verticalAlign:"middle"}}>
      <ellipse cx="6" cy="9" rx="2.2" ry="2.8"/>
      <ellipse cx="12" cy="6" rx="2.2" ry="2.8"/>
      <ellipse cx="18" cy="9" rx="2.2" ry="2.8"/>
      <ellipse cx="9" cy="13" rx="2" ry="2.5"/>
      <ellipse cx="15" cy="13" rx="2" ry="2.5"/>
      <path d="M12 14 C 7 14 6 18 9 20 C 11 21 13 21 15 20 C 18 18 17 14 12 14 Z"/>
    </svg>
  );
}

// Expose to other Babel scripts
Object.assign(window, {
  PALETTE, PALETTES,
  PUPPIES_AVAILABLE, PUPPIES_PAST,
  UPCOMING_LITTERS, BREEDS, REVIEWS, FAQS, ESSENTIALS_KITS,
  PuppyPlaceholder, Sparkle, Squiggle, PawIcon,
});
