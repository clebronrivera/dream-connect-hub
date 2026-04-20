import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Phone, Dog, CalendarHeart } from "lucide-react";
import type { UpcomingLitter, UpcomingLitterPuppyPlaceholder } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { pickDepositLabel } from "@/lib/upcoming-pick-labels";
import { formatBirthWindow, formatGoHomeWindow } from "@/lib/litter-timeline";
import { US_STATES } from "@/data/statesData";
import { BUSINESS, AUTHORIZED_SELLERS } from "@/lib/constants/business";
import { PAYMENT_METHODS } from "@/lib/constants/deposit";
import { HOW_HEARD_OPTIONS, HOW_HEARD_REFERRAL_VALUES, type HowHeardValue } from "@/lib/constants/how-heard";
import { fetchAvailablePuppies } from "@/lib/puppies-api";
import type { DepositRequestPayload } from "@/lib/deposit-requests";

const DEFAULT_DEPOSIT_AMOUNT = 300;

type InterestType = "available_puppy" | "upcoming_litter";

// Exclude "split" from the simple preference buttons — that's an agreement-form concern
const PAYMENT_PREFERENCE_OPTIONS = PAYMENT_METHODS.filter((m) => m.key !== "split");

function getLitterLabel(litter: UpcomingLitter): string {
  const breed = (litter.display_breed || litter.breed || "Upcoming Litter").trim();
  return litter.due_label ? `${breed}, ${litter.due_label}` : breed;
}

function formatPlaceholderSummary(
  ph: UpcomingLitterPuppyPlaceholder,
  t: (key: string) => string
): string {
  return `${pickDepositLabel(ph.slot_index, t)} • ${ph.offspring_breed_label}`;
}

/** Check if a placeholder slot is currently on hold (not available for selection). */
function isSlotOnHold(ph: UpcomingLitterPuppyPlaceholder & { hold_expires_at?: string | null }): boolean {
  if (!ph.hold_expires_at) return false;
  return new Date(ph.hold_expires_at) > new Date();
}

interface DepositRequestFormProps {
  litters: UpcomingLitter[];
  /** Pre-select interest type. */
  initialInterestType?: InterestType;
  /** Pre-select a specific litter. */
  initialLitterId?: string | null;
  /** Pre-select a specific puppy placeholder slot. */
  initialPlaceholderId?: string | null;
  /** Pre-select an available puppy. */
  initialPuppyId?: string | null;
  onSubmit: (payload: DepositRequestPayload) => Promise<void>;
  isSubmitting: boolean;
}

