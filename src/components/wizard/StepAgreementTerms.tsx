// Step 6 — the 11 agreement clauses, presented one at a time with the
// buyer's adopted initials as the stamp. Replaces the "checkbox" pattern
// from the linear DepositForm. Each stamp records its own timestamp into
// `acks[clauseKey]`, which the parent later maps to the matching
// `ack_*_at` column on submit.
//
// Clause copy is the same content as the legacy linear form for now;
// minor wording polish can be done in PR 7.

import { useFormContext } from 'react-hook-form';
import { Check } from 'lucide-react';
import { LEGAL_REFERENCES } from '@/lib/constants/business';
import type { ReactNode } from 'react';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

export const CLAUSE_KEYS = [
  'full_agreement',
  'statutory_rights',
  'esign_valid',
  'genetic_disclaimer',
  'arbitration',
  'age_attestation',
  'welfare_responsibility',
  'payment_authorization',
  'identity_attestation',
  'pre_dispute_contact',
  'pickup_acceptance',
] as const;

export type ClauseKey = (typeof CLAUSE_KEYS)[number];

interface ClauseDef {
  key: ClauseKey;
  title: string;
  body: ReactNode;
}

const CLAUSES: ClauseDef[] = [
  {
    key: 'full_agreement',
    title: 'Full agreement',
    body: 'I have read and understand the full agreement, including all clauses presented in this wizard.',
  },
  {
    key: 'statutory_rights',
    title: 'Florida statutory rights',
    body: (
      <>
        I have reviewed my Florida statutory rights under{' '}
        <a
          href={LEGAL_REFERENCES.FLA_828_29}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaryDeep underline"
        >
          Fla. Stat. § 828.29
        </a>
        .
      </>
    ),
  },
  {
    key: 'esign_valid',
    title: 'Electronic signature is valid',
    body: (
      <>
        I acknowledge that the electronic signature I'm adopting is legally valid under{' '}
        <a
          href={LEGAL_REFERENCES.FLA_CH_668}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaryDeep underline"
        >
          Fla. Stat. Ch. 668
        </a>
        .
      </>
    ),
  },
  {
    key: 'genetic_disclaimer',
    title: 'Genetic outcomes',
    body: (
      <>
        I understand canine genetic outcomes cannot be guaranteed (
        <a
          href={LEGAL_REFERENCES.GENETICS_REF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaryDeep underline"
        >
          Axelsson et al.
        </a>
        ).
      </>
    ),
  },
  {
    key: 'arbitration',
    title: 'Binding arbitration',
    body: (
      <>
        I understand and agree that disputes arising under this agreement are resolved by binding
        arbitration in accordance with Florida law (
        <a
          href={LEGAL_REFERENCES.FLA_CH_682}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primaryDeep underline"
        >
          Fla. Stat. Ch. 682
        </a>
        ).
      </>
    ),
  },
  {
    key: 'age_attestation',
    title: '18 or older + accurate information',
    body: 'I am at least 18 years old and all information I have provided is accurate.',
  },
  {
    key: 'welfare_responsibility',
    title: "Puppy's welfare",
    body: "I accept full responsibility for the puppy's welfare and actions once it is transferred to me.",
  },
  {
    key: 'payment_authorization',
    title: 'Payment authorization',
    body: 'I authorize the payment I am about to send using a payment account in my own legal name.',
  },
  {
    key: 'identity_attestation',
    title: 'Identity matches my ID',
    body: 'My contact information matches my legal photo ID, which I will present at pickup.',
  },
  {
    key: 'pre_dispute_contact',
    title: 'Contact us before disputing',
    body: 'I will contact Dream Puppies at (321) 697-8864 to attempt resolution before filing any payment dispute, chargeback, or bank reversal.',
  },
  {
    key: 'pickup_acceptance',
    title: 'Pickup is final acceptance',
    body: 'Signing the pickup handover document at delivery is my final acceptance of the puppy and waives any claim of non-delivery thereafter.',
  },
];

interface StepAgreementTermsProps {
  acks: Record<ClauseKey, string | null>;
  onStamp: (key: ClauseKey) => void;
}

export function StepAgreementTerms({ acks, onStamp }: StepAgreementTermsProps) {
  const { watch } = useFormContext<WizardFormValues>();
  const initials = (watch('buyer_initials') ?? '').toUpperCase();
  const stampedCount = CLAUSES.filter((c) => acks[c.key] !== null).length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-muted/30 p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-ink">
          Tap each clause to stamp your initials.
        </p>
        <p className="text-sm font-semibold text-ink">
          {stampedCount} / {CLAUSES.length}
        </p>
      </div>
      <div className="space-y-3">
        {CLAUSES.map((clause) => {
          const stamped = acks[clause.key] !== null;
          return (
            <button
              key={clause.key}
              type="button"
              onClick={() => onStamp(clause.key)}
              className={`w-full text-left rounded-lg border p-4 transition-colors flex gap-3 items-start ${
                stamped
                  ? 'border-leaf/40 bg-leaf/5'
                  : 'border-line bg-card hover:border-primaryDeep/50'
              }`}
              aria-pressed={stamped}
            >
              <div
                className={`shrink-0 h-12 w-12 rounded-md border-2 flex items-center justify-center font-bold ${
                  stamped
                    ? 'border-leaf bg-leaf/10 text-leaf'
                    : 'border-dashed border-muted-foreground/40 text-muted-foreground/40'
                }`}
                aria-hidden
              >
                {stamped ? initials || <Check className="h-5 w-5" /> : 'tap'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm">{clause.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{clause.body}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Tap a stamped clause again to remove the stamp if you need to re-read it.
      </p>
    </div>
  );
}
