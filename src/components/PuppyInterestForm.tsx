import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, type Puppy } from "@/lib/supabase";
import {
  createPuppyInterestFormSchema,
  type PuppyInterestFormValues,
  formatUSPhone,
} from "@/lib/puppy-interest-form-schema";
import { US_STATES } from "@/data/statesData";
import {
  BREED_PREFERENCE_OPTIONS,
  SIZE_PREFERENCE_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  TIMELINE_OPTIONS,
  EXPERIENCE_OPTIONS,
  HOW_HEARD_OPTIONS,
  VIEWING_PREFERENCE_OPTIONS,
} from "@/data/breedsData";
import { getDisplayAgeWeeks } from "@/lib/puppy-utils";
import { cn } from "@/lib/utils";

export interface PuppyInterestFormProps {
  initialPuppyId?: string;
  preSelectedPuppy?: Puppy | null;
  puppies?: Puppy[];
  onSuccess?: () => void;
  submitLabel?: string;
  className?: string;
  compact?: boolean;
}

const defaultValues: Partial<PuppyInterestFormValues> = {
  interestedSpecific: "no",
  sizePreference: "",
  breedPreference: [],
  genderPreference: "No Preference",
  timeline: "",
  experience: "",
  howHeard: "",
  viewingPreference: "",
  wantsAiTraining: false,
};

const SHOW_AI_TRAINING_SECTION = false;
const SHOW_STAY_CONNECTED_SECTION = true;

function translateWeeks(t: ReturnType<typeof useTranslation>["t"], weeks: number | null) {
  if (weeks == null) return "";
  return ` • ${t("common.week", { count: weeks })}`;
}

