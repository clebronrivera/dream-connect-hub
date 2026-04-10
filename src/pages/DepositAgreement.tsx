// src/pages/DepositAgreement.tsx
// Public route for buyer-facing deposit form

import { useSearchParams } from 'react-router-dom';
import { DepositForm } from '@/components/deposit/DepositForm';

export default function DepositAgreement() {
  const [searchParams] = useSearchParams();
  const puppyId = searchParams.get('puppy') ?? undefined;
  const litterId = searchParams.get('litter') ?? undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <DepositForm puppyId={puppyId} litterId={litterId} />
    </div>
  );
}
