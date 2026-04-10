// src/lib/email/templates.ts
// Typed email template wrappers for Resend.
// DBA name: "Dream Puppies" (Build Rule #11)
// Breed description: "hobby breeding program" (Build Rule #12)

import type { DepositAgreement } from '@/types/deposit';

interface EmailTemplate {
  subject: string;
  html: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;border:1px solid #eee"><strong>${esc(label)}</strong></td><td style="padding:6px 12px;border:1px solid #eee">${esc(value)}</td></tr>`;
}

function table(rows: string): string {
  return `<table style="border-collapse:collapse;max-width:480px;margin:16px 0">${rows}</table>`;
}

function footer(): string {
  return '<p style="color:#888;font-size:12px;margin-top:24px">Dream Puppies — hobby breeding program</p>';
}

// --- Template 1: Buyer receives deposit submission confirmation ---
export function depositSubmissionReceived(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Deposit Received — Agreement ${a.agreement_number}`,
    html: `
      <h2>Your reservation request has been received</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Thank you for your interest in <strong>${esc(a.puppy_name)}</strong>. We've received your deposit agreement and will confirm availability within 48 hours.</p>
      ${table(
        row('Agreement #', a.agreement_number) +
        row('Puppy', a.puppy_name) +
        row('Deposit Amount', `$${a.deposit_amount.toFixed(2)}`) +
        row('Payment Method', a.deposit_payment_method) +
        row('Proposed Pickup', a.proposed_pickup_date)
      )}
      <p>We'll be in touch shortly. If you have questions, please reply to this email.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 2: Admin receives new deposit alert ---
export function newDepositAdminAlert(a: DepositAgreement): EmailTemplate {
  return {
    subject: `New Deposit Submitted: ${a.agreement_number} — ${a.buyer_name}`,
    html: `
      <h2>New deposit agreement submitted</h2>
      ${table(
        row('Agreement #', a.agreement_number) +
        row('Buyer', a.buyer_name) +
        row('Email', a.buyer_email) +
        row('Puppy', a.puppy_name) +
        row('Deposit', `$${a.deposit_amount.toFixed(2)}`) +
        row('Tier', a.deposit_tier === 'pre_8_weeks' ? '1/4 (pre-8 weeks)' : '1/3 (post-8 weeks)') +
        row('Method', a.deposit_payment_method) +
        row('Pickup', a.proposed_pickup_date)
      )}
      <p>Review this agreement in the admin dashboard.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 3: Buyer notified of deposit confirmation ---
export function depositConfirmedBuyer(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Deposit Confirmed — Agreement ${a.agreement_number}`,
    html: `
      <h2>Your deposit has been confirmed!</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Great news! Your deposit for <strong>${esc(a.puppy_name)}</strong> has been confirmed and your reservation is secured.</p>
      ${table(
        row('Agreement #', a.agreement_number) +
        row('Deposit', `$${a.deposit_amount.toFixed(2)}`) +
        row('Balance Due', `$${a.balance_due.toFixed(2)}`) +
        row('Pickup Date', a.confirmed_pickup_date ?? a.proposed_pickup_date)
      )}
      <p>We'll be in touch as your pickup date approaches with final payment instructions.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 4: Buyer notified of deposit rejection ---
export function depositRejectedBuyer(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Deposit Update — Agreement ${a.agreement_number}`,
    html: `
      <h2>Deposit agreement update</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Unfortunately, we are unable to process your deposit for <strong>${esc(a.puppy_name)}</strong> at this time.</p>
      ${a.rejection_reason ? `<p><strong>Reason:</strong> ${esc(a.rejection_reason)}</p>` : ''}
      <p>If a payment was submitted, a full refund will be issued. Please reply to this email with any questions.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 5: Buyer notified of refund ---
export function depositRefundedBuyer(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Refund Processed — Agreement ${a.agreement_number}`,
    html: `
      <h2>Your deposit has been refunded</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>A refund has been issued for your deposit on <strong>${esc(a.puppy_name)}</strong>.</p>
      ${table(
        row('Agreement #', a.agreement_number) +
        row('Refund Amount', `$${a.deposit_amount.toFixed(2)}`)
      )}
      ${a.rejection_reason ? `<p><strong>Reason:</strong> ${esc(a.rejection_reason)}</p>` : ''}
      <p>Please allow 3-5 business days for the refund to appear. Reply to this email with any questions.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 6: Buyer notified of pickup date counter-proposal ---
export function pickupDateCounter(a: DepositAgreement, newDate: string): EmailTemplate {
  return {
    subject: `Pickup Date Update — Agreement ${a.agreement_number}`,
    html: `
      <h2>Pickup date update</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>We'd like to suggest an alternative pickup date for <strong>${esc(a.puppy_name)}</strong>:</p>
      ${table(
        row('Original Date', a.proposed_pickup_date) +
        row('Suggested Date', newDate)
      )}
      <p>Please reply to this email to confirm the new date or suggest an alternative.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 7: Buyer receives final payment instructions ---
export function finalPaymentInstructions(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Final Payment Due — Agreement ${a.agreement_number}`,
    html: `
      <h2>Final payment instructions</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Your pickup date for <strong>${esc(a.puppy_name)}</strong> is approaching! Here are your final payment details:</p>
      ${table(
        row('Balance Due', `$${a.balance_due.toFixed(2)}`) +
        row('Pickup Date', a.confirmed_pickup_date ?? a.proposed_pickup_date) +
        row('Payment Memo', a.payment_memo)
      )}
      <p>Please submit your final payment before your pickup date. Include the payment memo with your transaction.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 8: Buyer notified final payment confirmed ---
export function finalPaymentConfirmed(a: DepositAgreement): EmailTemplate {
  return {
    subject: `Payment Complete — Agreement ${a.agreement_number}`,
    html: `
      <h2>Final payment confirmed!</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Your final payment for <strong>${esc(a.puppy_name)}</strong> has been confirmed. You're all set for pickup!</p>
      ${table(
        row('Pickup Date', a.confirmed_pickup_date ?? a.proposed_pickup_date)
      )}
      <p>We'll send your Pet Guide shortly with everything you need to know about caring for your new puppy.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 9: Pet guide delivery ---
export function petGuideDelivery(a: DepositAgreement, guideUrl: string): EmailTemplate {
  return {
    subject: `Your Pet Guide — ${a.puppy_name}`,
    html: `
      <h2>Your Pet Guide is ready!</h2>
      <p>Hi ${esc(a.buyer_name)},</p>
      <p>Congratulations on your new puppy! Here is your personalized Pet Guide for <strong>${esc(a.puppy_name)}</strong>.</p>
      <p><a href="${esc(guideUrl)}" style="display:inline-block;padding:12px 24px;background:#1a1a2e;color:#fff;text-decoration:none;border-radius:6px">Download Pet Guide</a></p>
      <p>This guide includes care instructions, feeding schedules, and health information for your puppy.</p>
      ${footer()}
    `.trim(),
  };
}

// --- Template 10: Admin pending deposit reminder ---
export function pendingDepositReminderAdmin(a: DepositAgreement, reminderCount: number): EmailTemplate {
  return {
    subject: `Pending Deposit Reminder (${reminderCount}/5): ${a.agreement_number}`,
    html: `
      <h3>Pending deposit requires attention</h3>
      ${table(
        row('Agreement #', a.agreement_number) +
        row('Buyer', a.buyer_name) +
        row('Puppy', a.puppy_name) +
        row('Deposit', `$${a.deposit_amount.toFixed(2)}`) +
        row('Method', a.deposit_payment_method) +
        row('Reminder', `${reminderCount} of 5`)
      )}
      <p>This deposit has been pending for more than 24 hours. Please review in the admin dashboard.</p>
      ${footer()}
    `.trim(),
  };
}
