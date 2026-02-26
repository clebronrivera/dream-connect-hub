/**
 * Compute age in weeks from date of birth to today.
 * Returns null if dateOfBirth is missing or invalid.
 */
export function getAgeWeeks(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  const diffMs = today.getTime() - dob.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks >= 0 ? diffWeeks : null;
}

export interface PuppyWithAge {
  date_of_birth?: string | null;
  age_weeks?: number | null;
}

/**
 * Get age in weeks for display: computed from date_of_birth when available,
 * otherwise fall back to stored age_weeks.
 */
export function getDisplayAgeWeeks(puppy: PuppyWithAge): number | null {
  const computed = getAgeWeeks(puppy.date_of_birth);
  if (computed != null) return computed;
  if (puppy.age_weeks != null && puppy.age_weeks >= 0) return puppy.age_weeks;
  return null;
}

/** Number of weeks after DOB when the puppy is "ready" (e.g. to go home). */
export const READY_WEEKS_AFTER_DOB = 8;

/**
 * Compute ready date as DOB + 8 weeks.
 * Returns YYYY-MM-DD string or null if dateOfBirth is missing/invalid.
 */
export function getReadyDateFromDob(dateOfBirth: string | null | undefined): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const ready = new Date(dob);
  ready.setDate(ready.getDate() + READY_WEEKS_AFTER_DOB * 7);
  return ready.toISOString().slice(0, 10);
}
