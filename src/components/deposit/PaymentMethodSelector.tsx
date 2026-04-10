// src/components/deposit/PaymentMethodSelector.tsx
// Payment method selection with QR codes and split payment support

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { SplitPaymentDetail, PaymentMethodConfig } from '@/types/deposit';
import { AlertCircle, Plus, Trash2, Copy, Check } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: PaymentMethodKey;
  onChange: (method: PaymentMethodKey) => void;
  splitDetails?: SplitPaymentDetail[];
  onSplitChange?: (details: SplitPaymentDetail[]) => void;
  depositAmount: number;
  paymentMemo: string;
}

export function PaymentMethodSelector({
  value,
  onChange,
  splitDetails = [],
  onSplitChange,
  depositAmount,
  paymentMemo,
}: PaymentMethodSelectorProps) {
  const [memoCopied, setMemoCopied] = useState(false);
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods-enabled'],
    queryFn: fetchEnabledPaymentMethods,
  });

  function handleCopyMemo() {
    navigator.clipboard.writeText(paymentMemo);
    setMemoCopied(true);
    setTimeout(() => setMemoCopied(false), 2000);
  }

  function handleAddSplitRow() {
    if (!onSplitChange) return;
    const availableMethod = methods.find(m => m.method_key !== 'split')?.method_key as PaymentMethodKey;
    onSplitChange([...splitDetails, { method: availableMethod || 'zelle', amount: 0 }]);
  }

  function handleRemoveSplitRow(index: number) {
    if (!onSplitChange) return;
    onSplitChange(splitDetails.filter((_, i) => i !== index));
  }

  function handleSplitRowChange(index: number, field: keyof SplitPaymentDetail, val: string | number) {
    if (!onSplitChange) return;
    const updated = [...splitDetails];
    if (field === 'amount') {
      updated[index] = { ...updated[index], amount: Number(val) };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    onSplitChange(updated);
  }

  const splitTotal = splitDetails.reduce((sum, d) => sum + (d.amount || 0), 0);
  const splitRemaining = Math.round((depositAmount - splitTotal) * 100) / 100;
  const selectedMethod = methods.find(m => m.method_key === value);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">Payment Method</Label>

      {/* Method selection grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {methods.map((method: PaymentMethodConfig) => (
          <button
            key={method.method_key}
            type="button"
            onClick={() => onChange(method.method_key)}
            className={`relative rounded-lg border-2 p-3 text-left transition-colors ${
              value === method.method_key
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-medium text-sm">{method.display_name}</p>
            {method.handle_or_recipient && (
              <p className="text-xs text-gray-500 mt-1">{method.handle_or_recipient}</p>
            )}
            {method.requires_manual_confirm && (
              <Badge variant="outline" className="mt-1 text-[10px]">Manual confirm</Badge>
            )}
          </button>
        ))}
        {/* Split payment option */}
        <button
          type="button"
          onClick={() => onChange('split')}
          className={`relative rounded-lg border-2 p-3 text-left transition-colors ${
            value === 'split'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="font-medium text-sm">Split Payment</p>
          <p className="text-xs text-gray-500 mt-1">Use multiple methods</p>
        </button>
      </div>

      {/* Manual confirmation notice */}
      {selectedMethod?.requires_manual_confirm && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            This payment method requires manual confirmation by our team. You'll receive a confirmation within 48 hours.
          </p>
        </div>
      )}

      {/* QR code display for selected method */}
      {selectedMethod?.qr_code_public_url && value !== 'split' && (
        <div className="flex justify-center">
          <img
            src={selectedMethod.qr_code_public_url}
            alt={`${selectedMethod.display_name} QR code`}
            className="h-40 w-40 rounded-lg border"
          />
        </div>
      )}

      {/* Payment note */}
      {selectedMethod?.payment_note && (
        <p className="text-sm text-gray-600 italic">{selectedMethod.payment_note}</p>
      )}

      {/* Split payment rows */}
      {value === 'split' && (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Split Payment Details</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddSplitRow}>
              <Plus className="h-3 w-3 mr-1" /> Add Method
            </Button>
          </div>

          {splitDetails.map((detail, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={detail.method}
                onChange={e => handleSplitRowChange(idx, 'method', e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm flex-1"
              >
                {methods.map(m => (
                  <option key={m.method_key} value={m.method_key}>{m.display_name}</option>
                ))}
              </select>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  value={detail.amount || ''}
                  onChange={e => handleSplitRowChange(idx, 'amount', e.target.value)}
                  className="pl-6 w-28"
                  min={0}
                  step={0.01}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveSplitRow(idx)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}

          {splitDetails.length > 0 && (
            <div className={`text-sm font-medium ${splitRemaining === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {splitRemaining === 0
                ? 'Split total matches deposit amount'
                : `Remaining: $${splitRemaining.toFixed(2)}`}
            </div>
          )}
        </div>
      )}

      {/* Payment memo (auto-generated, read-only) */}
      {paymentMemo && (
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Payment Memo (include with your payment)</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800">
              {paymentMemo}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyMemo}>
              {memoCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
