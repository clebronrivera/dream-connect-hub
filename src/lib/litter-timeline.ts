import { addDays, format, parseISO, isValid } from "date-fns";

/** Average dog pregnancy in days (breeding date → due/birth). */
export const BIRTH_DAYS_AVG = 63;
/** Half-range in days for due/birth window (~1 week total). */
const BIRTH_DAYS_RANGE = 3;
/** Weeks until puppies are ready to go home after due/birth date. */
export const GO_HOME_WEEKS_AFTER_DUE = 8;
const GO_HOME_DAYS = GO_HOME_WEEKS_AFTER_DUE * 7;

/**
 * Due (birth) window from breeding date: average 63 days, ~1 week approximation range.
 * Breeding date is the single input that drives when they're due.
 */
export function getBirthWindow(
  breedingDateStr: string | null | undefined
): { earliest: Date; latest: Date } | null {
  if (!breedingDateStr?.trim()) return null;
  try {
    const d = parseISO(breedingDateStr);
    if (!isValid(d)) return null;
    return {
      earliest: addDays(d, BIRTH_DAYS_AVG - BIRTH_DAYS_RANGE),
      latest: addDays(d, BIRTH_DAYS_AVG + BIRTH_DAYS_RANGE),
    };
  } catch {
    return null;
  }
}

/**
 * Go-home window: 8 weeks after due (birth) date, same ~1 week approximation range.
 */
export function getGoHomeWindow(
  breedingDateStr: string | null | undefined
): { earliest: Date; latest: Date } | null {
  const birth = getBirthWindow(breedingDateStr);
  if (!birth) return null;
  return {
    earliest: addDays(birth.earliest, GO_HOME_DAYS),
    latest: addDays(birth.latest, GO_HOME_DAYS),
  };
}

export function formatBirthWindow(breedingDateStr: string | null | undefined): string {
  const w = getBirthWindow(breedingDateStr);
  if (!w) return "—";
  return `${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}`;
}

/** Due label from breeding date: "Due approx. MMM d – MMM d, yyyy" (1-week range). */
export function getDueLabelFromBreedingDate(
  breedingDateStr: string | null | undefined
): string | null {
  const w = getBirthWindow(breedingDateStr);
  if (!w) return null;
  return `Due approx. ${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}, ${format(w.earliest, "yyyy")}`;
}

export function formatGoHomeWindow(breedingDateStr: string | null | undefined): string {
  const w = getGoHomeWindow(breedingDateStr);
  if (!w) return "—";
  return `${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}`;
}

/** Expected whelping (due) date: breeding date + 63 days. Returns ISO date string or null. */
export function getExpectedWhelpingDate(
  breedingDateStr: string | null | undefined
): string | null {
  if (!breedingDateStr?.trim()) return null;
  try {
    const d = parseISO(breedingDateStr);
    if (!isValid(d)) return null;
    return format(addDays(d, BIRTH_DAYS_AVG), "yyyy-MM-dd");
  } catch {
    return null;
  }
}
