import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, Puppy } from "@/lib/supabase";
import {
  puppyInterestFormSchema,
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
  /** When provided, form is shown in a specific context (e.g. pre-selected puppy from card) */
  initialPuppyId?: string;
  /** Pre-selected puppy for display (e.g. name/photo in modal header) */
  preSelectedPuppy?: Puppy | null;
  /** List of available puppies for the "specific puppy" selector */
  puppies?: Puppy[];
  /** Called after successful submit (e.g. close modal) */
  onSuccess?: () => void;
  /** Submit button label */
  submitLabel?: string;
  /** Optional class for the form container */
  className?: string;
  /** Show compact layout (e.g. inside modal) */
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

export function PuppyInterestForm({
  initialPuppyId,
  preSelectedPuppy,
  puppies = [],
  onSuccess,
  submitLabel = "Submit Puppy Inquiry",
  className,
  compact = false,
}: PuppyInterestFormProps) {
  const { toast } = useToast();

  const form = useForm<PuppyInterestFormValues>({
    resolver: zodResolver(puppyInterestFormSchema),
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
    if (initialPuppyId) {
      form.setValue("interestedSpecific", "yes");
      form.setValue("selectedPuppyId", initialPuppyId);
    }
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
      // Preserve tri-state consent: true, false, or unspecified (null).
      consentCommunications: values.consentCommunications ?? null,
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
        title: "Interest Received!",
        description: "We'll get back to you soon.",
      });
      form.reset({ ...defaultValues, consentCommunications: undefined });
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to submit. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sectionClass = compact ? "space-y-4" : "space-y-6";
  const sectionTitleClass = "text-sm font-semibold text-foreground border-b pb-2";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-6", className)}>
        {/* 1. Personal Information */}
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="First name" {...field} />
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
                  <FormLabel>Last Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Last name" {...field} />
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
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} />
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
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="(123) 456-7890"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatUSPhone(e.target.value);
                        field.onChange(formatted);
                      }}
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
                  <FormLabel>City *</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
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
                  <FormLabel>State *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
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

        {/* 2. Puppy Preferences */}
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Puppy Preferences</h3>
          <FormField
            control={form.control}
            name="interestedSpecific"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Are you interested in a specific puppy? *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="specific-yes" />
                      <label htmlFor="specific-yes" className="cursor-pointer text-sm">
                        Yes (select specific puppy)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="specific-no" />
                      <label htmlFor="specific-no" className="cursor-pointer text-sm">
                        Not sure yet (I want recommendations)
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
                  <FormLabel>Select Puppy *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a puppy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {puppies.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name || "Unnamed"} — {p.breed}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPuppy && (
                    <p className="text-sm text-muted-foreground">
                      {selectedPuppy.breed} • {selectedPuppy.gender || "—"} • {selectedPuppy.color || "—"}
                      {getDisplayAgeWeeks(selectedPuppy) != null &&
                        ` • ${getDisplayAgeWeeks(selectedPuppy)} weeks`}
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
                <FormLabel>Type/Size Preference *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SIZE_PREFERENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
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
                <FormLabel>Breed Preference *</FormLabel>
                <FormDescription>Select one or more breeds</FormDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {BREED_PREFERENCE_OPTIONS.map((opt) => (
                    <FormField
                      key={opt.value}
                      control={form.control}
                      name="breedPreference"
                      render={({ field }) => {
                        const isChecked =
                          field.value?.includes(opt.value) ||
                          (opt.value === "No Preference" && field.value?.length === 0);
                        return (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (opt.value === "No Preference") {
                                    field.onChange(checked ? ["No Preference"] : []);
                                    return;
                                  }
                                  const next = checked
                                    ? [...(field.value || []).filter((v) => v !== "No Preference"), opt.value]
                                    : (field.value || []).filter((v) => v !== opt.value);
                                  field.onChange(next);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">{opt.label}</FormLabel>
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
                <FormLabel>Gender Preference</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "No Preference"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No Preference" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_PREFERENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
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
                <FormLabel>When are you looking to bring a puppy home? *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 3. Experience & Background */}
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Experience & Background</h3>
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Do you have puppy experience? *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
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
                <FormLabel>How did you hear about us? *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOW_HEARD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
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
                    {howHeard === "referred" ? "Friend's name (optional)" : "Please specify"}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={howHeard === "referred" ? "Friend's name" : "Specify"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* 4. Viewing Preference (Optional) */}
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Viewing Preference (Optional)</h3>
          <FormField
            control={form.control}
            name="viewingPreference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Would you be interested in meeting your puppy?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    className="flex flex-col gap-2"
                  >
                    {VIEWING_PREFERENCE_OPTIONS.map((o) => (
                      <div key={o.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={o.value} id={`view-${o.value}`} />
                        <label htmlFor={`view-${o.value}`} className="cursor-pointer text-sm">
                          {o.label}
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

        {/* 5. AI Training Resources (hidden for now) */}
        {SHOW_AI_TRAINING_SECTION && (
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Training Resources</h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex gap-3">
                <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">NEW! AI-Powered Training Schedules</p>
                  <p>
                    Using AI technology, we can create personalized training visuals and schedules for YOUR
                    puppy, including:
                  </p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>Feeding schedules</li>
                    <li>Potty training timeline</li>
                    <li>Crate training guide</li>
                    <li>Walking/exercise plan</li>
                  </ul>
                  <p className="pt-1">You'll receive a follow-up email with a questionnaire.</p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="wantsAiTraining"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer text-sm">
                      Yes, I'm interested in receiving personalized training resources
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* 6. Communications Consent (hidden for now) */}
        {SHOW_STAY_CONNECTED_SECTION && (
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Stay Connected (Optional)</h3>
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
                            I consent to receive communications from Puppy Heaven LLC regarding:
                          </FormLabel>
                          <ul className="list-disc list-inside text-muted-foreground ml-4">
                            <li>New available puppies</li>
                            <li>Special promotions and offers</li>
                            <li>Helpful puppy care information</li>
                            <li>Updates about my inquiry</li>
                          </ul>
                          <p className="text-muted-foreground pt-1">
                            We respect your privacy. You can unsubscribe anytime.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="inquiry-only" id="consent-inquiry-only" className="mt-1" />
                        <FormLabel htmlFor="consent-inquiry-only" className="font-normal cursor-pointer text-sm">
                          No, please only email me regarding this inquiry.
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
          <>
            {/* Compact inquiry-only follow-up option */}
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
                      Email me regarding this inquiry.
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Optional follow-up updates for this submission only.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Required fields marked *. We respect your privacy and will never share your information.
        </p>
      </form>
    </Form>
  );
}
