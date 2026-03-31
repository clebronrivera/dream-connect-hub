import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Strip to digits only; US phone must have 10 digits */
const phoneDigitsOnly = (v: string) => v.replace(/\D/g, "");
const usPhoneValid = (v: string) => phoneDigitsOnly(v).length === 10;

export const puppyInterestFormSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50)
      .regex(/^[a-zA-Z\s\-']+$/, "Letters only"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50)
      .regex(/^[a-zA-Z\s\-']+$/, "Letters only"),
    email: z
      .string()
      .min(1, "Email is required")
      .regex(emailRegex, "Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone is required")
      .refine(usPhoneValid, "Please enter a valid US phone number (10 digits)"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "Please select a state"),

    interestedSpecific: z.enum(["yes", "no"]),
    selectedPuppyId: z.string().optional(),
    sizePreference: z.string().min(1, "Please select a size preference"),
    breedPreference: z
      .array(z.string())
      .refine((arr) => arr && arr.length > 0, "Please select at least one breed or No Preference"),
    genderPreference: z.string().optional(),
    timeline: z.string().min(1, "Please select when you're looking to bring a puppy home"),

    experience: z.string().min(1, "Please select your experience level"),
    howHeard: z.string().min(1, "Please select how you heard about us"),
    howHeardOther: z.string().optional(),
    viewingPreference: z.string().optional(),

    wantsAiTraining: z.boolean().optional(),
    consentCommunications: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.interestedSpecific !== "yes") return true;
      return !!data.selectedPuppyId?.trim();
    },
    { message: "Please select a puppy", path: ["selectedPuppyId"] }
  )
  .refine(
    (data) => {
      if (data.howHeard !== "referred" && data.howHeard !== "other") return true;
      if (data.howHeard === "other") return true; // "Other" has optional specify field
      return true;
    },
    { path: ["howHeardOther"] }
  );

export type PuppyInterestFormValues = z.infer<typeof puppyInterestFormSchema>;

/** Format US phone as (123) 456-7890 */
export function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}