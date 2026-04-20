// src/components/signatures/AdminSignaturePad.tsx
// Admin signs from the dashboard using a canvas-based signature pad.
// Saves as base64 PNG stored in deposit_agreements.admin_signature_svg.

import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AUTHORIZED_SELLERS } from '@/lib/constants/deposit';

interface AdminSignaturePadProps {
  onSign: (params: { svgData: string; sellerName: string; sellerId: string }) => void;
  disabled?: boolean;
  existingSignature?: string; // base64 if already signed
  existingSellerName?: string;
}

export function AdminSignaturePad({ onSign, disabled, existingSignature, existingSellerName }: AdminSignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [selectedSeller, setSelectedSeller] = useState<string>(() => {
    if (!existingSellerName) return '';
    return AUTHORIZED_SELLERS.find(s => s.name === existingSellerName)?.id ?? '';
  });
  const [isSigned, setIsSigned] = useState(() => !!existingSignature);

  // Draw the existing signature onto the canvas once it's mounted. Canvas drawing
  // is an imperative DOM operation, so this genuinely belongs in an effect.
  useEffect(() => {
    if (existingSignature && sigRef.current) {
      sigRef.current.fromDataURL(existingSignature);
    }
  }, [existingSignature]);

  // Adjust selected seller + signed flag during render when existing-* props change.
  const [prevExistingSellerName, setPrevExistingSellerName] = useState(existingSellerName);
  if (existingSellerName !== prevExistingSellerName) {
    setPrevExistingSellerName(existingSellerName);
    if (existingSellerName) {
      const seller = AUTHORIZED_SELLERS.find(s => s.name === existingSellerName);
      if (seller) setSelectedSeller(seller.id);
    }
  }
  const [prevExistingSignature, setPrevExistingSignature] = useState(existingSignature);
  if (existingSignature !== prevExistingSignature) {
    setPrevExistingSignature(existingSignature);
    if (existingSignature) setIsSigned(true);
  }

  function handleClear() {
    sigRef.current?.clear();
    setIsSigned(false);
  }

  function handleSave() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert('Please draw your signature before saving.');
      return;
    }
    if (!selectedSeller) {
      alert('Please select an authorized seller before signing.');
      return;
    }
    const svgData = sigRef.current.toDataURL('image/png'); // base64 PNG
    const seller = AUTHORIZED_SELLERS.find(s => s.id === selectedSeller);
    if (!seller) return;
    setIsSigned(true);
    onSign({ svgData, sellerName: seller.name, sellerId: seller.id });
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
          Authorized Seller
        </Label>
        <Select value={selectedSeller} onValueChange={setSelectedSeller} disabled={disabled || isSigned}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select authorized seller..." />
          </SelectTrigger>
          <SelectContent>
            {AUTHORIZED_SELLERS.map((seller) => (
              <SelectItem key={seller.id} value={seller.id}>
                {seller.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-2 block">
          Authorized Seller Signature
        </Label>
        <div
          className="rounded border-2 border-dashed border-gray-300 bg-gray-50"
          style={{ position: 'relative' }}
        >
          {/* Signature line visual guide */}
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '10%',
              right: '10%',
              borderBottom: '1px solid #ccc',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <SignatureCanvas
            ref={sigRef}
            penColor="#1a1a2e"
            canvasProps={{
              width: 500,
              height: 160,
              className: 'signature-canvas block',
              style: { touchAction: 'none', cursor: disabled || isSigned || !selectedSeller ? 'not-allowed' : 'crosshair' },
            }}
          />
          {/* Block canvas if no seller selected */}
          {!selectedSeller && !isSigned && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-gray-100/80 rounded"
              style={{ zIndex: 10 }}
            >
              <p className="text-sm text-gray-500 font-medium">Select an authorized seller first</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Draw your signature above using mouse or touch
        </p>
      </div>

      {/* Printed name display */}
      {selectedSeller && (
        <div className="border-t pt-3">
          <p className="text-sm text-gray-500">Printed name:</p>
          <p className="font-semibold text-gray-800">
            {AUTHORIZED_SELLERS.find(s => s.id === selectedSeller)?.name}
          </p>
          {isSigned && (
            <p className="text-xs text-green-600 mt-1">
              Signed electronically — Fla. Stat. § 668.50
            </p>
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isSigned}
            size="sm"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedSeller || isSigned}
            size="sm"
            className="bg-gray-900 text-white hover:bg-gray-700"
          >
            {isSigned ? 'Signed' : 'Confirm & Sign'}
          </Button>
        </div>
      )}
    </div>
  );
}
