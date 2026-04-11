// src/components/deposit/DepositForm.tsx
// Full customer deposit form — handles the buyer-facing deposit submission flow.

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { BuyerSignature } from '@/components/signatures/BuyerSignature';
import { DepositSummary } from '@/components/deposit/DepositSummary';
import { PaymentMethodSelector } from '@/components/deposit/PaymentMethodSelector';

import {
  getDepositTier,
  calculateDepositAmount,
  getEarliestPickupDate,
  isValidPickupDate,
  generatePaymentMemo,
} from '@/lib/utils/depositCalc';
import { AUTHORIZED_SELLERS } from '@/lib/constants/deposit';
import { submitDepositAgreement, fetchPuppyForDeposit, fetchLitterForDeposit } from '@/lib/deposit-service';
import type { PaymentMethodKey } from '@/lib/constants/deposit';
import type { SplitPaymentDetail } from '@/types/deposit';
import { Checkbox } from '@/components/ui/checkbox';
import { LEGAL_REFERENCES } from '@/lib/constants/business';
import { CheckCircle2 } from 'lucide-react';

// --- Zod schema ---
const depositFormSchema = z.object({
  buyer_name: z.string().min(2, 'Full name is required'),
  buyer_email: z.string().email('Valid email is required'),
  buyer_phone: z.string().optional(),
  buyer_address: z.string().optional(),
  proposed_pickup_date: z.string().min(1, 'Pickup date is required'),
  deposit_payment_method: z.string().min(1, 'Payment method is required'),
  final_payment_method_intended: z.string().optional(),
  buyer_signature_text: z.string().min(2, 'Signature is required — type your full legal name'),
  authorized_seller: z.string().min(1, 'Please select an authorized seller'),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

interface DepositFormProps {
  puppyId?: string;
  litterId?: string;
}

export function DepositForm({ puppyId, litterId }: DepositFormProps) {
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [agreementNumber, setAgreementNumber] = useState<string>('');

  // Acknowledgment checkboxes (Article IX) — each stores timestamp when checked
  const [acks, setAcks] = useState<Record<string, string | null>>({
    full_agreement: null,
    statutory_rights: null,
    esign_valid: null,
    genetic_disclaimer: null,
    arbitration: null,
    age_accuracy: null,
    welfare_responsibility: null,
  });
  const [arbitrationPhrase, setArbitrationPhrase] = useState('');

  const REQUIRED_ARBITRATION_PHRASE = 'I understand and agree to arbitration';
  const allAcksChecked = Object.values(acks).every((v) => v !== null);
  const arbitrationValid = arbitrationPhrase.toLowerCase().trim() === REQUIRED_ARBITRATION_PHRASE.toLowerCase();
  const canSubmit = allAcksChecked && arbitrationValid;

  function toggleAck(key: string) {
    setAcks((prev) => ({
      ...prev,
      [key]: prev[key] ? null : new Date().toISOString(),
    }));
  }

  // Fetch puppy data if puppyId provided
  const { data: puppy } = useQuery({
    queryKey: ['puppy-for-deposit', puppyId],
    queryFn: () => fetchPuppyForDeposit(puppyId!),
    enabled: !!puppyId,
  });

  // Fetch litter data if litterId provided
  const { data: litter } = useQuery({
    queryKey: ['litter-for-deposit', litterId],
    queryFn: () => fetchLitterForDeposit(litterId!),
    enabled: !!litterId,
  });

  // Derive pricing and DOB
  const purchasePrice = puppy?.final_price ?? puppy?.base_price ?? 0;
  const puppyDob = puppy?.date_of_birth ? new Date(puppy.date_of_birth) : (litter?.date_of_birth ? new Date(litter.date_of_birth) : null);
  const puppyName = puppy?.name ?? 'Undecided';
  const breed = puppy?.breed ?? litter?.breed ?? '';

  const earliestPickup = useMemo(() => getEarliestPickupDate(puppyDob), [puppyDob]);
  const earliestPickupStr = format(earliestPickup, 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      buyer_name: '',
      buyer_email: '',
      buyer_phone: '',
      buyer_address: '',
      proposed_pickup_date: '',
      deposit_payment_method: 'zelle',
      final_payment_method_intended: '',
      buyer_signature_text: '',
      authorized_seller: '',
    },
  });

  const buyerName = watch('buyer_name');
  const paymentMethod = watch('deposit_payment_method') as PaymentMethodKey;
  const proposedPickupDate = watch('proposed_pickup_date');
  const paymentMemo = generatePaymentMemo(buyerName || 'Your Name', puppyName);

  // Re-evaluate tier at submit time (Build Rule #2)
  const currentTier = getDepositTier(puppyDob);
  const depositAmount = calculateDepositAmount(purchasePrice, puppyDob);

  // Pickup date validation
  const pickupDateError = useMemo(() => {
    if (!proposedPickupDate) return null;
    const proposed = new Date(proposedPickupDate);
    if (!isValidPickupDate(proposed, puppyDob)) {
      return `Pickup date must be on or after ${format(earliestPickup, 'MMM d, yyyy')} — puppies go home at 8 weeks.`;
    }
    return null;
  }, [proposedPickupDate, puppyDob, earliestPickup]);

  const submitMutation = useMutation({
    mutationFn: submitDepositAgreement,
    onSuccess: (data) => {
      setAgreementNumber(data.agreement_number);
      setIsSubmitted(true);
      toast.success('Deposit agreement submitted successfully!');
    },
    onError: (err: Error) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  function onSubmit(values: DepositFormValues) {
    if (pickupDateError) {
      toast.error(pickupDateError);
      return;
    }

    // Re-evaluate tier at submit time (Build Rule #2)
    const tier = getDepositTier(puppyDob);
    const amount = calculateDepositAmount(purchasePrice, puppyDob);

    // Validate split total
    if (values.deposit_payment_method === 'split') {
      const splitTotal = splitDetails.reduce((sum, d) => sum + (d.amount || 0), 0);
      const diff = Math.abs(splitTotal - amount);
      if (diff > 0.01) {
        toast.error(`Split payment total ($${splitTotal.toFixed(2)}) must equal deposit amount ($${amount.toFixed(2)})`);
        return;
      }
    }

    submitMutation.mutate({
      buyer_name: values.buyer_name,
      buyer_email: values.buyer_email,
      buyer_phone: values.buyer_phone || undefined,
      buyer_address: values.buyer_address || undefined,
      puppy_id: puppyId,
      litter_id: litterId,
      puppy_name: puppyName,
      breed,
      puppy_dob: puppyDob ? format(puppyDob, 'yyyy-MM-dd') : undefined,
      purchase_price: purchasePrice,
      deposit_tier: tier.key,
      deposit_amount: amount,
      deposit_payment_method: values.deposit_payment_method as PaymentMethodKey,
      deposit_payment_detail: values.deposit_payment_method === 'split' ? splitDetails : undefined,
      final_payment_method_intended: values.final_payment_method_intended as PaymentMethodKey | undefined,
      proposed_pickup_date: values.proposed_pickup_date,
      authorized_seller: values.authorized_seller as 'carlos_lebron_rivera' | 'yolanda_lebron_rivera',
      buyer_signature_text: values.buyer_signature_text,
      buyer_signature_font: 'Dancing Script',
      // Audit trail fields
      ack_full_agreement_at: acks.full_agreement || undefined,
      ack_statutory_rights_at: acks.statutory_rights || undefined,
      ack_esign_valid_at: acks.esign_valid || undefined,
      ack_genetic_disclaimer_at: acks.genetic_disclaimer || undefined,
      ack_arbitration_at: acks.arbitration || undefined,
      ack_age_accuracy_at: acks.age_accuracy || undefined,
      ack_welfare_responsibility_at: acks.welfare_responsibility || undefined,
      arbitration_typed_phrase: arbitrationPhrase,
      arbitration_typed_at: arbitrationValid ? new Date().toISOString() : undefined,
    });
  }

  // --- Success screen ---
  if (isSubmitted) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Reservation Request Received</h2>
          <p className="text-gray-600">
            Agreement # <span className="font-mono font-bold">{agreementNumber}</span>
          </p>
          <p className="text-sm text-gray-500">
            We will confirm availability within 48 hours. You will receive a confirmation email at the address you provided.
          </p>
          <p className="text-xs text-gray-400 mt-4">Dream Puppies — hobby breeding program</p>
        </CardContent>
      </Card>
    );
  }

  // --- Main form ---
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Deposit Agreement — Dream Puppies</CardTitle>
          {puppyName !== 'Undecided' && (
            <p className="text-sm text-gray-500">
              Puppy: <span className="font-medium">{puppyName}</span>
              {breed && <> &middot; {breed}</>}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deposit Summary */}
          {purchasePrice > 0 && (
            <DepositSummary purchasePrice={purchasePrice} puppyDob={puppyDob} />
          )}

          {/* Buyer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buyer_name">Full Name *</Label>
                <Input id="buyer_name" {...register('buyer_name')} placeholder="Jane Smith" />
                {errors.buyer_name && <p className="text-xs text-red-500 mt-1">{errors.buyer_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="buyer_email">Email *</Label>
                <Input id="buyer_email" type="email" {...register('buyer_email')} placeholder="jane@example.com" />
                {errors.buyer_email && <p className="text-xs text-red-500 mt-1">{errors.buyer_email.message}</p>}
              </div>
              <div>
                <Label htmlFor="buyer_phone">Phone</Label>
                <Input id="buyer_phone" {...register('buyer_phone')} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="buyer_address">Address</Label>
                <Input id="buyer_address" {...register('buyer_address')} placeholder="123 Main St, City, FL" />
              </div>
            </div>
          </div>

          {/* Pickup Date */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Proposed Pickup Date</h3>
            <Input
              type="date"
              min={earliestPickupStr}
              {...register('proposed_pickup_date')}
            />
            {pickupDateError && (
              <p className="text-xs text-red-500">{pickupDateError}</p>
            )}
            {errors.proposed_pickup_date && (
              <p className="text-xs text-red-500">{errors.proposed_pickup_date.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Earliest pickup: {format(earliestPickup, 'MMM d, yyyy')} (puppies go home at 8 weeks)
            </p>
          </div>

          {/* Authorized Seller */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Seller Representative</h3>
            <Controller
              name="authorized_seller"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTHORIZED_SELLERS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.authorized_seller && <p className="text-xs text-red-500">{errors.authorized_seller.message}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Deposit Payment</h3>
            <Controller
              name="deposit_payment_method"
              control={control}
              render={({ field }) => (
                <PaymentMethodSelector
                  value={field.value as PaymentMethodKey}
                  onChange={field.onChange}
                  splitDetails={splitDetails}
                  onSplitChange={setSplitDetails}
                  depositAmount={depositAmount}
                  paymentMemo={paymentMemo}
                />
              )}
            />
          </div>

          {/* Final Payment Method (informational) */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Intended final payment method (optional)</Label>
            <Controller
              name="final_payment_method_intended"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="How do you plan to pay the balance?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="cashapp">Cash App</SelectItem>
                    <SelectItem value="apple_pay">Apple Pay</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Agreement Terms */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Agreement Terms</h3>
            <div className="max-h-48 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 space-y-2">
              <p><strong>Dream Puppies — Deposit Agreement</strong></p>
              <p>This Deposit Agreement ("Agreement") is entered into between Dream Puppies, a hobby breeding program operated in Florida, and the Buyer identified above.</p>
              <p><strong>1. Deposit.</strong> The Buyer agrees to pay the deposit amount shown above to reserve the specified puppy. The deposit is non-refundable except as provided herein.</p>
              <p><strong>2. Pickup.</strong> The Buyer must pick up the puppy on or after the proposed pickup date. Puppies are not released before 8 weeks of age. If the Buyer fails to pick up the puppy within 14 days of the pickup clock start date, the reservation may be forfeited.</p>
              <p><strong>3. Rejection Window.</strong> Dream Puppies reserves the right to reject a deposit within 48 hours of submission if the puppy is no longer available. In such case, the deposit will be refunded in full.</p>
              <p><strong>4. Balance.</strong> The remaining balance is due at or before pickup. Payment must be made using one of the accepted payment methods.</p>
              <p><strong>5. Health Guarantee.</strong> Dream Puppies provides a health guarantee as detailed in the Pet Guide provided at pickup.</p>
              <p><strong>6. Electronic Signature.</strong> By typing your name below, you acknowledge that this constitutes a valid electronic signature under Florida law (Fla. Stat. § 668.50).</p>
            </div>
          </div>

          {/* Required Acknowledgments (Article IX) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Required Acknowledgments</h3>
            <p className="text-xs text-gray-500">Please review and check each acknowledgment individually.</p>

            <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
              {[
                { key: 'full_agreement', label: 'I have read and understand the full agreement.' },
                { key: 'statutory_rights', label: (
                  <>I have reviewed my Florida statutory rights under{' '}
                    <a href={LEGAL_REFERENCES.FLA_828_29} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Fla. Stat. § 828.29</a>.
                  </>
                )},
                { key: 'esign_valid', label: (
                  <>I acknowledge that electronic signatures are valid under{' '}
                    <a href={LEGAL_REFERENCES.FLA_CH_668} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Fla. Stat. Ch. 668</a>.
                  </>
                )},
                { key: 'genetic_disclaimer', label: (
                  <>I understand canine genetic outcomes cannot be guaranteed ({' '}
                    <a href={LEGAL_REFERENCES.GENETICS_REF} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Axelsson et al.</a>).
                  </>
                )},
                { key: 'arbitration', label: 'I understand and agree to binding arbitration for any disputes.' },
                { key: 'age_accuracy', label: 'I am at least 18 years old and all information provided is accurate.' },
                { key: 'welfare_responsibility', label: "I accept full responsibility for the puppy's welfare and actions after transfer." },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={acks[key] !== null}
                    onCheckedChange={() => toggleAck(key)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Arbitration Typed Phrase */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Arbitration Agreement</h3>
            <p className="text-xs text-gray-500 uppercase font-bold">
              DISPUTES ARISING UNDER THIS AGREEMENT SHALL BE RESOLVED BY BINDING ARBITRATION IN ACCORDANCE WITH FLORIDA LAW (
              <a href={LEGAL_REFERENCES.FLA_CH_682} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">FLA. STAT. CH. 682</a>
              ).
            </p>
            <Label htmlFor="arbitration_phrase" className="text-sm">
              Please type: <em className="text-gray-900">&quot;{REQUIRED_ARBITRATION_PHRASE}&quot;</em>
            </Label>
            <Input
              id="arbitration_phrase"
              value={arbitrationPhrase}
              onChange={(e) => setArbitrationPhrase(e.target.value)}
              placeholder={REQUIRED_ARBITRATION_PHRASE}
              className={arbitrationValid ? 'border-green-500' : ''}
            />
            {arbitrationPhrase.length > 0 && !arbitrationValid && (
              <p className="text-xs text-red-500">Please type the phrase exactly as shown above.</p>
            )}
          </div>

          {/* Buyer Signature */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Signature</h3>
            <Controller
              name="buyer_signature_text"
              control={control}
              render={({ field }) => (
                <BuyerSignature value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.buyer_signature_text && (
              <p className="text-xs text-red-500">{errors.buyer_signature_text.message}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gray-900 text-white hover:bg-gray-700"
            disabled={submitMutation.isPending || !canSubmit}
            size="lg"
          >
            {submitMutation.isPending ? 'Submitting...' : `Submit Deposit — $${depositAmount.toFixed(2)}`}
          </Button>
          {!canSubmit && (
            <p className="text-xs text-center text-amber-600">
              Please complete all acknowledgments and the arbitration agreement above before submitting.
            </p>
          )}

          <p className="text-xs text-center text-gray-400">
            Dream Puppies — hobby breeding program
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
