// src/lib/constants/deposit.ts
// Deposit constants — SOURCE OF TRUTH for all deposit calculations.
// Do not hardcode these values anywhere else in the codebase.

// Flat deposit amount used when no per-puppy override is set.
// Override path: puppies.deposit_amount (set by operator in OperatorReviewForm — Wave C).
export const DEFAULT_DEPOSIT_AMOUNT = 300;

// Age threshold in days for go-home / pickup-clock calculations.
export const PUPPY_GO_HOME_AGE_DAYS = 56; // 8 weeks = 56 days

// Maximum days after go-home date before reservation is forfeited (no written extension)
export const PICKUP_DEADLINE_DAYS = 14;

// Hours after deposit submission before admin rejection window closes
export const BREEDER_REJECTION_WINDOW_HOURS = 48;

// Hours before a pending deposit triggers the first admin reminder
export const PENDING_REMINDER_TRIGGER_HOURS = 24;

// Max number of automatic reminders before flagging for manual review
export const REMINDER_MAX_COUNT = 5;

// Agreement number prefix
export const AGREEMENT_NUMBER_PREFIX = 'DP';

// Authorized sellers — re-exported from business.ts (single source of truth)
export {
  AUTHORIZED_SELLERS,
  DEFAULT_AUTHORIZED_SELLER,
  type AuthorizedSellerId,
} from './business';

// Payment methods — SINGLE SOURCE OF TRUTH
export const PAYMENT_METHODS = [
  { key: 'zelle',     label: 'Zelle',      requiresManualConfirm: false },
  { key: 'venmo',     label: 'Venmo',      requiresManualConfirm: false },
  { key: 'cashapp',   label: 'Cash App',   requiresManualConfirm: false },
  { key: 'apple_pay', label: 'Apple Pay',  requiresManualConfirm: false },
  { key: 'square',    label: 'Square',     requiresManualConfirm: true  },
  { key: 'cash',      label: 'Cash',       requiresManualConfirm: true  },
  { key: 'split',     label: 'Split Payment', requiresManualConfirm: false },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]['key'];

// Deposit status enum — matches Supabase column values exactly
export const DEPOSIT_STATUS = {
  PENDING:          'pending',
  ADMIN_CONFIRMED:  'admin_confirmed',
  REJECTED:         'rejected',
  REFUNDED:         'refunded',
} as const;

// Agreement status enum — matches Supabase column values exactly.
// Lifecycle marker for buyer signing is buyer_signed_at (timestamp), not status —
// agreement_status never transitions to 'buyer_signed' (value retired in Wave A5).
export const AGREEMENT_STATUS = {
  SENT:           'sent',
  ADMIN_APPROVED: 'admin_approved',
  COMPLETE:       'complete',
  CANCELLED:      'cancelled',
} as const;
