// src/components/deposit/PaymentMethodSelector.tsx
// Payment method selector with QR code + payment-memo display. Split payment
// was retired by OPD-09 (2026-05-05); rare multi-method scenarios are handled
// manually by the operator outside the form.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEnabledPaymentMethods } from '@/lib/deposit-service';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { PaymentMethodConfig } from '@/types/deposit';
import { AlertCircle, Copy, Check } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: PaymentMethodKey;
  onChange: (method: PaymentMethodKey) => void;
  paymentMemo: string;
}

export function PaymentMethodSelector({
  value,
  onChange,
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

  const selectedMethod = methods.find(m => m.method_key === value);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-foreground">Payment Method</Label>

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
                : 'border-line hover:border-line'
            }`}
          >
            <p className="font-medium text-sm">{method.display_name}</p>
            {method.handle_or_recipient && (
              <p className="text-xs text-muted-foreground mt-1">{method.handle_or_recipient}</p>
            )}
            {method.requires_manual_confirm && (
              <Badge variant="outline" className="mt-1 text-[10px]">Manual confirm</Badge>
            )}
          </button>
        ))}
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
      {selectedMethod?.qr_code_public_url && (
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
        <p className="text-sm text-muted-foreground italic">{selectedMethod.payment_note}</p>
      )}

      {/* Payment memo (auto-generated, read-only) */}
      {paymentMemo && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Payment Memo (include with your payment)</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono text-foreground">
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