export function DepositRequestForm({
  litters,
  initialInterestType,
  initialLitterId,
  initialPlaceholderId,
  initialPuppyId,
  onSubmit,
  isSubmitting,
}: DepositRequestFormProps) {
  const { t } = useLanguage();

  // --- Interest type ---
  const [interestType, setInterestType] = useState<InterestType>(
    initialInterestType ?? (initialPuppyId ? "available_puppy" : "upcoming_litter")
  );

  // --- Contact info ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // --- Litter / puppy selection ---
  const [selectedLitterId, setSelectedLitterId] = useState<string | null>(null);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<string | null>(null);
  const [selectedPuppyId, setSelectedPuppyId] = useState<string | null>(initialPuppyId ?? null);

  // --- Request details ---
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [spokeWith, setSpokeWith] = useState<string>("");
  const [howHeard, setHowHeard] = useState<string>("");
  const [howHeardReferralName, setHowHeardReferralName] = useState("");

  // Fetch available puppies for the dropdown
  const { data: availablePuppies = [] } = useQuery({
    queryKey: ["available-puppies-for-deposit"],
    queryFn: fetchAvailablePuppies,
    enabled: interestType === "available_puppy",
  });

  // Pre-select litter from props (adjusting state during render when props/data change)
  const [litterSyncKey, setLitterSyncKey] = useState<string>(`${initialLitterId ?? ''}|${litters.length}`);
  const nextLitterSyncKey = `${initialLitterId ?? ''}|${litters.length}`;
  if (nextLitterSyncKey !== litterSyncKey) {
    setLitterSyncKey(nextLitterSyncKey);
    if (initialLitterId && litters.some((l) => l.id === initialLitterId)) {
      setSelectedLitterId(initialLitterId);
    }
  }

  // Pre-select placeholder from props
  const [placeholderSyncKey, setPlaceholderSyncKey] = useState<string>(`${initialPlaceholderId ?? ''}|${litters.length}`);
  const nextPlaceholderSyncKey = `${initialPlaceholderId ?? ''}|${litters.length}`;
  if (nextPlaceholderSyncKey !== placeholderSyncKey) {
    setPlaceholderSyncKey(nextPlaceholderSyncKey);
    if (!initialPlaceholderId) {
      setSelectedPlaceholderId(null);
    } else {
      const litter = litters.find((l) =>
        (l.puppy_placeholders ?? []).some((p) => p.id === initialPlaceholderId)
      );
      if (litter?.id) {
        setSelectedLitterId(litter.id);
        setSelectedPlaceholderId(initialPlaceholderId);
      }
    }
  }

  const selectedLitter = selectedLitterId ? litters.find((l) => l.id === selectedLitterId) : null;
  const availablePlaceholders = useMemo(() => {
    if (!selectedLitter) return [];
    return (selectedLitter.puppy_placeholders ?? []).filter(
      (p) => !isSlotOnHold(p as UpcomingLitterPuppyPlaceholder & { hold_expires_at?: string | null })
    );
  }, [selectedLitter]);
  const selectedPlaceholder = selectedPlaceholderId
    ? availablePlaceholders.find((p) => p.id === selectedPlaceholderId) ?? null
    : null;
  const selectedPuppy = selectedPuppyId ? availablePuppies.find((p) => p.id === selectedPuppyId) : null;

  const birthWindowText = selectedLitter ? formatBirthWindow(selectedLitter.breeding_date) : null;
  const goHomeWindowText = selectedLitter ? formatGoHomeWindow(selectedLitter.breeding_date) : null;

  const depositAmount =
    selectedLitter?.deposit_amount != null && selectedLitter.deposit_amount > 0
      ? selectedLitter.deposit_amount
      : DEFAULT_DEPOSIT_AMOUNT;

  const showReferralInput = HOW_HEARD_REFERRAL_VALUES.includes(howHeard as HowHeardValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const placeholderSummary = selectedPlaceholder
      ? formatPlaceholderSummary(selectedPlaceholder, t)
      : null;

    const payload: DepositRequestPayload = {
      customer_name: name.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim(),
      city: city.trim(),
      state: state.trim(),
      // Litter context
      upcoming_litter_id: interestType === "upcoming_litter" ? selectedLitterId : null,
      upcoming_litter_label:
        interestType === "upcoming_litter" && selectedLitter
          ? getLitterLabel(selectedLitter)
          : null,
      upcoming_puppy_placeholder_id:
        interestType === "upcoming_litter" ? selectedPlaceholder?.id ?? null : null,
      upcoming_puppy_placeholder_summary:
        interestType === "upcoming_litter" ? placeholderSummary : null,
      // Puppy context
      puppy_id: interestType === "available_puppy" ? selectedPuppyId : null,
      puppy_name:
        interestType === "available_puppy" && selectedPuppy
          ? `${selectedPuppy.name} (${selectedPuppy.breed})`
          : null,
      // Request details
      preferred_payment_method: paymentMethod,
      proposed_pickup_date: pickupDate || null,
      spoke_with: spokeWith || null,
      how_heard: howHeard || null,
      how_heard_referral_name: showReferralInput ? howHeardReferralName.trim() || null : null,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 1. Interest type toggle */}
      <div className="space-y-2">
        <Label>What are you interested in? *</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setInterestType("available_puppy")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
              interestType === "available_puppy"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40"
            }`}
          >
            <Dog className="h-4 w-4" /> Available Puppy
          </button>
          <button
            type="button"
            onClick={() => setInterestType("upcoming_litter")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
              interestType === "upcoming_litter"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/40"
            }`}
          >
            <CalendarHeart className="h-4 w-4" /> Upcoming Litter
          </button>
        </div>
      </div>

      {/* 2. Dog/litter selection */}
      {interestType === "available_puppy" ? (
        <div className="space-y-2">
          <Label>Which puppy? *</Label>
          <Select value={selectedPuppyId ?? ""} onValueChange={setSelectedPuppyId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a puppy" />
            </SelectTrigger>
            <SelectContent>
              {availablePuppies.map((p) => (
                <SelectItem key={p.id!} value={p.id!}>
                  {p.name} — {p.breed}{p.gender ? ` (${p.gender})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Upcoming litter *</Label>
            <Select
              value={selectedLitterId ?? ""}
              onValueChange={(v) => {
                setSelectedLitterId(v || null);
                setSelectedPlaceholderId(null);
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a litter" />
              </SelectTrigger>
              <SelectContent>
                {litters.map((l) => (
                  <SelectItem key={l.id!} value={l.id!}>
                    {getLitterLabel(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLitter && availablePlaceholders.length > 0 && (
            <div className="space-y-2">
              <Label>Puppy slot (optional)</Label>
              <Select
                value={selectedPlaceholderId ?? "__none__"}
                onValueChange={(v) => setSelectedPlaceholderId(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No specific slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific slot — entire litter</SelectItem>
                  {availablePlaceholders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {formatPlaceholderSummary(p, t)} (
                      {p.lifecycle_status === "born" ? t("upcomingStatusBorn") : t("upcomingStatusExpected")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedLitter && (birthWindowText || goHomeWindowText) && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-1 text-sm text-muted-foreground">
              {birthWindowText && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  Estimated birth window: {birthWindowText}
                </p>
              )}
              {goHomeWindowText && (
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  Estimated go-home window: {goHomeWindowText}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* 3. Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dr-name">Name *</Label>
          <Input id="dr-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dr-email">Email *</Label>
          <Input id="dr-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dr-city">City *</Label>
          <Input id="dr-city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dr-state">State *</Label>
          <Select required value={state || ""} onValueChange={setState}>
            <SelectTrigger id="dr-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dr-phone">Phone</Label>
        <Input id="dr-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        <p className="text-xs text-muted-foreground">Optional — helpful if we need to reach you by phone.</p>
      </div>

      {/* 4. Payment preference */}
      <div className="space-y-2">
        <Label>How would you like to pay the deposit?</Label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_PREFERENCE_OPTIONS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setPaymentMethod(m.key)}
              className={`rounded-lg border p-2.5 text-sm font-medium transition-colors ${
                paymentMethod === m.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Proposed pickup date */}
      <div className="space-y-2">
        <Label htmlFor="dr-pickup">Proposed pickup date (optional)</Label>
        <Input
          id="dr-pickup"
          type="date"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          When would you like to pick up? Puppies go home at 8 weeks of age.
        </p>
      </div>

      {/* 6. Spoke with someone */}
      <div className="space-y-2">
        <Label>Did you speak with someone?</Label>
        <Select value={spokeWith} onValueChange={setSpokeWith}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">I haven't spoken to anyone yet</SelectItem>
            {AUTHORIZED_SELLERS.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 7. How heard */}
      <div className="space-y-2">
        <Label>How did you hear about us?</Label>
        <Select value={howHeard} onValueChange={(v) => { setHowHeard(v); if (!HOW_HEARD_REFERRAL_VALUES.includes(v as HowHeardValue)) setHowHeardReferralName(""); }}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {HOW_HEARD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showReferralInput && (
          <div className="pt-1">
            <Input
              placeholder="Who referred you? (so we can thank them)"
              value={howHeardReferralName}
              onChange={(e) => setHowHeardReferralName(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 8. Info callout */}
      <div className="rounded-md border bg-amber-50 border-amber-200 p-3 text-sm space-y-2">
        <p className="text-foreground">
          <strong>Deposit: ${depositAmount}</strong> (non-refundable once agreement is signed).
        </p>
        <p className="text-muted-foreground">
          If your request is accepted, you will receive a deposit agreement link via email
          within 24–48 hours. <strong>Submitting a request does not guarantee availability
          or placement.</strong>
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 pt-1">
          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
          Want to expedite? Call us at <strong>{BUSINESS.phone}</strong>
        </p>
      </div>

      {/* 9. Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting…" : "Submit Deposit Request"}
      </Button>
    </form>
  );
}
