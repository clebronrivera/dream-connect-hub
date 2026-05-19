// src/pages/DepositAgreement.tsx
//
// Public host page for the buyer-facing 10-step deposit wizard. The route
// `/deposit` is operator-issued only — access is gated on a valid
// `?requestId=` query parameter (issued by `send-deposit-link` after the
// admin sets up the reservation).
//
// If the request id is missing or invalid, the page renders a friendly
// landing card explaining how to get a fresh link instead of exposing the
// wizard. The public intake form was retired in the May 2026 reservation
// redesign; there is no longer a self-serve route to a reservation.

import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, MailQuestion } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DepositWizard } from '@/components/wizard/DepositWizard';
import { validateDepositRequest } from '@/lib/deposit-service';
import { BUSINESS } from '@/lib/constants/business';

export default function DepositAgreement() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') ?? undefined;

  if (!requestId) {
    return (
      <GateLanding
        title="Operator-only entry"
        body={`Reservations are started by Dream Puppies after we hear from you. Please use the link we emailed you, or call us at ${BUSINESS.phone} so we can send you a fresh one.`}
      />
    );
  }
  return <ValidatedDepositAgreement requestId={requestId} />;
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
        body="One moment while we look up your reservation link."
      />
    );
  }
  if (isError || !data) {
    return (
      <GateLanding
        title="Could not verify reservation"
        body={`There was a problem looking up your reservation link. Please call ${BUSINESS.phone} so we can sort it out.`}
      />
    );
  }
  if (!data.valid) {
    return <GateLanding {...messageFor(data.reason)} />;
  }

  return (
    <DepositWizard
      puppyId={data.puppyId ?? undefined}
      litterId={data.litterId ?? undefined}
      requestId={requestId}
    />
  );
}

interface GateLandingProps {
  title: string;
  body: string;
}

function GateLanding({ title, body }: GateLandingProps) {
  return (
    <div className="min-h-screen bg-paper py-12 px-4 flex items-start justify-center">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-sun/15 flex items-center justify-center">
            <MailQuestion className="h-6 w-6 text-ink" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
          <p className="text-xs text-muted-foreground pt-4 flex items-center justify-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Questions? Call {BUSINESS.phone} — Dream Puppies, Orlando, FL.
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
      body: `This reservation link isn't associated with any active reservation on our side. If you received it from us, please call ${BUSINESS.phone} and we'll resend a fresh one.`,
    };
  }
  if (reason === 'Request already converted') {
    return {
      title: 'Reservation already submitted',
      body: "You've already completed the agreement for this reservation. Check your email for the confirmation, or call us if you need anything.",
    };
  }
  if (reason.startsWith('Request status is ')) {
    const status = reason.replace('Request status is ', '');
    if (status === 'pending' || status === 'accepted') {
      return {
        title: 'Reservation not yet ready',
        body: "Your reservation is in review. You'll get an email with the agreement link once it's ready.",
      };
    }
    if (status === 'declined') {
      return {
        title: 'Reservation declined',
        body: `This reservation request was declined. Please call ${BUSINESS.phone} if you have questions.`,
      };
    }
    return {
      title: 'Reservation not active',
      body: `This reservation link isn't currently active (status: ${status}). Please call ${BUSINESS.phone}.`,
    };
  }
  return {
    title: 'Reservation link not active',
    body: `This reservation link isn't currently active. Please call ${BUSINESS.phone} so we can sort it out.`,
  };
}
