// Step 4 — care-guide questionnaire. Optional in its entirety; serves the
// admin team in pairing the right care guide at pickup. Button selectors
// minimise typing; the 5 comfort ratings are a simple 1–5 scale.
//
// TODO(Carlos): confirm the five comfort-rating labels are the categories
// you actually want — placeholders below were chosen from the spec.

import { Controller, useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

const COMFORT_AREAS: Array<{ field: keyof WizardFormValues; label: string }> = [
  { field: 'care_comfort_potty', label: 'Potty training' },
  { field: 'care_comfort_grooming', label: 'Grooming routine' },
  { field: 'care_comfort_health', label: 'Vet visits & preventative health' },
  { field: 'care_comfort_social', label: 'Socializing your puppy' },
  { field: 'care_comfort_boundaries', label: 'Setting boundaries & training' },
];

const SCALE_LABELS = ['Not at all', 'A little', 'Comfortable', 'Confident', 'Very confident'];

export function StepCareGuide() {
  const { register, control } = useFormContext<WizardFormValues>();

  const ButtonChoice = <T extends string>({
    field,
    options,
  }: {
    field: keyof WizardFormValues;
    options: Array<{ value: T; label: string }>;
  }) => (
    <Controller
      name={field}
      control={control}
      render={({ field: ctrl }) => (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = ctrl.value === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                onClick={() => ctrl.onChange(selected ? '' : opt.value)}
                className={selected ? 'bg-primaryDeep hover:bg-primaryDeep/90 text-white' : ''}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      )}
    />
  );

  return (
    <div className="space-y-7">
      <p className="text-sm text-muted-foreground">
        None of these are required. They help us prepare the right take-home guide for your
        situation. Skip anything that doesn't apply.
      </p>

      <section className="space-y-3">
        <Label className="text-sm">Is this your first dog?</Label>
        <ButtonChoice
          field="q_first_dog"
          options={[
            { value: 'yes', label: 'Yes — first dog' },
            { value: 'no', label: 'No — had a dog before' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label className="text-sm">Where will your puppy live most of the time?</Label>
        <ButtonChoice
          field="q_living_situation"
          options={[
            { value: 'house_yard', label: 'House with yard' },
            { value: 'house_no_yard', label: 'House without yard' },
            { value: 'apartment', label: 'Apartment / condo' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label className="text-sm">Hours alone per day on a typical weekday?</Label>
        <ButtonChoice
          field="q_hours_alone"
          options={[
            { value: 'under_4', label: 'Under 4' },
            { value: '4_to_8', label: '4 to 8' },
            { value: 'over_8', label: 'Over 8' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label className="text-sm">Main goal for the puppy?</Label>
        <ButtonChoice
          field="q_puppy_goal"
          options={[
            { value: 'family_pet', label: 'Family pet' },
            { value: 'service', label: 'Service / therapy' },
            { value: 'show', label: 'Show / breeding' },
            { value: 'working', label: 'Working dog' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label className="text-sm">Dog training experience?</Label>
        <ButtonChoice
          field="q_training_experience"
          options={[
            { value: 'none', label: 'None' },
            { value: 'some', label: 'Some basics' },
            { value: 'extensive', label: 'Extensive' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <Label htmlFor="q_household_members" className="text-sm">
          Young children or other pets at home? (optional, free text)
        </Label>
        <Input
          id="q_household_members"
          {...register('q_household_members')}
          placeholder="e.g. one toddler + a senior cat"
        />
      </section>

      <section className="space-y-3 pt-2 border-t border-line">
        <Label className="text-sm">How comfortable do you feel with the following today?</Label>
        <p className="text-xs text-muted-foreground">
          1 = not at all, 5 = very confident. Helps us tailor the care guide.
        </p>
        <div className="space-y-4">
          {COMFORT_AREAS.map((area) => (
            <Controller
              key={area.field}
              name={area.field}
              control={control}
              render={({ field: ctrl }) => (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium text-ink">{area.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {typeof ctrl.value === 'number' ? SCALE_LABELS[(ctrl.value as number) - 1] : 'No rating'}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const selected = ctrl.value === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => ctrl.onChange(selected ? undefined : n)}
                          className={`h-9 flex-1 rounded-md text-sm font-semibold transition-colors ${
                            selected
                              ? 'bg-primaryDeep text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                          aria-pressed={selected}
                          aria-label={`${area.label}: ${n}`}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
