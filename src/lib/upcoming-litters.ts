import { supabase } from "@/lib/supabase";
import type {
  UpcomingLitter,
  UpcomingLitterPuppyPlaceholder,
} from "@/lib/supabase";

/** Shared query key for active upcoming litters (public + contact page). */
export const UPCOMING_LITTERS_ACTIVE_QUERY_KEY = ["upcoming-litters-active"] as const;

const SELECT_LITTER_WITH_PARENTS_AND_PLACEHOLDERS = `*,
  dam:breeding_dogs!dam_id(id, name, photo_path),
  sire:breeding_dogs!sire_id(id, name, photo_path),
  upcoming_litter_puppy_placeholders(
    id,
    upcoming_litter_id,
    public_ref_code,
    slot_index,
    sex,
    offspring_breed_label,
    lifecycle_status,
    created_at,
    updated_at
  )`;

const SELECT_LITTER_WITH_PARENTS = `*,
  dam:breeding_dogs!dam_id(id, name, photo_path),
  sire:breeding_dogs!sire_id(id, name, photo_path)`;

function normalizeLitterRow(row: Record<string, unknown>): UpcomingLitter {
  const raw = row.upcoming_litter_puppy_placeholders;
  const placeholders = Array.isArray(raw)
    ? (raw as UpcomingLitterPuppyPlaceholder[])
    : [];
  const puppy_placeholders = [...placeholders].sort(
    (a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0)
  );
  const { upcoming_litter_puppy_placeholders: _drop, ...rest } = row;
  return { ...rest, puppy_placeholders } as UpcomingLitter;
}

/**
 * Fetch active upcoming litters. Tries dam/sire join + puppy placeholders first; falls back if
 * the placeholders table or policy is not deployed yet.
 */
export async function fetchActiveUpcomingLitters(): Promise<UpcomingLitter[]> {
  let lastErr: Error | null = null;

  for (const selectStmt of [
    SELECT_LITTER_WITH_PARENTS_AND_PLACEHOLDERS,
    SELECT_LITTER_WITH_PARENTS,
    "*",
  ]) {
    const { data, error } = await supabase
      .from("upcoming_litters")
      .select(selectStmt)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error) {
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((row) =>
        selectStmt === SELECT_LITTER_WITH_PARENTS_AND_PLACEHOLDERS
          ? normalizeLitterRow(row)
          : ({ ...row, puppy_placeholders: [] } as UpcomingLitter)
      );
    }
    lastErr = error ?? new Error("Unknown error loading upcoming litters");
  }

  throw lastErr ?? new Error("Failed to load upcoming litters");
}
