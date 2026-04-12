// src/lib/constants/trainingPlan.ts
// Training plan problem types, SEO metadata, and form options.

export const PROBLEM_TYPES = [
  {
    key: 'potty_training',
    label: 'Potty Training',
    slug: 'potty-training',
    icon: '🏠',
    seoTitle: 'Free Puppy Potty Training Plan — Dream Puppies',
    seoDescription: 'Get a free personalized potty training plan for your puppy. Step-by-step guidance based on your dog\'s breed, age, and living situation.',
    intro: 'Struggling with accidents? Our AI-powered tool creates a custom potty training plan tailored to your puppy.',
  },
  {
    key: 'biting_nipping',
    label: 'Biting & Nipping',
    slug: 'biting',
    icon: '🦷',
    seoTitle: 'Stop Puppy Biting — Free Training Plan | Dream Puppies',
    seoDescription: 'Get a personalized plan to stop puppy biting and nipping. Positive reinforcement methods tailored to your dog.',
    intro: 'Puppy teeth are sharp! Get a custom plan to redirect biting behavior with positive methods.',
  },
  {
    key: 'crate_training',
    label: 'Crate Training',
    slug: 'crate-training',
    icon: '📦',
    seoTitle: 'Crate Training Your Puppy — Free Plan | Dream Puppies',
    seoDescription: 'Free personalized crate training plan. Teach your puppy to love their crate with our step-by-step guide.',
    intro: 'Make the crate a safe space your puppy loves. Get a custom crate training schedule.',
  },
  {
    key: 'excessive_barking',
    label: 'Excessive Barking',
    slug: 'barking',
    icon: '🔊',
    seoTitle: 'Stop Excessive Barking — Free Training Plan | Dream Puppies',
    seoDescription: 'Personalized plan to manage your dog\'s excessive barking. Breed-specific tips and positive techniques.',
    intro: 'Barking driving you crazy? Get targeted advice based on your dog\'s breed and triggers.',
  },
  {
    key: 'separation_anxiety',
    label: 'Separation Anxiety',
    slug: 'separation-anxiety',
    icon: '💔',
    seoTitle: 'Puppy Separation Anxiety Help — Free Plan | Dream Puppies',
    seoDescription: 'Get a free personalized plan to help your puppy with separation anxiety. Gradual desensitization methods.',
    intro: 'Help your pup feel confident when alone with a step-by-step desensitization plan.',
  },
  {
    key: 'leash_pulling',
    label: 'Leash Pulling',
    slug: 'leash-pulling',
    icon: '🐕',
    seoTitle: 'Stop Leash Pulling — Free Training Plan | Dream Puppies',
    seoDescription: 'Free personalized plan to stop your dog from pulling on the leash. Enjoy stress-free walks.',
    intro: 'Walks should be enjoyable! Get a custom plan to teach loose-leash walking.',
  },
  {
    key: 'jumping_on_people',
    label: 'Jumping on People',
    slug: 'jumping',
    icon: '⬆️',
    seoTitle: 'Stop Dog Jumping — Free Training Plan | Dream Puppies',
    seoDescription: 'Personalized plan to teach your dog not to jump on people. Positive reinforcement methods.',
    intro: 'Teach your pup polite greetings with a personalized plan.',
  },
  {
    key: 'not_coming_when_called',
    label: 'Recall Training',
    slug: 'recall',
    icon: '📣',
    seoTitle: 'Teach Your Dog to Come — Free Recall Plan | Dream Puppies',
    seoDescription: 'Free personalized recall training plan. Build a reliable "come" command with proven methods.',
    intro: 'A reliable recall can save your dog\'s life. Get a custom training plan.',
  },
] as const;

export type ProblemTypeKey = (typeof PROBLEM_TYPES)[number]['key'];

export function getProblemTypeBySlug(slug: string) {
  return PROBLEM_TYPES.find((p) => p.slug === slug);
}

export function getProblemTypeByKey(key: string) {
  return PROBLEM_TYPES.find((p) => p.key === key);
}

export const LIVING_SITUATIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house_yard', label: 'House with Yard' },
  { value: 'house_no_yard', label: 'House without Yard' },
  { value: 'roommate', label: 'Shared / Roommate' },
  { value: 'single_room', label: 'Single Room' },
  { value: 'farm', label: 'Farm / Rural' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'first_time', label: 'First-time Owner' },
  { value: 'some', label: 'Some Experience' },
  { value: 'experienced', label: 'Experienced' },
] as const;

export const TIME_OPTIONS = [
  { value: '5min', label: '5 minutes' },
  { value: '10min', label: '10 minutes' },
  { value: '15min', label: '15 minutes' },
  { value: '30min', label: '30 minutes' },
  { value: '45min', label: '45 minutes' },
  { value: '1hr', label: '1 hour' },
  { value: '2hr_plus', label: '2+ hours' },
] as const;

export const FREQUENCY_OPTIONS = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
  { value: 'always', label: 'Always / Daily' },
] as const;

export const WEIGHT_RANGES = [
  { value: 'under_5', label: 'Under 5 lbs' },
  { value: '5_10', label: '5–10 lbs' },
  { value: '10_20', label: '10–20 lbs' },
  { value: '20_30', label: '20–30 lbs' },
  { value: '30_50', label: '30–50 lbs' },
  { value: '50_plus', label: '50+ lbs' },
] as const;

export const DOG_LOCATION_OPTIONS = [
  { value: 'inside', label: 'Mostly Inside' },
  { value: 'outside', label: 'Mostly Outside' },
  { value: 'both', label: 'Both' },
] as const;

export const YES_NO_UNSURE = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not Sure' },
] as const;
