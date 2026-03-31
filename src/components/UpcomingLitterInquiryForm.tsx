import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { normalizeSupportedLanguage } from "@/i18n";

export const INTEREST_OPTION_DEPOSIT =
  "I want to reserve a puppy with a $300 non-refundable deposit";

export const INTEREST_OPTION_UPDATES =
  "I want to receive updates regarding this litter and when dogs become available.";

export const INTEREST_OPTION_WAITLIST_PREVIEW =
  "I want to join the waitlist for the first preview of the puppies with the interest of possibly putting a deposit in.";

function getLitterLabel(litter: UpcomingLitter, fallbackLabel: string): string {
  const breed = (litter.display_breed || litter.breed || fallbackLabel).trim();
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
  submitLabel,
}: UpcomingLitterInquiryFormProps) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedLitterId, setSelectedLitterId] = useState<string | null>(null);
  const [depositChecked, setDepositChecked] = useState(false);
  const [updatesChecked, setUpdatesChecked] = useState(false);
  const [waitlistPreviewChecked, setWaitlistPreviewChecked] = useState(false);
  const currentLanguage =
    normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language) ?? "en";
  const resolvedSubmitLabel =
    submitLabel ?? t("upcomingLitters.waitlistCta");

  useEffect(() => {
    if (initialLitterId && litters.some((litter) => litter.id === initialLitterId)) {
      setSelectedLitterId(initialLitterId);
    }
  }, [initialLitterId, litters]);

  const selectedLitter = selectedLitterId
    ? litters.find((litter) => litter.id === selectedLitterId)
    : null;
  const birthWindowText = selectedLitter
    ? formatBirthWindow(selectedLitter.breeding_date, currentLanguage)
    : null;
  const goHomeWindowText = selectedLitter
    ? formatGoHomeWindow(selectedLitter.breeding_date, currentLanguage)
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
        ? `Upcoming litter inquiry: ${getLitterLabel(selectedLitter, t("upcomingLitters.labels.upcomingLitter"))}`
        : "Upcoming litter inquiry",
      upcoming_litter_id: selectedLitterId,
      upcoming_litter_label: selectedLitter
        ? getLitterLabel(selectedLitter, t("upcomingLitters.labels.upcomingLitter"))
        : null,
      interest_options: interestOptions,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-name">{t("forms.upcomingLitter.fields.name")}</Label>
          <Input
            id="upcoming-litter-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("forms.upcomingLitter.placeholders.name")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-email">{t("forms.upcomingLitter.fields.email")}</Label>
          <Input
            id="upcoming-litter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("forms.upcomingLitter.placeholders.email")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-city">{t("forms.upcomingLitter.fields.city")}</Label>
          <Input
            id="upcoming-litter-city"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("forms.upcomingLitter.placeholders.city")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upcoming-litter-state">{t("forms.upcomingLitter.fields.state")}</Label>
          <Select required value={state || ""} onValueChange={setState}>
            <SelectTrigger id="upcoming-litter-state">
              <SelectValue placeholder={t("common.selectState")} />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`states.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upcoming-litter-phone">{t("forms.upcomingLitter.fields.phone")}</Label>
        <Input
          id="upcoming-litter-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("forms.upcomingLitter.placeholders.phone")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("forms.upcomingLitter.fields.litter")}</Label>
        <Select
          value={selectedLitterId ?? ""}
          onValueChange={(value) => setSelectedLitterId(value || null)}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder={t("forms.upcomingLitter.fields.selectLitter")} />
          </SelectTrigger>
          <SelectContent>
            {litters.map((litter) => (
              <SelectItem key={litter.id!} value={litter.id!}>
                {getLitterLabel(litter, t("upcomingLitters.labels.upcomingLitter"))}
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
              {t("forms.upcomingLitter.fields.estimatedBirth", {
                value: birthWindowText,
              })}
            </p>
          )}
          {goHomeWindowText && (
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {t("forms.upcomingLitter.fields.estimatedGoHome", {
                value: goHomeWindowText,
              })}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <Label>{t("forms.upcomingLitter.fields.checkAll")}</Label>
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-deposit"
              checked={depositChecked}
              onCheckedChange={(checked) => setDepositChecked(checked === true)}
            />
            <label
              htmlFor="upcoming-litter-deposit"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("forms.upcomingLitter.options.reserve")}
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-updates"
              checked={updatesChecked}
              onCheckedChange={(checked) => setUpdatesChecked(checked === true)}
            />
            <label
              htmlFor="upcoming-litter-updates"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("forms.upcomingLitter.options.updates")}
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="upcoming-litter-waitlist-preview"
              checked={waitlistPreviewChecked}
              onCheckedChange={(checked) => setWaitlistPreviewChecked(checked === true)}
            />
            <label
              htmlFor="upcoming-litter-waitlist-preview"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t("forms.upcomingLitter.options.preview")}
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
        {t("forms.upcomingLitter.depositNote")}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("forms.upcomingLitter.submitting") : resolvedSubmitLabel}
      </Button>
    </form>
  );
}
