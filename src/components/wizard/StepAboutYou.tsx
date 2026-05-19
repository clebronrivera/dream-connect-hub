// Step 3 — buyer identity, address, pickup date + preferences. Address
// fields use HTML `autocomplete` attributes so browsers can autofill.
//
// All fields are validated on Next via the schema's per-step gate (see
// `fieldsByStep.about_you` in `wizardSchema.ts`).

import { Controller, useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { US_STATES } from '@/data/statesData';
import type { WizardFormValues } from '@/components/wizard/wizardSchema';

interface StepAboutYouProps {
  earliestPickupStr: string;
  earliestPickup: Date | null;
}

export function StepAboutYou({ earliestPickupStr, earliestPickup }: StepAboutYouProps) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<WizardFormValues>();

  return (
    <div className="space-y-6">
      {/* Identity */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          You
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="buyer_name">Full legal name *</Label>
            <Input id="buyer_name" autoComplete="name" {...register('buyer_name')} />
            {errors.buyer_name && (
              <p className="text-xs text-red-500 mt-1">{errors.buyer_name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="buyer_email">Email *</Label>
            <Input
              id="buyer_email"
              type="email"
              autoComplete="email"
              {...register('buyer_email')}
            />
            {errors.buyer_email && (
              <p className="text-xs text-red-500 mt-1">{errors.buyer_email.message}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="buyer_phone">Phone *</Label>
            <Input id="buyer_phone" type="tel" autoComplete="tel" {...register('buyer_phone')} />
            {errors.buyer_phone && (
              <p className="text-xs text-red-500 mt-1">{errors.buyer_phone.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Address
        </h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="buyer_street">Street address *</Label>
            <Input
              id="buyer_street"
              autoComplete="street-address"
              {...register('buyer_street')}
              placeholder="123 Main St, Apt 4"
            />
            {errors.buyer_street && (
              <p className="text-xs text-red-500 mt-1">{errors.buyer_street.message}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="buyer_city">City *</Label>
              <Input
                id="buyer_city"
                autoComplete="address-level2"
                {...register('buyer_city')}
              />
              {errors.buyer_city && (
                <p className="text-xs text-red-500 mt-1">{errors.buyer_city.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="buyer_state">State *</Label>
              <Controller
                name="buyer_state"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="buyer_state">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.buyer_state && (
                <p className="text-xs text-red-500 mt-1">{errors.buyer_state.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="buyer_zip">ZIP *</Label>
              <Input
                id="buyer_zip"
                autoComplete="postal-code"
                inputMode="numeric"
                {...register('buyer_zip')}
                placeholder="32801"
              />
              {errors.buyer_zip && (
                <p className="text-xs text-red-500 mt-1">{errors.buyer_zip.message}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pickup */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pickup
        </h2>
        <div>
          <Label htmlFor="proposed_pickup_date">Primary pickup date *</Label>
          <Input
            id="proposed_pickup_date"
            type="date"
            min={earliestPickupStr}
            {...register('proposed_pickup_date')}
          />
          {errors.proposed_pickup_date && (
            <p className="text-xs text-red-500 mt-1">{errors.proposed_pickup_date.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {earliestPickup
              ? `Earliest pickup: ${format(earliestPickup, 'MMM d, yyyy')} (puppies go home at 8 weeks).`
              : 'Pick any date — earliest pickup will be set once the litter is born (8 weeks after birth).'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pickup_time_preference">Preferred time</Label>
            <Controller
              name="pickup_time_preference"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="pickup_time_preference">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="pickup_day_preference">Preferred day</Label>
            <Controller
              name="pickup_day_preference"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="pickup_day_preference">
                    <SelectValue placeholder="No preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekday">Weekday</SelectItem>
                    <SelectItem value="weekend">Weekend</SelectItem>
                    <SelectItem value="either">Either</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="pickup_notes">Notes (optional)</Label>
          <Textarea
            id="pickup_notes"
            rows={2}
            {...register('pickup_notes')}
            placeholder="e.g. driving in from out of state; need help with a crate; etc."
          />
        </div>
      </section>
    </div>
  );
}
