/**
 * Passive deposit-interest note shown at the bottom of the puppy-card
 * inquiry form. Not a separate action — submitting the inquiry tells the
 * breeder you want the deposit link; the breeder then sends it from the
 * inquiry inbox (Wave 6).
 */

import { ShieldCheck } from "lucide-react";

export function PuppyInterestNote() {
  return (
    <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-4">
      <div className="flex items-start gap-2.5">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"
          aria-hidden
        />
        <div className="space-y-2 text-sm text-foreground/90">
          <p>
            I&apos;m interested in submitting a deposit for this puppy. Please
            contact me with the required information.
          </p>
          <p className="text-xs text-muted-foreground">
            Reserving a puppy that isn&apos;t yet ready to go home requires a
            <strong> $300 non-refundable deposit</strong>. The deposit guarantees
            the puppy is held for you until pickup.
          </p>
        </div>
      </div>
    </div>
  );
}
