// All email templates for Dream Puppies. Each template returns { subject, html }.
// HTML always wraps its body with wrap() from layout.ts for consistent branding.

import { BRAND, COLORS, FONT_STACK } from "./brand.ts";
import {
  button,
  callout,
  divider,
  escape,
  heading,
  paragraph,
  rawParagraph,
  row,
  table,
} from "./components.ts";
import { wrap } from "./layout.ts";

export interface EmailTemplate {
  subject: string;
  html: string;
}

const money = (n: number | string | null | undefined): string => {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  return `$${num.toFixed(2)}`;
};

// ──────────────────────────────────────────────────────────────
// CUSTOMER-FACING TEMPLATES
// ──────────────────────────────────────────────────────────────

// O1 — Deposit request received (customer ack)
export function depositRequestReceived(args: {
  customerName: string;
  litterLabel: string;
}): EmailTemplate {
  const body =
    heading("We received your deposit request") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `Thanks for your interest in ${args.litterLabel}. We've received your deposit request and will review it within 24–48 hours. Once approved, we'll email you a secure link to complete the deposit agreement.`
    ) +
    rawParagraph(
      `Questions in the meantime? Reply to this email or call us at <strong>${escape(
        BRAND.phone
      )}</strong>.`
    );
  return {
    subject: "We received your deposit request — Dream Puppies",
    html: wrap({
      previewText: "We'll review your request within 24–48 hours.",
      bodyHtml: body,
    }),
  };
}

// O2 — Contact form received (customer ack)
export function contactReceived(args: {
  customerName: string;
  subject?: string | null;
}): EmailTemplate {
  const body =
    heading("Thanks for reaching out") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `We got your message${
        args.subject ? ` about "${args.subject}"` : ""
      } and will get back to you as soon as we can — usually within a day or two.`
    ) +
    rawParagraph(
      `If it's urgent, give us a call at <strong>${escape(BRAND.phone)}</strong>.`
    );
  return {
    subject: "We got your message — Dream Puppies",
    html: wrap({
      previewText: "Thanks for reaching out — we'll reply soon.",
      bodyHtml: body,
    }),
  };
}

// O3 — Training plan delivery (customer)
// planHtml is a pre-rendered section containing plan content. Caller is
// responsible for building it with the components module (NOT raw user HTML).
export function trainingPlanDelivery(args: {
  customerName: string;
  dogName: string;
  planHtml: string;
}): EmailTemplate {
  const body =
    heading(`Your training plan for ${args.dogName}`) +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `Here's the personalized training plan for ${args.dogName}. Save this email so you can come back to it anytime.`
    ) +
    args.planHtml +
    paragraph(
      `Questions or want a follow-up? Reply to this email — we're happy to help.`
    );
  return {
    subject: `Your training plan for ${args.dogName} — Dream Puppies`,
    html: wrap({
      previewText: `A step-by-step training plan for ${args.dogName}.`,
      bodyHtml: body,
    }),
  };
}

// O4 — Deposit request accepted (link coming shortly)
export function depositRequestAccepted(args: {
  customerName: string;
  litterLabel: string;
}): EmailTemplate {
  const body =
    heading("Your request was approved") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `Good news — your deposit request for ${args.litterLabel} has been approved. We'll follow up shortly with a secure link to complete the deposit agreement.`
    ) +
    paragraph(
      `No action needed from you yet — just watch your inbox over the next day or so.`
    );
  return {
    subject: "Your deposit request was approved — Dream Puppies",
    html: wrap({
      previewText: "Your deposit agreement link is coming soon.",
      bodyHtml: body,
    }),
  };
}

// Deposit request declined
export function depositRequestDeclined(args: {
  customerName: string;
  litterLabel: string;
  reason?: string | null;
}): EmailTemplate {
  const body =
    heading("An update on your deposit request") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `Thanks again for your interest in ${args.litterLabel}. We're not able to move forward with this request at this time.`
    ) +
    (args.reason
      ? rawParagraph(`<strong>Note from us:</strong> ${escape(args.reason)}`)
      : "") +
    paragraph(
      `If you'd like to chat about other litters or upcoming availability, just reply to this email or give us a call.`
    );
  return {
    subject: "Update on your deposit request — Dream Puppies",
    html: wrap({
      previewText: "An update on your recent deposit request.",
      bodyHtml: body,
    }),
  };
}

