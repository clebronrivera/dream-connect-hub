// src/components/deposit/DepositSummary.tsx
// Live deposit calculation display: flat default with optional per-puppy override badge.

import { resolveDepositAmount, calculateBalanceDue } from '@/lib/utils/depositCalc';
import { DEFAULT_DEPOSIT_AMOUNT } from '@/lib/constants/deposit';
import { Badge } from '@/components/ui/badge';

interface DepositSummaryProps {
  purchasePrice: number;
  /** Per-puppy override from puppies.deposit_amount. NULL/undefined → use default. */
  puppyOverride?: number | null;
}

export function DepositSummary({ purchasePrice, puppyOverride }: DepositSummaryProps) {
  if (!purchasePrice || purchasePrice <= 0) return null;

  const depositAmount = resolveDepositAmount({ puppyOverride });
  const balanceDue = calculateBalanceDue(purchasePrice, depositAmount);
  const isCustom =
    typeof puppyOverride === 'number' && puppyOverride > 0 && puppyOverride !== DEFAULT_DEPOSIT_AMOUNT;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-blue-900">Deposit</h3>
        {isCustom && (
          <Badge variant="secondary" className="text-xs">
            Custom for this puppy
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-blue-600 font-medium">Purchase Price</p>
          <p className="text-lg font-bold text-blue-900">${purchasePrice.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-medium">Deposit Due</p>
          <p className="text-lg font-bold text-green-700">${depositAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-blue-600 font-medium">Balance Due</p>
          <p className="text-lg font-bold text-blue-900">${balanceDue.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
