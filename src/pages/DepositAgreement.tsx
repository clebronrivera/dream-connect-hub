// src/pages/DepositAgreement.tsx
// Public route for the buyer-facing deposit agreement form.
// Wave B: gated on a valid `?requestId=` (operator-issued link only).
// No public access without a valid request id; the litter/puppy context is
// resolved from the request row, not URL params.

import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, MailQuestion } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DepositForm } from '@/components/deposit/DepositForm';
import { PrivatePageSeo } from '@/components/seo/PrivatePageSeo';
import { validateDepositRequest } from '@/lib/deposit-service';

export default function DepositAgreement() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') ?? undefined;

  let body: ReactNode;
  if (!requestId) {
    body = (
      <GateLanding
        title="Operator-only entry"
        body="The deposit agreement form is reached via a personalized link sent by Dream Puppies after we've reviewed your inquiry. Please start by telling us about yourself."
        ctaHref="/contact?subject=puppies"
        ctaLabel="Tell us about yourself"
      />
    );
  } else {
    body = <ValidatedDepositAgreement requestId={requestId} />;
  }

  return (
    <>
      <PrivatePageSeo canonicalPath="/deposit" />
      {body}
    </>
  );
}

function ValidatedDepositAgreement({ requestId }: { requestId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deposit-request-validation', requestId],
    queryFn: () => validateDepositRequest(requestId),
    retry: false,
  });

  if (isLoading) {
    return (
      <GateLanding
        title="Loading your reservation…"
        body="One moment while we look up your deposit link."
      />
    );
  }

  if (isError || !data) {
    return (
      <GateLanding
        title="Could not verify reservation"
        body="There was a problem looking up your deposit link. Please try again, or contact us if the issue persists."
        ctaHref="/contact?subject=puppies"
        ctaLabel="Tell us about yourself"
      />
    );
  }

  if (!data.valid) {
    return <GateLanding {...messageFor(data.reason)} />;
  }

  // Valid — render the form, scoped to the request's puppy/litter context.
  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-2xl mx-auto mb-4">
        <div className="rounded-sm border border-leaf/30 bg-leaf/10 p-3 text-sm text-ink">
          Reservation <span className="font-mono font-bold">#DEP-{requestId.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>
      <DepositForm
        puppyId={data.puppyId ?? undefined}
        litterId={data.litterId ?? undefined}
        requestId={requestId}
      />
    </div>
  );
}

interface GateLandingProps {
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function GateLanding({ title, body, ctaHref, ctaLabel }: GateLandingProps) {
  return (
    <div className="min-h-screen bg-paper py-12 px-4 flex items-start justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-sun/15 flex items-center justify-center">
            {ctaHref ? (
              <MailQuestion className="h-6 w-6 text-ink" />
            ) : (
              <AlertCircle className="h-6 w-6 text-ink" />
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          {ctaHref && ctaLabel && (
            <a
              href={ctaHref}
              className="inline-block rounded-md bg-primaryDeep px-4 py-2 text-sm font-medium text-white hover:bg-primaryDeep/90"
            >
              {ctaLabel}
            </a>
          )}
          <p className="text-xs text-muted-foreground pt-4">
            Questions? Call (321) 697-8864 — Dream Puppies, Orlando, FL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function messageFor(reason: string): GateLandingProps {
  if (reason === 'Request not found') {
    return {
      title: 'Reservation link not recognized',
      body: 'This deposit link is not associated with any active reservation. If you received it from us, please reach out and we\'ll resend a fresh link.',
      ctaHref: '/contact?subject=puppies',
      ctaLabel: 'Tell us about yourself',
    };
  }
  if (reason === 'Request already converted') {
    return {
      title: 'Reservation already submitted',
      body: 'You\'ve already completed the deposit agreement for this reservation. Check your email for the confirmation, or reach out if you need anything.',
    };
  }
  if (reason.startsWith('Request status is ')) {
    const status = reason.replace('Request status is ', '');
    if (status === 'pending' || status === 'accepted') {
      return {
        title: 'Reservation not yet ready',
        body: 'Your deposit request is in review. You\'ll receive an email with the agreement link once it\'s ready.',
      };
    }
    if (status === 'declined') {
      return {
        title: 'Reservation declined',
        body: 'This deposit request was declined. Please reach out to us if you have questions.',
      };
    }
    return {
      title: 'Reservation not active',
      body: `This deposit link is not currently active (status: ${status}). Please contact us for assistance.`,
    };
  }
  return {
    title: 'Reservation link not active',
    body: 'This deposit link is not currently active. Please contact us so we can sort it out.',
  };
}