// Deposit link (replaces inline HTML in send-deposit-link)
export function depositLinkSent(args: {
  customerName: string;
  litterLabel: string;
  depositAmount: number;
  depositLink: string;
  customMessage?: string | null;
}): EmailTemplate {
  const body =
    heading("Your deposit reservation is ready") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `Great news — your deposit request for ${args.litterLabel} has been approved. To secure your spot, please complete the deposit agreement form at the link below.`
    ) +
    button("Complete Deposit Agreement", args.depositLink) +
    rawParagraph(
      `Or copy this link into your browser:<br/><a href="${args.depositLink}" style="color:${COLORS.primary};word-break:break-all;">${escape(args.depositLink)}</a>`
    ) +
    table(
      row("Litter", args.litterLabel) +
        row(
          "Deposit amount",
          `${money(args.depositAmount)} (non-refundable once agreement is signed)`
        )
    ) +
    (args.customMessage ? callout(args.customMessage) : "") +
    rawParagraph(
      `This link is valid for your reservation request only. Questions? Call us at <strong>${escape(BRAND.phone)}</strong>.`
    );
  return {
    subject: "Your Dream Puppies Deposit Agreement Link",
    html: wrap({
      previewText: "Complete your deposit agreement to secure your spot.",
      bodyHtml: body,
    }),
  };
}

// O12 — Deposit receipt (fires when admin confirms payment received,
// BEFORE admin signature / finalization)
export function depositReceipt(args: {
  customerName: string;
  agreementNumber: string;
  puppyName: string;
  depositAmount: number;
  paymentMethod: string;
  paymentMemo?: string | null;
  confirmedAt: string; // ISO or display string
}): EmailTemplate {
  const body =
    heading("Payment received — your deposit is confirmed") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      `We received your deposit for ${args.puppyName}. Here's your receipt for your records. We'll countersign the agreement next and send you a final confirmation shortly.`
    ) +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Puppy", args.puppyName) +
        row("Amount paid", money(args.depositAmount)) +
        row("Payment method", args.paymentMethod) +
        (args.paymentMemo ? row("Memo", args.paymentMemo) : "") +
        row("Confirmed", args.confirmedAt)
    ) +
    paragraph(
      `Keep this email as your payment receipt. Your spot is now held while we finalize paperwork on our side.`
    );
  return {
    subject: `Deposit Receipt — Agreement ${args.agreementNumber}`,
    html: wrap({
      previewText: "Your deposit payment was received — receipt attached.",
      bodyHtml: body,
    }),
  };
}

// Finalization confirmation (buyer side) — replaces inline HTML in finalize-agreement
export function agreementFinalizedBuyer(args: {
  buyerName: string;
  agreementNumber: string;
  puppyName: string;
  depositAmount: number;
  balanceDue: number;
  pickupDate: string;
  /** Wave F5 — signed PDF download link. Optional; omitted if PDF generation failed. */
  downloadUrl?: string;
}): EmailTemplate {
  const body =
    heading("Your agreement is finalized") +
    paragraph(`Hi ${args.buyerName},`) +
    paragraph(
      `Wonderful news — your deposit agreement for ${args.puppyName} is now fully signed and finalized. Here are the key details:`
    ) +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Deposit paid", money(args.depositAmount)) +
        row("Balance due", money(args.balanceDue)) +
        row("Pickup date", args.pickupDate)
    ) +
    (args.downloadUrl
      ? button("Download Your Agreement PDF", args.downloadUrl) +
        paragraph(
          `This download link is active for 30 days. Each click opens a fresh 1-hour download window.`
        )
      : "") +
    paragraph(
      `We'll be in touch as your pickup date approaches with final payment instructions and pickup details.`
    );
  return {
    subject: `Deposit Confirmed — Agreement ${args.agreementNumber}`,
    html: wrap({
      previewText: "Your agreement is finalized — here are the next steps.",
      bodyHtml: body,
    }),
  };
}

