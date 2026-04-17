// All email templates for Dream Puppies. Each template returns { subject, html }.
// HTML always wraps its body with wrap() from layout.ts for consistent branding.

import { BRAND, COLORS, FONT_STACK } from "./brand.ts";
import {
  button,
  callout,
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

// Suppress unused-import warnings in environments that lint unused symbols.
export const _unused = { FONT_STACK };
