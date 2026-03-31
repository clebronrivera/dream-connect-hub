import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/layout/Layout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Video, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { ConsultationType, SourcePage } from "@/lib/supabase";

const STARTER_HELP_TOPICS = [
  { value: "Feeding schedule and food choice", key: "consultation.starterTopics.feeding" },
  { value: "Potty training schedule", key: "consultation.starterTopics.potty" },
  { value: "Crate training and sleep routine", key: "consultation.starterTopics.crate" },
  { value: "Grooming and hygiene", key: "consultation.starterTopics.grooming" },
  { value: "Breed-specific needs", key: "consultation.starterTopics.breedNeeds" },
  { value: "Supplies and home setup", key: "consultation.starterTopics.supplies" },
  { value: "Basic obedience and house rules", key: "consultation.starterTopics.obedience" },
  { value: "Other", key: "consultation.starterTopics.other" },
] as const;

const BEHAVIOR_CONCERNS = [
  { value: "Aggression", key: "consultation.behaviorConcerns.aggression" },
  { value: "Anxiety", key: "consultation.behaviorConcerns.anxiety" },
  { value: "Barking/Excessive noise", key: "consultation.behaviorConcerns.barking" },
  { value: "Chewing/Destructive behavior", key: "consultation.behaviorConcerns.chewing" },
  { value: "House training", key: "consultation.behaviorConcerns.houseTraining" },
  { value: "Jumping on people", key: "consultation.behaviorConcerns.jumping" },
  { value: "Leash pulling", key: "consultation.behaviorConcerns.leashPulling" },
  { value: "Separation anxiety", key: "consultation.behaviorConcerns.separation" },
  { value: "Socialization", key: "consultation.behaviorConcerns.socialization" },
  { value: "Other", key: "consultation.behaviorConcerns.other" },
] as const;

type IntakeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ConsultationType;
  sourcePage: SourcePage;
  title: string;
  submitLabel: string;
};