// Puppy interest inquiry received (customer ack)
// Fills the gap in notify-puppy-inquiry which previously only emailed admins.
export function puppyInquiryReceived(args: {
  customerName: string;
  interestedPuppy?: string | null;
  breedPrefs?: string | null;
}): EmailTemplate {
  const highlight =
    args.interestedPuppy
      ? callout(`You expressed interest in: ${escape(args.interestedPuppy)}`)
      : args.breedPrefs
        ? callout(`Breed preference: ${escape(args.breedPrefs)}`)
        : "";

  const body =
    heading("Thanks for your interest") +
    paragraph(`Hi ${args.customerName},`) +
    paragraph(
      "We received your puppy interest form and wanted to make sure you heard from us right away. " +
      "Our team reviews every inquiry personally and will be in touch soon to learn more about what you're looking for."
    ) +
    highlight +
    paragraph(
      "In the meantime, feel free to reach out — we love talking puppies."
    ) +
    rawParagraph(
      `Call us anytime at <strong>${escape(BRAND.phone)}</strong> or simply reply to this email.`
    );
  return {
    subject: "Thanks for your interest — Dream Puppies",
    html: wrap({
      previewText: "We received your puppy interest form — we'll be in touch soon.",
      bodyHtml: body,
    }),
  };
}

// New owner / puppy care guide (admin-triggered post-finalization)
export function puppyGuideDelivery(args: {
  buyerName: string;
  puppyName: string;
  breed?: string | null;
  pickupDate?: string | null;
}): EmailTemplate {
  const breedPhrase = args.breed ? `, a beautiful ${escape(args.breed)},` : "";
  const pickupRow = args.pickupDate
    ? table(row("Pickup date", args.pickupDate))
    : "";

  const body =
    heading("Welcome to the Dream Puppies family") +
    paragraph(`Hi ${args.buyerName},`) +
    paragraph(
      `We are so thrilled that ${escape(args.puppyName)}${breedPhrase} is going home with you. ` +
      "This is the beginning of an incredible journey together, and we couldn't be happier for you both."
    ) +
    pickupRow +
    heading(`Care Guide for ${escape(args.puppyName)}`, 2) +
    heading("Feeding", 3) +
    paragraph(
      `Keep ${escape(args.puppyName)} on the same food they've been eating for at least the first two weeks — ` +
      "sudden food changes can upset a young puppy's stomach. If you'd like to switch foods, transition " +
      "gradually over 7–10 days by mixing in increasing amounts of the new food. Puppies need three small " +
      "meals per day until around 6 months old."
    ) +
    heading("First Vet Visit", 3) +
    paragraph(
      "Schedule a wellness exam within 72 hours of pickup. Bring any health records and vaccination paperwork " +
      "we provided. Your vet will verify the health certificate, confirm the vaccine schedule, and answer any " +
      "breed-specific questions you have."
    ) +
    heading("Potty Training", 3) +
    paragraph(
      `Take ${escape(args.puppyName)} outside immediately after waking up, after every meal, and after play sessions. ` +
      "Reward every success with calm, warm praise. Consistency at this stage makes a huge difference — most " +
      "puppies get the hang of it within a few weeks when the schedule is predictable."
    ) +
    heading("Socialization", 3) +
    paragraph(
      "The first 16 weeks are the most critical socialization window of your puppy's life. Introduce them " +
      "gently to new sights, sounds, people, and environments. Keep early experiences positive and low-stress — " +
      "a little exposure now builds confidence that lasts a lifetime."
    ) +
    heading("Crating & Sleep", 3) +
    paragraph(
      "A crate is your puppy's safe den, not a punishment. Cover it with a blanket to create a cozy space " +
      "and place a worn t-shirt inside so they have your scent nearby. For the first few nights, keep the " +
      "crate close to your bed — the proximity helps them settle faster and builds trust."
    ) +
    rawParagraph(
      `Questions anytime? Call us at <strong>${escape(BRAND.phone)}</strong> or email ` +
      `<a href="mailto:${escape(BRAND.email)}" style="color:${COLORS.primary};">${escape(BRAND.email)}</a>. ` +
      `We always love hearing how ${escape(args.puppyName)} is doing.`
    );
  return {
    subject: `Welcome to the Dream Puppies family — care guide for ${args.puppyName}`,
    html: wrap({
      previewText: `Your care guide for ${args.puppyName} — welcome to the family!`,
      bodyHtml: body,
    }),
  };
}

