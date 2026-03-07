import { addDays, format, parseISO, isValid } from "date-fns";

export function getBirthWindow(
  breedingDateStr: string | null | undefined
): { earliest: Date; latest: Date } | null {
  if (!breedingDateStr?.trim()) return null;
  try {
    const d = parseISO(breedingDateStr);
    if (!isValid(d)) return null;
    return { earliest: addDays(d, 60), latest: addDays(d, 67) };
  } catch {
    return null;
  }
}

export function getGoHomeWindow(
  breedingDateStr: string | null | undefined
): { earliest: Date; latest: Date } | null {
  const birth = getBirthWindow(breedingDateStr);
  if (!birth) return null;
  return {
    earliest: addDays(birth.earliest, 56),
    latest: addDays(birth.latest, 56),
  };
}

export function formatBirthWindow(breedingDateStr: string | null | undefined): string {
  const w = getBirthWindow(breedingDateStr);
  if (!w) return "—";
  return `${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}`;
}

export function formatGoHomeWindow(breedingDateStr: string | null | undefined): string {
  const w = getGoHomeWindow(breedingDateStr);
  if (!w) return "—";
  return `${format(w.earliest, "MMM d")} – ${format(w.latest, "MMM d")}`;
}
