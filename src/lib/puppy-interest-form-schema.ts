import type { TFunction } from "i18next";
import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Strip to digits only; US phone must have 10 digits */
const phoneDigitsOnly = (v: string) => v.replace(/\D/g, "");
const usPhoneValid = (v: string) => phoneDigitsOnly(v).length === 10;

export function createPuppyInterestFormSchema(t: TFunction) {
  return z
    .object({
      firstName: z
        .string()
        .min(1, t("forms.puppyInterest.validation.firstNameRequired"))
        .max(50)
        .regex(/^[a-zA-Z\s\-']+$/, t("forms.puppyInterest.validation.lettersOnly")),
      lastName: z
        .string()
        .min(1, t("forms.puppyInterest.validation.lastNameRequired"))
        .max(50)
        .regex(/^[a-zA-Z\s\-']+$/, t("forms.puppyInterest.validation.lettersOnly")),
      email: z
        .string()
        .min(1, t("forms.puppyInterest.validation.emailRequired"))
        .regex(emailRegex, t("forms.puppyInterest.validation.validEmail")),
      phone: z
        .string()
        .min(1, t("forms.puppyInterest.validation.phoneRequired"))
        .refine(
          usPhoneValid,
          t("forms.puppyInterest.validation.validPhone")
        ),
      city: z.string().min(1, t("forms.puppyInterest.validation.cityRequired")),
      state: z
        .string()
        .min(1, t("forms.puppyInterest.validation.selectState")),

      interestedSpecific: z.enum(["yes", "no"]),
      selectedPuppyId: z.string().optional(),
      sizePreference: z
        .string()
        .min(1, t("forms.puppyInterest.validation.selectSize")),
      breedPreference: z
        .array(z.string())
        .refine(
          (arr) => arr && arr.length > 0,
          t("forms.puppyInterest.validation.selectBreed")
        ),
      genderPreference: z.string().optional(),
      timeline: z
        .string()
        .min(1, t("forms.puppyInterest.validation.selectTimeline")),

      experience: z
        .string()
        .min(1, t("forms.puppyInterest.validation.selectExperience")),
      howHeard: z
        .string()
        .min(1, t("forms.puppyInterest.validation.selectHowHeard")),
      howHeardOther: z.string().optional(),
      viewingPreference: z.string().optional(),

      wantsAiTraining: z.boolean().optional(),
      consentCommunications: z.boolean({
        required_error: t("forms.puppyInterest.validation.selectConsent"),
      }),
    })
    .refine(
      (data) => {
        if (data.interestedSpecific !== "yes") return true;
        return !!data.selectedPuppyId?.trim();
      },
      {
        message: t("forms.puppyInterest.validation.selectPuppy"),
        path: ["selectedPuppyId"],
      }
    )
    .refine(
      (data) => {
        if (data.howHeard !== "referred" && data.howHeard !== "other") return true;
        if (data.howHeard === "other") return true;
        return true;
      },
      { path: ["howHeardOther"] }
    );
}

export type PuppyInterestFormValues = z.infer<
  ReturnType<typeof createPuppyInterestFormSchema>
>;

/** Format US phone as (123) 456-7890 */
export function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
