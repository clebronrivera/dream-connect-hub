// src/pages/RequestDeposit.tsx
// Public standalone page for deposit requests — supports both available puppies and upcoming litters.

import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DepositRequestForm } from "@/components/DepositRequestForm";
import { fetchActiveUpcomingLitters, UPCOMING_LITTERS_ACTIVE_QUERY_KEY } from "@/lib/upcoming-litters";
import { insertDepositRequest, depositRequestPayloadToRow, type DepositRequestPayload } from "@/lib/deposit-requests";
import { useState } from "react";
import { useBusinessInfoOrDefaults } from "@/lib/hooks/useBusinessInfo";

export default function RequestDeposit() {
  const [searchParams] = useSearchParams();
  const puppyId = searchParams.get("puppy") ?? undefined;
  const litterId = searchParams.get("litter") ?? undefined;
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const businessInfo = useBusinessInfoOrDefaults();

  const { data: litters = [], isLoading } = useQuery({
    queryKey: UPCOMING_LITTERS_ACTIVE_QUERY_KEY,
    queryFn: fetchActiveUpcomingLitters,
  });

  const handleSubmit = async (payload: DepositRequestPayload) => {
    setIsSubmitting(true);
    try {
      const { error } = await insertDepositRequest(depositRequestPayloadToRow(payload));
      if (error) throw error;
      setSubmitted(true);
      toast({
        title: "Deposit request submitted",
        description: "We'll review and send your agreement link via email within 24–48 hours.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h1 className="text-2xl font-bold">Request Submitted</h1>
          <p className="text-muted-foreground">
            Thank you for your interest! We'll review your deposit request and send you
            a deposit agreement link via email within 24–48 hours.
          </p>
          <p className="text-sm text-muted-foreground">
            Want to expedite? Call us at <strong>{businessInfo.phone}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl md:text-3xl text-ink">Request a Deposit Reservation</h1>
          <p className="text-muted-foreground mt-1">
            Tell us which puppy you're interested in and how you'd like to pay.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
            <DepositRequestForm
              stepMode
              litters={litters}
              initialInterestType={puppyId ? "available_puppy" : litterId ? "upcoming_litter" : undefined}
              initialLitterId={litterId}
              initialPuppyId={puppyId}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