// Testimonial / story invitation (admin-triggered to past buyers)
export function testimonialInvitation(args: {
  buyerName: string;
  puppyName: string;
  reviewPageUrl: string;
}): EmailTemplate {
  const body =
    heading(`How is ${escape(args.puppyName)} doing?`) +
    paragraph(`Hi ${args.buyerName},`) +
    paragraph(
      `It's been a little while since ${escape(args.puppyName)} went home with you, and we'd love to know how things are going. ` +
      "We hope your journey together has been everything you hoped for."
    ) +
    paragraph(
      "If you've enjoyed your experience with Dream Puppies, would you consider sharing your story on our " +
      "Dreamy Reviews page? Families just like yours help other dog lovers know what to expect — and we truly " +
      "cherish every word."
    ) +
    button("Share Your Story", args.reviewPageUrl) +
    callout(
      `What to include: How did you find us? What is ${args.puppyName}'s personality like now? ` +
      "Any photos are always welcome — we'd love to see them grow!"
    ) +
    paragraph(
      "No pressure at all — but know that your story means the world to us and to future Dream Puppies families."
    ) +
    rawParagraph(
      `As always, reach us at <strong>${escape(BRAND.phone)}</strong> if you ever need anything.`
    );
  return {
    subject: `How is ${args.puppyName} doing? We'd love to share your story`,
    html: wrap({
      previewText: `We'd love to hear how ${args.puppyName} is doing — share your story`,
      bodyHtml: body,
    }),
  };
}

// Newsletter (admin-composed, sent to opted-in subscribers)
export function newsletter(args: {
  subject: string;
  headline: string;
  bodyParagraphs: string[];
  ctaText?: string | null;
  ctaUrl?: string | null;
  closingNote?: string | null;
}): EmailTemplate {
  const paragraphsHtml = args.bodyParagraphs.map((p) => paragraph(p)).join("");
  const ctaHtml =
    args.ctaText && args.ctaUrl ? button(args.ctaText, args.ctaUrl) : "";
  const closingHtml = args.closingNote ? paragraph(args.closingNote) : "";

  const body =
    heading(args.headline) +
    paragraphsHtml +
    ctaHtml +
    closingHtml +
    divider() +
    rawParagraph(
      `You're receiving this because you opted in when you submitted a puppy inquiry. ` +
      `To unsubscribe, reply to this email or contact us at ` +
      `<a href="mailto:${escape(BRAND.email)}" style="color:${COLORS.muted};">${escape(BRAND.email)}</a>.`
    );
  return {
    subject: args.subject,
    html: wrap({
      previewText: args.headline.slice(0, 90),
      bodyHtml: body,
    }),
  };
}

// ──────────────────────────────────────────────────────────────
// ADMIN-FACING TEMPLATES
// ──────────────────────────────────────────────────────────────

export function adminNewPuppyInquiry(args: {
  customerName: string;
  rowsHtml: string; // pre-built row() strings
}): EmailTemplate {
  const body =
    heading("New puppy inquiry") +
    paragraph(`From ${args.customerName}.`) +
    table(args.rowsHtml);
  return {
    subject: `New puppy inquiry from ${args.customerName}`,
    html: wrap({
      previewText: "A new public puppy inquiry just came in.",
      bodyHtml: body,
    }),
  };
}

export function adminNewContactMessage(args: {
  customerName: string;
  subject: string;
  message: string;
  rowsHtml: string;
}): EmailTemplate {
  const body =
    heading("New contact message") +
    paragraph(`From ${args.customerName} — "${args.subject}"`) +
    table(args.rowsHtml) +
    heading("Message", 3) +
    callout(args.message);
  return {
    subject: `Contact Us: ${args.subject} from ${args.customerName}`,
    html: wrap({
      previewText: args.subject,
      bodyHtml: body,
    }),
  };
}

export function adminNewDepositRequest(args: {
  customerName: string;
  rowsHtml: string;
  reviewLink: string;
}): EmailTemplate {
  const body =
    heading("New deposit request") +
    paragraph(`${args.customerName} just submitted a deposit request.`) +
    table(args.rowsHtml) +
    button("Review in admin dashboard", args.reviewLink);
  return {
    subject: `Deposit Request from ${args.customerName}`,
    html: wrap({
      previewText: "A new deposit request needs review.",
      bodyHtml: body,
    }),
  };
}

export function adminAgreementFinalized(args: {
  agreementNumber: string;
  buyerName: string;
  puppyName: string;
}): EmailTemplate {
  const body =
    heading("Agreement finalized") +
    paragraph(
      `Agreement ${args.agreementNumber} for ${args.buyerName} / ${args.puppyName} is now fully finalized.`
    );
  return {
    subject: `Agreement Finalized: ${args.agreementNumber}`,
    html: wrap({ bodyHtml: body }),
  };
}

