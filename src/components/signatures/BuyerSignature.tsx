// src/components/signatures/BuyerSignature.tsx
// Renders buyer's typed name in a cursive font as their e-signature.
// Loads Dancing Script from Google Fonts.

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BuyerSignatureProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}

export function BuyerSignature({ value, onChange, disabled, label = 'Type your full name as your electronic signature' }: BuyerSignatureProps) {
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    // Load Dancing Script from Google Fonts
    if (!document.getElementById('cursive-font-link')) {
      const link = document.createElement('link');
      link.id = 'cursive-font-link';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap';
      link.onload = () => setFontLoaded(true);
      document.head.appendChild(link);
    } else {
      setFontLoaded(true);
    }
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your full legal name..."
        className="text-base"
      />
      {/* Live cursive preview */}
      {value && (
        <div className="border-b-2 border-gray-800 pb-2">
          <p
            style={{
              fontFamily: fontLoaded ? "'Dancing Script', cursive" : 'cursive',
              fontSize: '2rem',
              color: '#1a1a2e',
              lineHeight: 1.4,
              minHeight: '3rem',
            }}
            aria-label={`Signature preview: ${value}`}
          >
            {value}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Electronic signature — constitutes legal signature per Fla. Stat. § 668.50
          </p>
        </div>
      )}
    </div>
  );
}
