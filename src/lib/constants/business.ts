// src/lib/constants/business.ts
// Business identity — SINGLE SOURCE OF TRUTH for all brand, contact, and legal references.
// Import from here. Never hardcode business names, phone numbers, or legal links elsewhere.

export const BUSINESS = {
  legalName: 'Dream Enterprises LLC',
  contractDbaName: 'Dream Puppies',
  primaryBrand: 'Dream Puppies',
  secondaryBrand: 'Puppy Heaven',
  website: 'puppyheavenllc.com',
  email: 'Dreampuppies22@gmail.com',
  phone: '(321) 697-8864',
  phoneRaw: '3216978864',
  tagline: 'Where every pup gets a dream start.',
  programType: 'Hobby Breeding Program',
  footerLine: 'Dream Enterprises LLC — DBA Dream Puppies / Puppy Heaven · Florida',
  state: 'Florida',
  locations: [
    { city: 'Orlando', state: 'Florida', isPrimary: true },
    { city: 'Raeford', state: 'North Carolina', isPrimary: false },
  ],
} as const;

export const AUTHORIZED_SELLERS = [
  { id: 'carlos_lebron_rivera', initials: 'CLR', name: 'Carlos Lebron Rivera' },
  { id: 'yolanda_lebron_rivera', initials: 'YLR', name: 'Yolanda Lebron Rivera' },
] as const;

export type AuthorizedSellerId = (typeof AUTHORIZED_SELLERS)[number]['id'];

/**
 * Default seller used when the customer-facing form does not ask the buyer
 * to pick one. Kept so the DB NOT-NULL/CHECK constraint on
 * `deposit_agreements.authorized_seller` is always satisfied.
 */
export const DEFAULT_AUTHORIZED_SELLER: AuthorizedSellerId = 'carlos_lebron_rivera';

export const LEGAL_REFERENCES = {
  FLA_828_29: 'https://www.flsenate.gov/Laws/Statutes/2024/828.29',
  FLA_CH_668: 'https://www.flsenate.gov/Laws/Statutes/2024/Chapter668',
  FLA_CH_682: 'https://www.flsenate.gov/Laws/Statutes/2024/Chapter682',
  GENETICS_REF: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9018920/',
} as const;