function ConsultationIntakeDialog({
  open,
  onOpenChange,
  type,
  sourcePage,
  title,
  submitLabel,
}: IntakeDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [starterTopics, setStarterTopics] = useState<string[]>([]);
  const [behaviorChecklist, setBehaviorChecklist] = useState<string[]>([]);
  const [purchasedFromPuppyHeaven, setPurchasedFromPuppyHeaven] = useState<boolean | null>(null);

  const toggleList = (list: string[], setList: (value: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((current) => current !== item) : [...list, item]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = (formData.get("phone") as string) || undefined;
    const preferred_contact = (formData.get("preferred_contact") as string) || undefined;

    let intake_payload: Record<string, unknown> = {};
    let pet_name: string | undefined;
    let pet_type: string | undefined;
    let purchased_from_puppy_heaven = false;
    let purchase_date_approx: string | undefined;
    let puppy_name_at_purchase: string | undefined;
    let breed_at_purchase: string | undefined;
    let phone_at_purchase: string | undefined;

    if (type === "starter") {
      pet_name = (formData.get("pet_name") as string) || undefined;
      pet_type = (formData.get("pet_type") as string) || undefined;
      intake_payload = {
        help_topics: starterTopics,
        notes: (formData.get("notes") as string) || undefined,
      };
      if (purchasedFromPuppyHeaven) {
        purchased_from_puppy_heaven = true;
        purchase_date_approx = (formData.get("purchase_date_approx") as string) || undefined;
        puppy_name_at_purchase = (formData.get("puppy_name_at_purchase") as string) || undefined;
        breed_at_purchase = (formData.get("breed_at_purchase") as string) || undefined;
        phone_at_purchase = (formData.get("phone_at_purchase") as string) || undefined;
      }
    } else if (type === "readiness") {
      intake_payload = {
        why_now: (formData.get("why_now") as string) || undefined,
        primary_caregiver: (formData.get("primary_caregiver") as string) || undefined,
        weekday_schedule: (formData.get("weekday_schedule") as string) || undefined,
        budget_upfront: (formData.get("budget_upfront") as string) || undefined,
        budget_monthly: (formData.get("budget_monthly") as string) || undefined,
        preferred_breed_size: (formData.get("preferred_breed_size") as string) || undefined,
        other_pets_kids: (formData.get("other_pets_kids") as string) || undefined,
      };
    } else if (type === "behavior") {
      pet_name = (formData.get("pet_name") as string) || undefined;
      pet_type = (formData.get("pet_type") as string) || undefined;
      intake_payload = {
        primary_issue: (formData.get("primary_issue") as string) || undefined,
        secondary_issue: (formData.get("secondary_issue") as string) || undefined,
        issues_checklist: behaviorChecklist.length > 0 ? behaviorChecklist : undefined,
        context_notes: (formData.get("context_notes") as string) || undefined,
      };
    }

    const row = {
      status: "active",
      consultation_type: type,
      source_page: sourcePage,
      name,
      email,
      phone,
      preferred_contact,
      pet_name,
      pet_type,
      purchased_from_puppy_heaven,
      purchase_date_approx,
      puppy_name_at_purchase,
      breed_at_purchase,
      phone_at_purchase,
      intake_payload,
    };

    try {
      const { error } = await supabase.from("consultation_requests").insert([row]);
      if (error) throw error;
      toast({
        title: t("forms.consultation.successTitle"),
        description: t("forms.consultation.successDescription"),
      });
      onOpenChange(false);
      setStarterTopics([]);
      setBehaviorChecklist([]);
      setPurchasedFromPuppyHeaven(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      toast({
        title: t("forms.consultation.errorTitle"),
        description: t("forms.consultation.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("forms.consultation.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("forms.consultation.yourInformation")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("forms.consultation.fields.yourName")}</Label>
                <Input id="name" name="name" placeholder={t("forms.consultation.placeholders.name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("forms.consultation.fields.email")}</Label>
                <Input id="email" name="email" type="email" placeholder={t("forms.consultation.placeholders.email")} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t("forms.consultation.fields.phone")}</Label>
                <Input id="phone" name="phone" type="tel" placeholder={t("forms.consultation.placeholders.phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_contact">{t("forms.consultation.fields.preferredContact")}</Label>
                <Select name="preferred_contact">
                  <SelectTrigger>
                    <SelectValue placeholder={t("forms.consultation.placeholders.selectMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">{t("forms.consultation.preferredContactOptions.email")}</SelectItem>
                    <SelectItem value="phone">{t("forms.consultation.preferredContactOptions.phone")}</SelectItem>
                    <SelectItem value="either">{t("forms.consultation.preferredContactOptions.either")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {type === "starter" && (
            <>
              <div className="space-y-4">
                <Label>{t("forms.consultation.fields.didPurchase")}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ph" checked={purchasedFromPuppyHeaven === true} onChange={() => setPurchasedFromPuppyHeaven(true)} />
                    {t("common.yes")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="ph" checked={purchasedFromPuppyHeaven === false} onChange={() => setPurchasedFromPuppyHeaven(false)} />
                    {t("common.no")}
                  </label>
                </div>
                {purchasedFromPuppyHeaven && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="purchase_date_approx">{t("forms.consultation.fields.purchaseDate")}</Label>
                      <Input id="purchase_date_approx" name="purchase_date_approx" placeholder={t("forms.consultation.placeholders.purchaseDate")} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="puppy_name_at_purchase">{t("forms.consultation.fields.puppyAtPurchase")}</Label>
                      <Input id="puppy_name_at_purchase" name="puppy_name_at_purchase" placeholder={t("forms.consultation.placeholders.puppyNameOrUnknown")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed_at_purchase">{t("forms.consultation.fields.breedAtPurchase")}</Label>
                      <Input id="breed_at_purchase" name="breed_at_purchase" placeholder={t("forms.consultation.placeholders.breed")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_at_purchase">{t("forms.consultation.fields.phoneAtPurchase")}</Label>
                      <Input id="phone_at_purchase" name="phone_at_purchase" type="tel" placeholder={t("forms.consultation.placeholders.phone")} />
                    </div>
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      {t("forms.consultation.purchaseDiscountNote")}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Label>{t("forms.consultation.fields.petInformationOptional")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet_name">{t("forms.consultation.fields.petName")}</Label>
                    <Input id="pet_name" name="pet_name" placeholder={t("forms.consultation.placeholders.petName")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet_type">{t("forms.consultation.fields.petType")}</Label>
                    <Select name="pet_type">
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.consultation.placeholders.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">{t("forms.consultation.petTypeOptions.dog")}</SelectItem>
                        <SelectItem value="cat">{t("forms.consultation.petTypeOptions.cat")}</SelectItem>
                        <SelectItem value="other">{t("forms.consultation.petTypeOptions.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <Label>{t("forms.consultation.fields.starterHelp")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {STARTER_HELP_TOPICS.map((topic) => (
                    <div key={topic.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`topic-${topic.value}`}
                        checked={starterTopics.includes(topic.value)}
                        onCheckedChange={() => toggleList(starterTopics, setStarterTopics, topic.value)}
                      />
                      <Label htmlFor={`topic-${topic.value}`} className="text-sm font-normal cursor-pointer">
                        {t(topic.key)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t("forms.consultation.fields.notes")}</Label>
                <Textarea id="notes" name="notes" placeholder={t("forms.consultation.placeholders.notes")} rows={3} />
              </div>
            </>
          )}

          {type === "readiness" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="why_now">{t("forms.consultation.fields.whyNow")}</Label>
                <Textarea id="why_now" name="why_now" placeholder={t("forms.consultation.placeholders.whyNow")} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_caregiver">{t("forms.consultation.fields.primaryCaregiver")}</Label>
                <Input id="primary_caregiver" name="primary_caregiver" placeholder={t("forms.consultation.placeholders.caregiver")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekday_schedule">{t("forms.consultation.fields.weekdaySchedule")}</Label>
                <Textarea id="weekday_schedule" name="weekday_schedule" placeholder={t("forms.consultation.placeholders.weekdaySchedule")} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_upfront">{t("forms.consultation.fields.budgetUpfront")}</Label>
                  <Input id="budget_upfront" name="budget_upfront" placeholder={t("forms.consultation.placeholders.budgetUpfront")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_monthly">{t("forms.consultation.fields.budgetMonthly")}</Label>
                  <Input id="budget_monthly" name="budget_monthly" placeholder={t("forms.consultation.placeholders.budgetMonthly")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferred_breed_size">{t("forms.consultation.fields.preferredBreedSize")}</Label>
                <Textarea id="preferred_breed_size" name="preferred_breed_size" placeholder={t("forms.consultation.placeholders.preferredBreedSize")} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_pets_kids">{t("forms.consultation.fields.otherPetsKids")}</Label>
                <Textarea id="other_pets_kids" name="other_pets_kids" placeholder={t("forms.consultation.placeholders.household")} rows={2} />
              </div>
            </>
          )}

          {type === "behavior" && (
            <>
              <div className="space-y-4">
                <Label>{t("forms.consultation.fields.petInformation")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet_name">{t("forms.consultation.fields.petNameRequired")}</Label>
                    <Input id="pet_name" name="pet_name" placeholder={t("forms.consultation.placeholders.petName")} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pet_type">{t("forms.consultation.fields.petTypeRequired")}</Label>
                    <Select name="pet_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.consultation.placeholders.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">{t("forms.consultation.petTypeOptions.dog")}</SelectItem>
                        <SelectItem value="cat">{t("forms.consultation.petTypeOptions.cat")}</SelectItem>
                        <SelectItem value="other">{t("forms.consultation.petTypeOptions.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_issue">{t("forms.consultation.fields.primaryIssue")}</Label>
                <Select name="primary_issue" required>
                  <SelectTrigger>
                    <SelectValue placeholder={t("forms.consultation.placeholders.primaryIssue")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_CONCERNS.map((concern) => (
                      <SelectItem key={concern.value} value={concern.value}>
                        {t(concern.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_issue">{t("forms.consultation.fields.secondaryIssue")}</Label>
                <Select name="secondary_issue">
                  <SelectTrigger>
                    <SelectValue placeholder={t("forms.consultation.placeholders.secondaryIssue")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOR_CONCERNS.map((concern) => (
                      <SelectItem key={concern.value} value={concern.value}>
                        {t(concern.key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <Label>{t("forms.consultation.fields.otherConcerns")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {BEHAVIOR_CONCERNS.map((concern) => (
                    <div key={concern.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bh-${concern.value}`}
                        checked={behaviorChecklist.includes(concern.value)}
                        onCheckedChange={() => toggleList(behaviorChecklist, setBehaviorChecklist, concern.value)}
                      />
                      <Label htmlFor={`bh-${concern.value}`} className="text-sm font-normal cursor-pointer">
                        {t(concern.key)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="context_notes">{t("forms.consultation.fields.contextNotes")}</Label>
                <Textarea id="context_notes" name="context_notes" placeholder={t("forms.consultation.placeholders.contextNotes")} rows={3} />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.submitting")}
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Consultation() {
  const { t } = useTranslation();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeType, setIntakeType] = useState<ConsultationType>("starter");
  const [intakeSource, setIntakeSource] = useState<SourcePage>("consultation_pricing_card_starter");
  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeSubmitLabel, setIntakeSubmitLabel] = useState("");

  const openIntake = (type: ConsultationType, sourcePage: SourcePage, title: string, submitLabel: string) => {
    setIntakeType(type);
    setIntakeSource(sourcePage);
    setIntakeTitle(title);
    setIntakeSubmitLabel(submitLabel);
    setIntakeOpen(true);
  };

  const steps = [
    {
      icon: ClipboardList,
      title: t("consultation.steps.completeIntake.title"),
      description: t("consultation.steps.completeIntake.description"),
    },
    {
      icon: Video,
      title: t("consultation.steps.session.title"),
      description: t("consultation.steps.session.description"),
    },
    {
      icon: FileText,
      title: t("consultation.steps.receivePlan.title"),
      description: t("consultation.steps.receivePlan.description"),
    },
  ];

  return (
    <Layout>
      <Seo pageId="consultation" />
      <section className="bg-primary py-16">
        <div className="container text-center">
          <Video className="h-12 w-12 mx-auto mb-4 text-primary-foreground" />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            {t("consultation.hero.title")}
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            {t("consultation.hero.description")}
          </p>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-3xl font-bold text-center text-foreground mb-10">
          {t("consultation.stepsTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="text-2xl font-bold text-primary mb-2">
                {t("consultation.stepLabel", { count: index + 1 })}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-12">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">
            {t("consultation.servicesTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Card className="border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-bl-lg">
                {t("consultation.cards.popular")}
              </div>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t("consultation.cards.starter.title")}</CardTitle>
                <CardDescription>{t("consultation.cards.starter.description")}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-1">{t("consultation.cards.starter.price")}</div>
                <p className="text-sm text-muted-foreground mb-2">{t("consultation.cards.starter.duration")}</p>
                <p className="text-xs text-primary mb-4">{t("consultation.cards.starter.discount")}</p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() =>
                    openIntake(
                      "starter",
                      "consultation_pricing_card_starter",
                      t("consultation.cards.starter.dialogTitle"),
                      t("consultation.cards.starter.submitLabel")
                    )
                  }
                >
                  {t("consultation.cards.starter.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t("consultation.cards.readiness.title")}</CardTitle>
                <CardDescription>{t("consultation.cards.readiness.description")}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-1">{t("consultation.cards.readiness.price")}</div>
                <p className="text-sm text-muted-foreground mb-4">{t("consultation.cards.readiness.duration")}</p>
                <ul className="text-xs text-muted-foreground space-y-1 text-left mb-4">
                  {(t("consultation.cards.readiness.bullets", {
                    returnObjects: true,
                  }) as string[]).map((bullet) => (
                    <li key={bullet}>• {bullet}</li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    openIntake(
                      "readiness",
                      "consultation_pricing_card_readiness",
                      t("consultation.cards.readiness.dialogTitle"),
                      t("consultation.cards.readiness.submitLabel")
                    )
                  }
                >
                  {t("consultation.cards.readiness.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t("consultation.cards.behavior.title")}</CardTitle>
                <CardDescription>{t("consultation.cards.behavior.description")}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-4xl font-bold text-foreground mb-4">{t("consultation.cards.behavior.price")}</div>
                <p className="text-sm text-muted-foreground mb-4">{t("consultation.cards.behavior.duration")}</p>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    openIntake(
                      "behavior",
                      "consultation_pricing_card_behavior",
                      t("consultation.cards.behavior.dialogTitle"),
                      t("consultation.cards.behavior.submitLabel")
                    )
                  }
                >
                  {t("consultation.cards.behavior.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t("consultation.cards.other.title")}</CardTitle>
                <CardDescription>{t("consultation.cards.other.description")}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground mb-4">{t("consultation.cards.other.body")}</p>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/contact?subject=other-consultation">
                    {t("consultation.cards.other.cta")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container py-12 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">{t("consultation.ready.title")}</h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
          {t("consultation.ready.description")}
        </p>
      </section>

      <section className="container pb-12">
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-1">{t("consultation.disclaimer.title")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("consultation.disclaimer.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ConsultationIntakeDialog
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        type={intakeType}
        sourcePage={intakeSource}
        title={intakeTitle}
        submitLabel={intakeSubmitLabel}
      />
    </Layout>
  );
}
