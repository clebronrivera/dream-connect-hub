/** Breed options for Puppy Interest Form (multi-select) */
export const BREED_PREFERENCE_OPTIONS = [
  { value: "Toy Poodle", labelKey: "forms.puppyInterest.options.breeds.toyPoodle" },
  { value: "Standard Poodle", labelKey: "forms.puppyInterest.options.breeds.standardPoodle" },
  { value: "Labradoodle", labelKey: "forms.puppyInterest.options.breeds.labradoodle" },
  { value: "Goldendoodle", labelKey: "forms.puppyInterest.options.breeds.goldendoodle" },
  { value: "Shih Tzu", labelKey: "forms.puppyInterest.options.breeds.shihTzu" },
  { value: "Pomeranian", labelKey: "forms.puppyInterest.options.breeds.pomeranian" },
  { value: "Maltese", labelKey: "forms.puppyInterest.options.breeds.maltese" },
  { value: "No Preference", labelKey: "forms.puppyInterest.options.breeds.noPreference" },
] as const;

export const SIZE_PREFERENCE_OPTIONS = [
  { value: "small", labelKey: "forms.puppyInterest.options.sizes.small" },
  { value: "medium", labelKey: "forms.puppyInterest.options.sizes.medium" },
  { value: "large", labelKey: "forms.puppyInterest.options.sizes.large" },
  { value: "no_preference", labelKey: "forms.puppyInterest.options.sizes.noPreference" },
] as const;

export const GENDER_PREFERENCE_OPTIONS = [
  { value: "Male", labelKey: "forms.puppyInterest.options.gender.male" },
  { value: "Female", labelKey: "forms.puppyInterest.options.gender.female" },
  { value: "No Preference", labelKey: "forms.puppyInterest.options.gender.noPreference" },
] as const;

export const TIMELINE_OPTIONS = [
  { value: "within_2_weeks", labelKey: "forms.puppyInterest.options.timeline.within2Weeks" },
  { value: "within_1_month", labelKey: "forms.puppyInterest.options.timeline.within1Month" },
  { value: "within_2_3_months", labelKey: "forms.puppyInterest.options.timeline.within2to3Months" },
  { value: "3_6_months", labelKey: "forms.puppyInterest.options.timeline.within3to6Months" },
  { value: "6_plus_months", labelKey: "forms.puppyInterest.options.timeline.over6Months" },
  { value: "just_browsing", labelKey: "forms.puppyInterest.options.timeline.justBrowsing" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "yes_raised", labelKey: "forms.puppyInterest.options.experience.raised" },
  { value: "some", labelKey: "forms.puppyInterest.options.experience.some" },
  { value: "first_time", labelKey: "forms.puppyInterest.options.experience.firstTime" },
  { value: "prefer_not", labelKey: "forms.puppyInterest.options.experience.preferNot" },
] as const;

export const HOW_HEARD_OPTIONS = [
  { value: "instagram", labelKey: "forms.puppyInterest.options.howHeard.instagram" },
  { value: "facebook", labelKey: "forms.puppyInterest.options.howHeard.facebook" },
  { value: "referred", labelKey: "forms.puppyInterest.options.howHeard.referred" },
  { value: "flyer", labelKey: "forms.puppyInterest.options.howHeard.flyer" },
  { value: "craigslist", labelKey: "forms.puppyInterest.options.howHeard.craigslist" },
  { value: "puppies_com", labelKey: "forms.puppyInterest.options.howHeard.puppiesCom" },
  { value: "google", labelKey: "forms.puppyInterest.options.howHeard.google" },
  { value: "other", labelKey: "forms.puppyInterest.options.howHeard.other" },
] as const;

export const VIEWING_PREFERENCE_OPTIONS = [
  { value: "in_person", labelKey: "forms.puppyInterest.options.viewing.inPerson" },
  { value: "virtual", labelKey: "forms.puppyInterest.options.viewing.virtual" },
  { value: "photos_fine", labelKey: "forms.puppyInterest.options.viewing.photosFine" },
  { value: "not_sure", labelKey: "forms.puppyInterest.options.viewing.notSure" },
] as const;
