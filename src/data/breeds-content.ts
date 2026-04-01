import { appEnv } from '@/lib/env';

const SUPABASE_STORAGE_BASE =
  (appEnv.supabaseUrl ?? '').replace(/\/$/, '') +
  '/storage/v1/object/public/site-assets';

export interface BreedStats {
  intelligence: number;
  energy: number;
  grooming: number;
  familyFriendly: number;
  apartmentLiving: number;
}

export interface BreedCare {
  exercise: string;
  grooming: string;
  training: string;
}

export interface Breed {
  id: string;
  name: string;
  category: string;
  size: string;
  weight: string;
  height: string;
  lifespan: string;
  hypoallergenic: boolean;
  temperament: string;
  shortDesc: string;
  history: string;
  coolFact: string;
  idealFor: string[];
  stats: BreedStats;
  care: BreedCare;
  color: string;
  borderColor: string;
  accentColor: string;
  imageUrl: string;
}

export const BREEDS_DATA: Breed[] = [
  {
    id: 'toy-poodle',
    name: 'Toy Poodle',
    category: 'Poodle & Doodle',
    size: 'Small',
    weight: '4-6 lbs',
    height: 'Under 10"',
    lifespan: '12-15 years',
    hypoallergenic: true,
    temperament: 'Intelligent, Trainable, Active, Proud',
    shortDesc: 'Smart, Agile, Self-Confident',
    history:
      'While the Poodle is the national dog of France, it actually originated in Germany as a water retriever. The "Small" variety was bred in the early 20th century in England and America to be a city companion for affluent families who wanted a smaller, more portable version of the beloved Standard Poodle.',
    coolFact:
      'Poodles are remarkably athletic and were originally used for duck hunting in Germany. Their famous "pompom" haircut wasn\'t just for show—it was actually designed to protect their vital organs and joints in cold water while reducing drag when swimming!',
    idealFor: ['City dwellers', 'Apartment living', 'First-time owners', 'People with allergies'],
    stats: { intelligence: 98, energy: 70, grooming: 90, familyFriendly: 85, apartmentLiving: 95 },
    care: {
      exercise: '30-60 min daily',
      grooming: 'Professional every 4-6 weeks',
      training: 'Highly intelligent, needs mental stimulation',
    },
    color: 'bg-amber-100',
    borderColor: 'border-amber-400',
    accentColor: 'bg-amber-500',
    imageUrl: `${SUPABASE_STORAGE_BASE}/mini%20poodle.jpg`,
  },
  {
    id: 'standard-poodle',
    name: 'Standard Poodle',
    category: 'Poodle & Doodle',
    size: 'Large',
    weight: '45-70 lbs',
    height: 'Over 15"',
    lifespan: '12-15 years',
    hypoallergenic: true,
    temperament: 'Dignified, Intelligent, Athletic, Loyal',
    shortDesc: 'Elegant, Smart, Versatile',
    history:
      'One of the oldest breeds specifically developed for hunting waterfowl in Germany over 400 years ago. Their name comes from the German word "pudeln," which means "to splash in water." They were later refined in France, where they became the national dog and a symbol of elegance.',
    coolFact:
      'Standard Poodles rank as the 2nd most intelligent dog breed in the world! They\'re highly successful as service dogs, guide dogs, therapy dogs, and even circus performers due to their exceptional learning capacity.',
    idealFor: [
      'Active families',
      'Experienced owners',
      'Those with yards',
      'People with allergies',
    ],
    stats: { intelligence: 100, energy: 85, grooming: 95, familyFriendly: 95, apartmentLiving: 50 },
    care: {
      exercise: '60-90 min daily',
      grooming: 'Professional every 4-6 weeks',
      training: 'Needs consistent mental/physical stimulation',
    },
    color: 'bg-slate-100',
    borderColor: 'border-slate-400',
    accentColor: 'bg-slate-600',
    imageUrl: `${SUPABASE_STORAGE_BASE}/standard%20poodle.jpeg`,
  },
  {
    id: 'labradoodle',
    name: 'Labradoodle',
    category: 'Poodle & Doodle',
    size: 'Medium-Large',
    weight: '30-65 lbs',
    height: '14-24"',
    lifespan: '12-14 years',
    hypoallergenic: true,
    temperament: 'Friendly, Energetic, Goofy, Social',
    shortDesc: 'Playful, Loving, Energetic',
    history:
      'The Labradoodle was first popularized in 1989 by Australian breeder Wally Conron, who worked for the Royal Guide Dog Association. He wanted to create a hypoallergenic guide dog for a blind woman whose husband had severe allergies.',
    coolFact:
      'No two Labradoodles are exactly alike! Their coats can range from "hair" (straight), to "fleece" (soft waves), to "wool" (tight curls). The fleece coat is most sought-after and considered most hypoallergenic.',
    idealFor: [
      'Active families',
      'First-time owners',
      'People with allergies',
      'Social households',
    ],
    stats: { intelligence: 90, energy: 95, grooming: 75, familyFriendly: 98, apartmentLiving: 60 },
    care: {
      exercise: '60-90 min daily',
      grooming: 'Brush 2-3x weekly, pro groom 6-8 weeks',
      training: 'Easy to train, eager to please',
    },
    color: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    accentColor: 'bg-yellow-500',
    imageUrl: `${SUPABASE_STORAGE_BASE}/labordoodle.jpg`,
  },
  {
    id: 'goldendoodle',
    name: 'Goldendoodle',
    category: 'Poodle & Doodle',
    size: 'Medium-Large',
    weight: '30-70 lbs',
    height: '13-24"',
    lifespan: '10-15 years',
    hypoallergenic: true,
    temperament: 'Gentle, Patient, Social, Affectionate',
    shortDesc: 'Sweet, Loyal, Family-Oriented',
    history:
      'Appearing first in the 1990s, the Goldendoodle was bred to be the "ultimate" family dog, combining the Golden Retriever\'s legendary patience and loyalty with the Poodle\'s intelligence and low-shedding coat.',
    coolFact:
      'They\'re known as "Velcro dogs"—they love their humans so much they follow them room to room! Goldendoodles are exceptional therapy dogs due to their intuitive nature and ability to sense human emotions.',
    idealFor: ['Families with kids', 'Therapy work', 'First-time owners', 'Multi-pet homes'],
    stats: {
      intelligence: 92,
      energy: 80,
      grooming: 80,
      familyFriendly: 100,
      apartmentLiving: 65,
    },
    care: {
      exercise: '45-75 min daily',
      grooming: 'Brush 2-3x weekly, pro groom 6-8 weeks',
      training: 'Gentle positive reinforcement',
    },
    color: 'bg-orange-100',
    borderColor: 'border-orange-400',
    accentColor: 'bg-orange-500',
    imageUrl: `${SUPABASE_STORAGE_BASE}/goldendoodle.jpg`,
  },
  {
    id: 'shih-tzu',
    name: 'Shih Tzu',
    category: 'Small',
    size: 'Small',
    weight: '9-16 lbs',
    height: '8-11"',
    lifespan: '10-18 years',
    hypoallergenic: true,
    temperament: 'Affectionate, Happy, Outgoing, Loyal',
    shortDesc: 'Loving, Gentle, Regal',
    history:
      'Known as the "Lion Dog," Shih Tzus lived for centuries behind the walls of the Chinese Imperial Palace as treasured companions during the Ming Dynasty. Every Shih Tzu today can be traced back to just 14 dogs saved by European breeders.',
    coolFact:
      'Chinese Emperors kept these tiny dogs inside their sleeves to keep their hands warm during winter! The name "Shih Tzu" means "little lion" in Mandarin, referring to their lion-like appearance in Buddhist mythology.',
    idealFor: ['Seniors', 'Apartment dwellers', 'Low-energy homes', 'Gentle families'],
    stats: {
      intelligence: 55,
      energy: 30,
      grooming: 85,
      familyFriendly: 90,
      apartmentLiving: 100,
    },
    care: {
      exercise: '20-30 min daily',
      grooming: 'Daily brushing or puppy cut',
      training: 'Patient, gentle approach needed',
    },
    color: 'bg-rose-50',
    borderColor: 'border-rose-300',
    accentColor: 'bg-rose-400',
    imageUrl: `${SUPABASE_STORAGE_BASE}/shih%20tzu.jpg`,
  },
  {
    id: 'pomeranian',
    name: 'Pomeranian',
    category: 'Small',
    size: 'Small',
    weight: '3-7 lbs',
    height: '6-7"',
    lifespan: '12-16 years',
    hypoallergenic: false,
    temperament: 'Bold, Lively, Curious, Extroverted',
    shortDesc: 'Spirited, Alert, Confident',
    history:
      'Pomeranians were once 30-pound herding dogs in Germany and Poland. Queen Victoria fell in love with a small one in Italy in the 1800s, sparking a trend to breed them smaller. She reduced their size by 50% during her lifetime.',
    coolFact:
      "Michelangelo had a Pomeranian by his side while painting the Sistine Chapel! Despite their tiny size, Poms think they're much larger and will fearlessly protect their families. They've been owned by Mozart, Marie Antoinette, and more.",
    idealFor: ['Singles & couples', 'Seniors', 'City apartments', 'Alert watchdog seekers'],
    stats: {
      intelligence: 80,
      energy: 60,
      grooming: 85,
      familyFriendly: 75,
      apartmentLiving: 98,
    },
    care: {
      exercise: '20-30 min daily',
      grooming: 'Brush 2-3x weekly, seasonal shedding',
      training: 'Smart but independent',
    },
    color: 'bg-orange-50',
    borderColor: 'border-orange-300',
    accentColor: 'bg-orange-400',
    imageUrl: `${SUPABASE_STORAGE_BASE}/pomeranian.jpg`,
  },
  {
    id: 'maltese',
    name: 'Maltese',
    category: 'Small',
    size: 'Small',
    weight: '4-7 lbs',
    height: '7-9"',
    lifespan: '12-15 years',
    hypoallergenic: true,
    temperament: 'Gentle, Playful, Fearless, Affectionate',
    shortDesc: 'Elegant, Sweet, Devoted',
    history:
      'One of the oldest toy breeds, dating back 2,000 years to ancient Malta. Ancient Greeks built tombs for their Maltese dogs. Called "The Ye Ancient Dogge of Malta," they were treasured by aristocrats and royalty across Europe for centuries.',
    coolFact:
      "Maltese don't have an undercoat—they have hair like humans that grows continuously! Their pure white coat was so prized in ancient times that they were worth their weight in gold. Beloved by Mary Queen of Scots and Queen Elizabeth I.",
    idealFor: [
      'Seniors',
      'Apartment living',
      'Gentle lapdog lovers',
      'People with allergies',
    ],
    stats: {
      intelligence: 75,
      energy: 45,
      grooming: 95,
      familyFriendly: 85,
      apartmentLiving: 100,
    },
    care: {
      exercise: '20-30 min daily',
      grooming: 'Daily brushing or short puppy cut',
      training: 'Gentle positive methods',
    },
    color: 'bg-blue-50',
    borderColor: 'border-blue-300',
    accentColor: 'bg-blue-400',
    imageUrl: `${SUPABASE_STORAGE_BASE}/maltese.jpg`,
  },
];
