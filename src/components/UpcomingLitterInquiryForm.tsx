import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "lucide-react";
import type { UpcomingLitter } from "@/lib/supabase";
import { formatBirthWindow, formatGoHomeWindow } from "@/lib/litter-timeline";
import { SUBJECT_UPCOMING_LITTER } from "@/lib/inquiry-subjects";
import { US_STATES } from "@/data/statesData";

const DEPOSIT_NOTE =
  "A $300 non-refundable deposit places you on the reservation list in the order received. Families will be given the opportunity to select a puppy based on that reservation order. A detailed deposit agreement and receipt will be sent with full terms and next steps.";

export const INTEREST_OPTION_DEPOSIT =
  "I want to reserve a puppy with a $300 non-refundable deposit";

export const INTEREST_OPTION_UPDATES =
  "I want to receive updates regarding this litter and when dogs become available.";

export const INTEREST_OPTION_WAITLIST_PREVIEW =
  "I want to join the waitlist for the first preview of the puppies with the interest of possibly putting a deposit in.";

function getLitterLabel(litter: UpcomingLitter): string {
  const breed = (litter.display_breed || litter.breed || "Upcoming Litter").trim();
  return litter.due_label ? `${breed}, ${litter.due_label}` : breed;
}

export interface UpcomingLitterInquiryPayload {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  subject: string;
  message: string;
  upcoming_litter_id: string | null;
  upcoming_litter_label: string | null;
  interest_options: string[];
}

interface UpcomingLitterInquiryFormProps {
  litters: UpcomingLitter[];
  /** When opened from a specific litter card, preselect this litter. */
  initialLitterId?: string | null;
  onSubmit: (payload: UpcomingLitterInquiryPayload) => Promise<void>;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function UpcomingLitterInquiryForm({
  litters,
  initialLitterId,
  onSubmit,
  isSubmitting,
  submitLabel = "Submit",
}: UpcomingLitterInquiryFormProps) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedLitterId, setSelectedLitterId] = useState<string | null>(null);
  const [depositChecked, setDepositChecked] = useState(false);
  const [updatesChecked, setUpdatesChecked] = useState(false);
  const [waitlistPreviewChecked, setWaitlistPreviewChecked] = useState(false);

  useEffect(() => {
    if (initialLitterId && litters.some((l) => l.id === initialLitterId)) {
      setSelectedLitterId(initialLitterId);
    }
  }, [initialLitterId, litters]);

  const selectedLitter = selectedLitterId
    ? litters.find((l) => l.id === selectedLitterId)
    : null;
  const birthWindowText = selectedLitter
    ? formatBirthWindow(selectedLitter.breeding_date)
    : null;
  const goHomeWindowText = selectedLitter
    ? formatGoHomeWindow(selectedLitter.breeding_date)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const interestOptions: string[] = [];
    if (depositChecked) interestOptions.push(INTEREST_OPTION_DEPOSIT);
    if (updatesChecked) interestOptions.push(INTEREST_OPTION_UPDATES);
    if (waitlistPreviewChecked) interestOptions.push(INTEREST_OPTION_WAITLIST_PREVIEW);

    const payload: UpcomingLitterInquiryPayload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || "",
      city: city.trim(),
      state: state.trim(),
      subject: SUBJECT_UPCOMING_LITTER,
      message: selectedLitter
        ? `Upcoming litter inquiry: ${getLitterLabel(selectedLitter)}`
        : "Upcoming litter inquiry",
      upcoming_litter_id: selectedLitterId,
      upcoming_litter_label: selectedLitter ? getLitterLabel(selectedLitter) : null,
      interest_options: interestOptions,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-name">Name *</Label>
          <Input
            id="upcoming-litter-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-email">Email *</Label>
          <Input
            id="upcoming-litter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-city">City *</Label>
          <Input
            id="upcoming-litter-city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-state">State *</Label>
          <Select required value={state || ""} onValueChange={setState}>
            <SelectTrigger id="upcoming-litter-state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upcoming-litter-phone">Phone number</Label>
        <Input
          id="upcoming-litter-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="space-y-2">
        <Label>Upcoming litter *</Label>
        <Select
          value={selectedLitterId ?? ""}
          onValueChange={(v) => setSelectedLitterId(v || null)}
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

      <div className="space-y-3">
        <Label>Check all that apply</Label>
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-deposit"
              checked={depositChecked}
              onCheckedChange={(c) => setDepositChecked(c === true)}
            />
            <label
              htmlFor="upcoming-litter-deposit"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {INTEREST_OPTION_DEPOSIT}
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-updates"
              checked={updatesChecked}
              onCheckedChange={(c) => setUpdatesChecked(c === true)}
            />
            <label
              htmlFor="upcoming-litter-updates"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {INTEREST_OPTION_UPDATES}
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-waitlist-preview"
              checked={waitlistPreviewChecked}
              onCheckedChange={(c) => setWaitlistPreviewChecked(c === true)}
            />
            <label
              htmlFor="upcoming-litter-waitlist-preview"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {INTEREST_OPTION_WAITLIST_PREVIEW}
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        {DEPOSIT_NOTE}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : submitLabel}
      </Button>
    </form>
  );
}
