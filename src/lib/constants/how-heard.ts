/** "How did you hear about us?" dropdown options for the deposit request form. */
export const HOW_HEARD_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "facebook_group", label: "Facebook group" },
  { value: "google", label: "Google search" },
  { value: "bing", label: "Bing" },
  { value: "website_direct", label: "Found our website directly" },
  { value: "word_of_mouth", label: "Word of mouth" },
  { value: "referred_by_buyer", label: "Referred by a previous buyer" },
  { value: "previous_buyer", label: "Previously bought from us" },
  { value: "other", label: "Other" },
] as const;

export type HowHeardValue = (typeof HOW_HEARD_OPTIONS)[number]["value"];

/** Options that show the "Who referred you?" follow-up input. */
export const HOW_HEARD_REFERRAL_VALUES: HowHeardValue[] = ["referred_by_buyer"];
