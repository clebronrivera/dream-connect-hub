/** Canonical subject value for upcoming litter waitlist/deposit inquiries (DB + UI). */
export const SUBJECT_UPCOMING_LITTER = "Upcoming Litter";

/** Subject value for Contact page dropdown: puppy interest. */
export const SUBJECT_PUPPY_INQUIRY = "puppies";

/** Subject value for Contact page URL: other / consultation. */
export const SUBJECT_OTHER_CONSULTATION = "other-consultation";

/** URL slug for upcoming litter (routes, tabs, search params). */
export const SLUG_UPCOMING_LITTER = "upcoming-litter";

/** URL slug for puppy inquiries (admin Inquiries tab / Dashboard links). */
export const SLUG_PUPPY_INQUIRY = "puppy-inquiry";

/** URL slug for general contact messages (admin Inquiries tab / Dashboard links). */
export const SLUG_CONTACT_MESSAGE = "contact-message";

/** CTA label for the button on upcoming litter cards and consistent wording in UI. */
export const JOIN_WAITLIST_AND_INQUIRE_ABOUT_DEPOSIT =
  "Join waitlist and inquire about deposit";

/** New CTA label: direct deposit reservation request (replaces inquiry flow on litter cards). */
export const REQUEST_DEPOSIT_RESERVATION = "Request a Deposit Reservation";

/** Subject/source label used in admin views for deposit requests. */
export const SUBJECT_DEPOSIT_REQUEST = "Deposit Request";

/** URL slug for deposit requests. */
export const SLUG_DEPOSIT_REQUEST = "deposit-request";

/** Display source labels used in Dashboard recent inquiries. */
export type InquirySourceLabel = "Puppy Inquiry" | "Upcoming Litter" | "Contact Message";

/** Alias for Dashboard/Inquiries. */
export type RecentInquirySource = InquirySourceLabel;

/** Map Dashboard source label to URL slug (Inquiries tab + openId). */
export function sourceToSlug(source: InquirySourceLabel): string {
  switch (source) {
    case "Puppy Inquiry":
      return SLUG_PUPPY_INQUIRY;
    case "Upcoming Litter":
      return SLUG_UPCOMING_LITTER;
    case "Contact Message":
      return SLUG_CONTACT_MESSAGE;
    default:
      return SLUG_CONTACT_MESSAGE;
  }
}

/** Submission status for inquiry tables (active | inactive). */
export type SubmissionStatus = "active" | "inactive";

/** Admin list filter: show all, only active, or only inactive. */
export type StatusFilter = "all" | "active" | "inactive";
