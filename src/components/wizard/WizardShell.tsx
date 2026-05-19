// Layout shell for the deposit wizard. Hosts the sticky puppy anchor, the
// progress bar, the current step content, and the prev/next buttons. Pure
// presentation — the parent (DepositWizard) owns step state and validation.

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardShellProps {
  /** Display name of the puppy (or "Undecided" pre-birth). */
  puppyName: string;
  /** Breed string, may be empty. */
  breed?: string;
  /** Optional thumbnail; falls back to a neutral chip. */
  puppyPhotoUrl?: string;
  /** Current step number, 1-indexed. */
  currentStep: number;
  /** Total steps the wizard will show (varies by paymentMode). */
  totalSteps: number;
  /** Short label for the current step, shown above the progress bar. */
  stepLabel: string;
  /** Step body. */
  children: ReactNode;
  /** Disable the Back button (e.g. on step 1). */
  canGoBack: boolean;
  /** Disable the Next/Submit button when the step's fields aren't valid yet. */
  canGoForward: boolean;
  /** Replace "Next" with "Submit reservation" on the final review step. */
  isFinalStep: boolean;
  /** Show a spinner on the submit button. */
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
}

export function WizardShell({
  puppyName,
  breed,
  puppyPhotoUrl,
  currentStep,
  totalSteps,
  stepLabel,
  children,
  canGoBack,
  canGoForward,
  isFinalStep,
  isSubmitting = false,
  onBack,
  onNext,
}: WizardShellProps) {
  const progressPct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-paper">
      {/* Sticky puppy anchor */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-line">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {puppyPhotoUrl ? (
            <img
              src={puppyPhotoUrl}
              alt={puppyName}
              className="h-12 w-12 rounded-full object-cover border border-line shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
              {puppyName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Reserving
            </p>
            <p className="font-semibold text-ink truncate">
              {puppyName}
              {breed ? <span className="text-muted-foreground"> · {breed}</span> : null}
            </p>
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Step
            </p>
            <p className="font-semibold text-ink">
              {currentStep} of {totalSteps}
            </p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primaryDeep transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          Step {currentStep} of {totalSteps}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-6">
          {stepLabel}
        </h1>

        <div className="space-y-6">{children}</div>

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={!canGoBack || isSubmitting}
            className="min-w-[100px]"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoForward || isSubmitting}
            className="min-w-[160px] bg-primaryDeep hover:bg-primaryDeep/90 text-white"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : isFinalStep ? (
              'Submit reservation'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