export function adminPendingDepositReminder(args: {
  agreementNumber: string;
  buyerName: string;
  puppyName: string;
  depositAmount: number;
  paymentMethod: string;
  reminderCount: number;
}): EmailTemplate {
  const body =
    heading("Pending deposit needs attention") +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Buyer", args.buyerName) +
        row("Puppy", args.puppyName) +
        row("Deposit", money(args.depositAmount)) +
        row("Method", args.paymentMethod) +
        row("Reminder", `${args.reminderCount} of 5`)
    ) +
    paragraph(
      `This deposit has been pending for more than 24 hours. Please review in the admin dashboard.`
    );
  return {
    subject: `Pending Deposit Reminder (${args.reminderCount}/5): ${args.agreementNumber}`,
    html: wrap({ bodyHtml: body }),
  };
}

export function adminManualReviewRequired(args: {
  agreementNumber: string;
  buyerName: string;
  puppyName: string;
}): EmailTemplate {
  const body =
    heading("Manual review required") +
    paragraph(
      `Agreement ${args.agreementNumber} for ${args.buyerName} / ${args.puppyName} has hit the 5-reminder cap. Please follow up manually.`
    );
  return {
    subject: `Manual Review Required: ${args.agreementNumber}`,
    html: wrap({ bodyHtml: body }),
  };
}

// Wave D D4: fires from notify-agreement-submitted when a deposit_agreements
// row is inserted. Gives the buyer their persistent payment-dashboard link
// so they can return after closing the tab — the dashboard URL only lives
// in the address bar after the redirect-on-submit, and that's lost the
// moment the buyer closes the tab.
export function agreementSubmittedBuyer(args: {
  buyerName: string;
  agreementNumber: string;
  puppyName: string;
  depositAmount: number;
  paymentMethod: string;
  paymentMemo: string;
  paymentLink: string;
}): EmailTemplate {
  const body =
    heading("Your reservation is in") +
    paragraph(`Hi ${args.buyerName},`) +
    paragraph(
      `Your deposit agreement for ${args.puppyName} (Agreement ${args.agreementNumber}) is signed. Below is your link to send the deposit and watch its status — bookmark it; the same link works for 30 days.`
    ) +
    button("Open my payment dashboard", args.paymentLink) +
    rawParagraph(
      `Or copy this link into your browser:<br/><a href="${args.paymentLink}" style="color:${COLORS.primary};word-break:break-all;">${escape(args.paymentLink)}</a>`
    ) +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Puppy", args.puppyName) +
        row("Deposit amount", money(args.depositAmount)) +
        row("Payment method", args.paymentMethod) +
        row("Memo to include", args.paymentMemo)
    ) +
    rawParagraph(
      `This link is active for 30 days. After that, call us at <strong>${escape(BRAND.phone)}</strong> and we'll send a fresh one.`
    );
  return {
    subject: `Your Dream Puppies reservation — ${args.agreementNumber}`,
    html: wrap({
      previewText: "Your payment dashboard link — bookmark for the next 30 days.",
      bodyHtml: body,
    }),
  };
}

// Wave D D3: fires from mark-payment-sent when the buyer clicks
// "I have sent payment" on /payment/<id>/<token>. Operator should watch
// the chosen payment app for an incoming transfer matching the memo.
export function adminBuyerMarkedPaymentSent(args: {
  agreementNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  puppyName: string;
  depositAmount: number;
  paymentMethod: string;
  paymentMemo: string;
}): EmailTemplate {
  const body =
    heading("Buyer says payment sent") +
    paragraph(
      `${args.buyerName} just clicked "I have sent payment" on the buyer dashboard for ${args.puppyName} (Agreement ${args.agreementNumber}). Watch your ${args.paymentMethod} for an incoming transfer matching the memo string below; once it lands, confirm payment received in /admin/agreements.`
    ) +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Buyer", args.buyerName) +
        row("Email", args.buyerEmail) +
        (args.buyerPhone ? row("Phone", args.buyerPhone) : "") +
        row("Puppy", args.puppyName) +
        row("Method", args.paymentMethod) +
        row("Amount expected", money(args.depositAmount)) +
        row("Memo to look for", args.paymentMemo)
    );
  return {
    subject: `Buyer says payment sent — ${args.agreementNumber}`,
    html: wrap({
      previewText: `${args.buyerName} marked payment sent for ${args.puppyName}.`,
      bodyHtml: body,
    }),
  };
}

