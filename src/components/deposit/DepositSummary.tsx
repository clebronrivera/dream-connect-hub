// src/components/deposit/DepositSummary.tsx
// Live deposit calculation display with tier badge

import { getDepositTier, calculateDepositAmount, getDepositExplanation } from '@/lib/utils/depositCalc';
import { Badge } from '@/components/ui/badge';

interface DepositSummaryProps {
  purchasePrice: number;
  puppyDob: Date | null;
}

export function DepositSummary({ purchasePrice, puppyDob }: DepositSummaryProps) {
  if (!purchasePrice || purchasePrice <= 0) return null;

  const tier = getDepositTier(puppyDob);
  const depositAmount = calculateDepositAmount(purchasePrice, puppyDob);
  const balanceDue = Math.round((purchasePrice - depositAmount) * 100) / 100;
  const explanation = getDepositExplanation(purchasePrice, puppyDob);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-blue-900">Deposit Calculation</h3>
        <Badge variant={tier.key === 'pre_8_weeks' ? 'default' : 'secondary'} className="text-xs">
          {tier.key === 'pre_8_weeks' ? '1/4 Rate' : '1/3 Rate'}
        </Badge>
      </div>

      <p className="text-sm text-blue-800">{explanation}</p>

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

      <p className="text-xs text-blue-600 italic">{tier.description}</p>
    </div>
  );
}
