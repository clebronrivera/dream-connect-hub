/** Breed options for Puppy Interest Form (multi-select) */
export const BREED_PREFERENCE_OPTIONS = [
  { value: "Toy Poodle", label: "Toy Poodle" },
  { value: "Standard Poodle", label: "Standard Poodle" },
  { value: "Labradoodle", label: "Labradoodle" },
  { value: "Goldendoodle", label: "Goldendoodle" },
  { value: "Shih Tzu", label: "Shih Tzu" },
  { value: "Pomeranian", label: "Pomeranian" },
  { value: "Maltese", label: "Maltese" },
  { value: "No Preference", label: "No Preference" },
] as const;

export const SIZE_PREFERENCE_OPTIONS = [
  { value: "small", label: "Small (Under 15 lbs)" },
  { value: "medium", label: "Medium (15-40 lbs)" },
  { value: "large", label: "Large (40+ lbs)" },
  { value: "no_preference", label: "No Preference" },
] as const;

export const GENDER_PREFERENCE_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "No Preference", label: "No Preference" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "within_2_weeks", label: "Within 2 weeks" },
  { value: "within_1_month", label: "Within 1 month" },
  { value: "within_2_3_months", label: "Within 2-3 months" },
  { value: "3_6_months", label: "3-6 months" },
  { value: "6_plus_months", label: "6+ months" },
  { value: "just_browsing", label: "Just browsing" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "yes_raised", label: "Yes, I've raised puppies before" },
  { value: "some", label: "Some experience with dogs" },
  { value: "first_time", label: "First-time dog owner" },
  { value: "prefer_not", label: "Prefer not to say" },
] as const;

export const HOW_HEARD_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "referred", label: "Referred by friend" },
  { value: "flyer", label: "Flyer" },
  { value: "craigslist", label: "Craigslist" },
  { value: "puppies_com", label: "Puppies.com" },
  { value: "google", label: "Google Search" },
  { value: "other", label: "Other" },
] as const;

export const VIEWING_PREFERENCE_OPTIONS = [
  { value: "in_person", label: "In-person visit" },
  { value: "virtual", label: "Virtual FaceTime/video call" },
  { value: "photos_fine", label: "Photos/videos are fine" },
  { value: "not_sure", label: "Not sure yet" },
] as const;
