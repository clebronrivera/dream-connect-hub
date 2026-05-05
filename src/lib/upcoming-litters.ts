import { supabase } from "@/lib/supabase";
import { isTransientSupabaseReadError, runWithTransientRetries } from "@/lib/supabase-query-retry";
import type { UpcomingLitter } from "@/lib/supabase";

/** Shared query key for active upcoming litters (public + contact page). */
export const UPCOMING_LITTERS_ACTIVE_QUERY_KEY = ["upcoming-litters-active"] as const;

const PARENT_FIELDS = "id, name, role, breed, composition, color, photo_path";

const SELECT_LITTER_WITH_PARENTS = `*,
  dam:breeding_dogs!dam_id(${PARENT_FIELDS}),
  sire:breeding_dogs!sire_id(${PARENT_FIELDS})`;

/**
 * Fetch active pre-birth upcoming litters. Tries dam/sire join first; falls back to raw rows.
 */
export async function fetchActiveUpcomingLitters(): Promise<UpcomingLitter[]> {
  return runWithTransientRetries(async () => {
    let lastErr: Error | null = null;

    for (const selectStmt of [
      SELECT_LITTER_WITH_PARENTS,
      "*",
    ]) {
      const { data, error } = await supabase
        .from("upcoming_litters")
        .select(selectStmt)
        .eq("is_active", true)
        .eq("lifecycle_status", "pre_birth")
        .order("breeding_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!error) {
        return (data ?? []) as UpcomingLitter[];
      }
      if (isTransientSupabaseReadError(error)) {
        throw new Error(error.message);
      }
      lastErr = error ?? new Error("Unknown error loading upcoming litters");
    }

    throw lastErr ?? new Error("Failed to load upcoming litters");
  });
}