export function PuppyInterestForm({
  initialPuppyId,
  preSelectedPuppy,
  puppies = [],
  onSuccess,
  submitLabel,
  className,
  compact = false,
}: PuppyInterestFormProps) {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const schema = useMemo(
    () => createPuppyInterestFormSchema(t),
    [i18n.resolvedLanguage, t]
  );
  const resolvedSubmitLabel = submitLabel ?? t("forms.puppyInterest.submit");

  const form = useForm<PuppyInterestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      interestedSpecific: initialPuppyId ? "yes" : "no",
      selectedPuppyId: initialPuppyId ?? "",
    },
  });

  const interestedSpecific = form.watch("interestedSpecific");
  const howHeard = form.watch("howHeard");
  const selectedPuppyId = form.watch("selectedPuppyId");
  const selectedPuppy = puppies.find(
    (p) => String(p.id) === selectedPuppyId || p.id === selectedPuppyId
  );

  useEffect(() => {
    if (!initialPuppyId) return;
    form.setValue("interestedSpecific", "yes");
    form.setValue("selectedPuppyId", initialPuppyId);
  }, [initialPuppyId, form]);

  const onSubmit = async (values: PuppyInterestFormValues) => {
    const name = `${values.firstName.trim()} ${values.lastName.trim()}`;
    let puppy_id: string | null = null;
    let puppy_name_at_submit: string | undefined;
    let puppy_status_at_submit: string | undefined;
    let needs_followup = false;

    if (values.interestedSpecific === "yes" && values.selectedPuppyId) {
      puppy_id = values.selectedPuppyId;
      const pup = puppies.find(
        (p) => String(p.id) === values.selectedPuppyId || p.id === values.selectedPuppyId
      );
      if (pup && pup.status !== "Available") {
        needs_followup = true;
        puppy_name_at_submit = pup.name;
        puppy_status_at_submit = pup.status;
      }
    }

    const preferences: Record<string, unknown> = {
      firstName: values.firstName,
      lastName: values.lastName,
      sizePreference: values.sizePreference,
      breedPreference: values.breedPreference,
      genderPreference: values.genderPreference,
      howHeard: values.howHeard,
      howHeardOther: values.howHeardOther,
      viewingPreference: values.viewingPreference,
      wantsAiTraining: values.wantsAiTraining === true,
      consentCommunications: values.consentCommunications === true,
    };

    const row = {
      status: "active",
      name,
      email: values.email,
      phone: values.phone,
      city: values.city,
      state: values.state,
      interested_specific: values.interestedSpecific === "yes",
      puppy_id,
      puppy_name: selectedPuppy?.name ?? preSelectedPuppy?.name,
      timeline: values.timeline,
      experience: values.experience,
      household_description: undefined,
      preferences,
      additional_comments: undefined,
      needs_followup: needs_followup || values.wantsAiTraining === true,
      puppy_name_at_submit,
      puppy_status_at_submit,
    };

    try {
      const { error } = await supabase.from("puppy_inquiries").insert([row]);
      if (error) throw error;

      toast({
        title: t("forms.puppyInterest.successTitle"),
        description: t("forms.puppyInterest.successDescription"),
      });

      form.reset({ ...defaultValues, consentCommunications: undefined });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast({
        title: t("forms.puppyInterest.errorTitle"),
        description: t("forms.puppyInterest.errorDescription"),
        variant: "destructive",
      });
    }
  };

  const sectionClass = compact ? "space-y-4" : "space-y-6";
  const sectionTitleClass = "text-sm font-semibold text-foreground border-b pb-2";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>
            {t("forms.puppyInterest.sections.personalInformation")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.firstName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("forms.puppyInterest.placeholders.firstName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.lastName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("forms.puppyInterest.placeholders.lastName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t("forms.puppyInterest.placeholders.email")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.phone")}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t("forms.puppyInterest.placeholders.phone")}
                      {...field}
                      onChange={(e) => field.onChange(formatUSPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.city")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("forms.puppyInterest.placeholders.city")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.state")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.puppyInterest.placeholders.state")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {t(`states.${state.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>
            {t("forms.puppyInterest.sections.puppyPreferences")}
          </h3>
          <FormField
            control={form.control}
            name="interestedSpecific"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.specificPuppy")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="specific-yes" />
                      <label htmlFor="specific-yes" className="cursor-pointer text-sm">
                        {t("forms.puppyInterest.fields.specificYes")}
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="specific-no" />
                      <label htmlFor="specific-no" className="cursor-pointer text-sm">
                        {t("forms.puppyInterest.fields.specificNo")}
                      </label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {interestedSpecific === "yes" && puppies.length > 0 && (
            <FormField
              control={form.control}
              name="selectedPuppyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("forms.puppyInterest.fields.selectPuppy")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("forms.puppyInterest.fields.selectPuppyPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {puppies.map((puppy) => (
                        <SelectItem key={puppy.id} value={String(puppy.id)}>
                          {puppy.name || t("puppies.unnamed")} — {puppy.breed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPuppy && (
                    <p className="text-sm text-muted-foreground">
                      {t("forms.puppyInterest.selectedPuppySummary", {
                        breed: selectedPuppy.breed,
                        gender: selectedPuppy.gender
                          ? t(`dogFields.gender.${selectedPuppy.gender}`)
                          : "—",
                        color: selectedPuppy.color || "—",
                        weeks: translateWeeks(t, getDisplayAgeWeeks(selectedPuppy)),
                      })}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="sizePreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.typeSizePreference")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.puppyInterest.placeholders.size")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SIZE_PREFERENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="breedPreference"
            render={() => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.breedPreference")}</FormLabel>
                <FormDescription>{t("forms.puppyInterest.fields.breedPreferenceHelp")}</FormDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {BREED_PREFERENCE_OPTIONS.map((option) => (
                    <FormField
                      key={option.value}
                      control={form.control}
                      name="breedPreference"
                      render={({ field }) => {
                        const isChecked =
                          field.value?.includes(option.value) ||
                          (option.value === "No Preference" && field.value?.length === 0);
                        return (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (option.value === "No Preference") {
                                    field.onChange(checked ? ["No Preference"] : []);
                                    return;
                                  }

                                  const next = checked
                                    ? [...(field.value || []).filter((value) => value !== "No Preference"), option.value]
                                    : (field.value || []).filter((value) => value !== option.value);
                                  field.onChange(next);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {t(option.labelKey)}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genderPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.genderPreference")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "No Preference"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.puppyInterest.options.gender.noPreference")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_PREFERENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.timeline")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.puppyInterest.placeholders.select")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>
            {t("forms.puppyInterest.sections.experienceBackground")}
          </h3>
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.experience")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.puppyInterest.placeholders.select")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="howHeard"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.howHeard")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.puppyInterest.placeholders.select")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOW_HEARD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {(howHeard === "referred" || howHeard === "other") && (
            <FormField
              control={form.control}
              name="howHeardOther"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {howHeard === "referred"
                      ? t("forms.puppyInterest.fields.referredName")
                      : t("forms.puppyInterest.fields.specify")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        howHeard === "referred"
                          ? t("forms.puppyInterest.placeholders.friendName")
                          : t("forms.puppyInterest.placeholders.specify")
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>
            {t("forms.puppyInterest.sections.viewingPreference")}
          </h3>
          <FormField
            control={form.control}
            name="viewingPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("forms.puppyInterest.fields.viewingPreference")}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    className="flex flex-col gap-2"
                  >
                    {VIEWING_PREFERENCE_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`view-${option.value}`} />
                        <label htmlFor={`view-${option.value}`} className="cursor-pointer text-sm">
                          {t(option.labelKey)}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {SHOW_AI_TRAINING_SECTION && (
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>
              {t("forms.puppyInterest.sections.trainingResources")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex gap-3">
                <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">
                    {t("forms.puppyInterest.fields.aiTrainingTitle")}
                  </p>
                  <p>{t("forms.puppyInterest.fields.aiTrainingLead")}</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    {(t("forms.puppyInterest.fields.aiTrainingItems", {
                      returnObjects: true,
                    }) as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className="pt-1">{t("forms.puppyInterest.fields.aiTrainingFollowup")}</p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="wantsAiTraining"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer text-sm">
                      {t("forms.puppyInterest.fields.aiTrainingCheckbox")}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {SHOW_STAY_CONNECTED_SECTION && (
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>
              {t("forms.puppyInterest.sections.stayConnected")} *
            </h3>
            <FormField
              control={form.control}
              name="consentCommunications"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4 space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === "all")}
                      value={
                        field.value === true
                          ? "all"
                          : field.value === false
                            ? "inquiry-only"
                            : ""
                      }
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="all" id="consent-all" className="mt-1" />
                        <div className="text-sm leading-relaxed space-y-1">
                          <FormLabel htmlFor="consent-all" className="font-normal cursor-pointer">
                            {t("forms.puppyInterest.fields.consent")}
                          </FormLabel>
                          <p className="text-muted-foreground pt-1">
                            {t("forms.puppyInterest.consentDescription")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="inquiry-only" id="consent-inquiry-only" className="mt-1" />
                        <FormLabel
                          htmlFor="consent-inquiry-only"
                          className="font-normal cursor-pointer text-sm"
                        >
                          {t("forms.puppyInterest.fields.stayConnectedLabel")}
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {!SHOW_STAY_CONNECTED_SECTION && (
          <FormField
            control={form.control}
            name="consentCommunications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value === true} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="font-normal cursor-pointer text-sm">
                    {t("forms.puppyInterest.fields.stayConnectedLabel")}
                  </FormLabel>
                  <FormDescription className="text-xs">
                    {t("forms.puppyInterest.consentDescription")}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("common.sending")}
            </>
          ) : (
            resolvedSubmitLabel
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("forms.puppyInterest.privacyNote")}
        </p>
      </form>
    </Form>
  );
}