export function adminNewTrainingLead(args: {
  customerEmail: string;
  dogName: string;
  breed: string;
  problemType: string;
}): EmailTemplate {
  const body =
    heading("New training plan lead") +
    table(
      row("Email", args.customerEmail) +
        row("Dog name", args.dogName) +
        row("Breed", args.breed) +
        row("Problem type", args.problemType)
    );
  return {
    subject: `New training plan lead: ${args.customerEmail}`,
    html: wrap({ bodyHtml: body }),
  };
}

// Wave H phase 2 — pickup-day handover complete (welcome home).
// Sent by finalize-pickup-handover after the operator completes the
// in-person ID check, photo capture, and signatures at /admin/pickup.
export function pickupCompleteBuyer(args: {
  buyerName: string;
  puppyName: string;
  agreementNumber: string;
  pickupDate: string;
  /** Google Business Profile place ID. Omit/undefined until Carlos claims the
   *  profile (GOOGLE_PLACE_ID edge function secret) — the review CTA is
   *  skipped entirely rather than linking to a non-existent listing. */
  googlePlaceId?: string | null;
}): EmailTemplate {
  const reviewUrl = args.googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(args.googlePlaceId)}`
    : null;
  const body =
    heading(`Welcome home, ${escape(args.puppyName)}!`) +
    paragraph(`Hi ${args.buyerName},`) +
    paragraph(
      `It was wonderful to send ${escape(args.puppyName)} home with you today. Pickup is complete and your file is officially closed on our end — congratulations on your new family member.`
    ) +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Pickup date", args.pickupDate)
    ) +
    paragraph(
      `Watch your inbox for the new owner care guide we send out separately, and please don't hesitate to reach out with any questions as you settle in together.`
    ) +
    (reviewUrl
      ? paragraph(
          `If ${escape(args.puppyName)} has made you smile today, a quick Google review means the world to a small, family-run breeder like us.`
        ) + button("Leave us a review", reviewUrl)
      : "") +
    rawParagraph(
      `If you'd like to share photos or testimonials, we always love hearing how things are going — just reply to this email or call us at <strong>${escape(BRAND.phone)}</strong>.`
    );
  return {
    subject: `Welcome home — ${args.puppyName} pickup complete`,
    html: wrap({
      previewText: `${args.puppyName} is home — thanks for choosing Dream Puppies.`,
      bodyHtml: body,
    }),
  };
}

export function adminPickupCompleted(args: {
  agreementNumber: string;
  buyerName: string;
  puppyName: string;
  pickupDate: string;
  staffInitials?: string | null;
}): EmailTemplate {
  const body =
    heading("Pickup handover complete") +
    table(
      row("Agreement #", args.agreementNumber) +
        row("Buyer", args.buyerName) +
        row("Puppy", args.puppyName) +
        row("Pickup date", args.pickupDate) +
        row("Staff initials", args.staffInitials ?? "—")
    ) +
    paragraph(
      `The pickup_handovers row is now in_person_verified. Photos, ID last-4 + state, and signatures are stored under pickup-evidence/. The puppy has been transitioned to Sold.`
    );
  return {
    subject: `Pickup complete — ${args.agreementNumber} (${args.puppyName})`,
    html: wrap({ bodyHtml: body }),
  };
}

// Phase 6.4 — own-property waitlist notification. Fires when a puppy flips
// to Available and matches a waitlist_signups row on breed/size.
export function waitlistPuppyMatch(args: {
  puppyName: string;
  breed: string;
  puppyUrl: string;
}): EmailTemplate {
  const body =
    heading(`A ${escape(args.breed)} puppy is available!`) +
    paragraph(
      `You joined our waitlist for a ${escape(args.breed)} — ${escape(args.puppyName)} just became available and might be the one.`
    ) +
    button(`Meet ${args.puppyName}`, args.puppyUrl) +
    rawParagraph(
      `Reach out soon — Available puppies are placed on a first-reserved basis. Questions? Call or text us at <strong>${escape(BRAND.phone)}</strong>.`
    );
  return {
    subject: `${args.puppyName} — a ${args.breed} puppy just became available`,
    html: wrap({
      previewText: `${args.puppyName} the ${args.breed} is available now.`,
      bodyHtml: body,
    }),
  };
}

// Suppress unused-import warnings in environments that lint unused symbols.
export const _unused = { FONT_STACK };
