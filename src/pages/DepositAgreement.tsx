// src/pages/DepositAgreement.tsx
// Public route for buyer-facing deposit form

import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { DepositForm } from '@/components/deposit/DepositForm';
import { validateDepositRequest } from '@/lib/deposit-service';

export default function DepositAgreement() {
  const [searchParams] = useSearchParams();
  const puppyId = searchParams.get('puppy') ?? undefined;
  const litterId = searchParams.get('litter') ?? undefined;
  const requestId = searchParams.get('request') ?? undefined;

  // Validate the request link if present. Non-blocking — the customer can
  // still complete the form even if validation fails; they just won't be
  // linked to an existing reservation request.
  const { data: requestValidation, isLoading: validatingRequest } = useQuery({
    queryKey: ['deposit-request-validation', requestId, litterId],
    queryFn: () => validateDepositRequest(requestId!, litterId),
    enabled: !!requestId,
    retry: false,
  });

  // Only pass requestId to the form if it validated successfully. This
  // prevents creating a stale linkage; the customer's submission will go
  // through as a standalone agreement instead.
  const validatedRequestId = requestValidation?.valid ? requestId : undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {requestId && !validatingRequest && requestValidation && !requestValidation.valid && (
        <div className="max-w-2xl mx-auto mb-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Request link could not be verified</p>
              <p className="text-amber-800">
                You can still continue with the deposit agreement, but it may not be linked
                to an existing reservation request.
              </p>
            </div>
          </div>
        </div>
      )}
      <DepositForm puppyId={puppyId} litterId={litterId} requestId={validatedRequestId} />
    </div>
  );
}
