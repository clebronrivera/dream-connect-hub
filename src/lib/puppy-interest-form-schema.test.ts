import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { createPuppyInterestFormSchema } from "@/lib/puppy-interest-form-schema";

describe("puppy interest form schema", () => {
  it("returns English validation messages by default", () => {
    const schema = createPuppyInterestFormSchema(i18n.getFixedT("en"));
    const result = schema.safeParse({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      interestedSpecific: "no",
      selectedPuppyId: "",
      sizePreference: "",
      breedPreference: [],
      genderPreference: "No Preference",
      timeline: "",
      experience: "",
      howHeard: "",
      howHeardOther: "",
      viewingPreference: "",
      consentCommunications: undefined,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe("First name is required");
    expect(result.error.flatten().fieldErrors.state?.[0]).toBe("Please select a state");
  });

  it("returns Portuguese validation messages when the fixed translator is Portuguese", () => {
    const schema = createPuppyInterestFormSchema(i18n.getFixedT("pt"));
    const result = schema.safeParse({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      interestedSpecific: "no",
      selectedPuppyId: "",
      sizePreference: "",
      breedPreference: [],
      genderPreference: "No Preference",
      timeline: "",
      experience: "",
      howHeard: "",
      howHeardOther: "",
      viewingPreference: "",
      consentCommunications: undefined,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.firstName?.[0]).toBe("O nome é obrigatório");
    expect(result.error.flatten().fieldErrors.state?.[0]).toBe("Selecione um estado");
  });
});
