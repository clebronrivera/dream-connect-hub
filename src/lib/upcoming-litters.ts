import { supabase } from "@/lib/supabase";
import type { UpcomingLitter } from "@/lib/supabase";

/** Shared query key for active upcoming litters (public + contact page). */
export const UPCOMING_LITTERS_ACTIVE_QUERY_KEY = ["upcoming-litters-active"] as const;

/**
 * Fetch active upcoming litters. Tries with dam/sire join first so card photos use
 * breeding_dogs.photo_path; if that fails (e.g. RLS or join syntax), falls back to
 * plain select so litters still load using denormalized dam_name/sire_name/dam_photo_path/sire_photo_path.
 */
export async function fetchActiveUpcomingLitters(): Promise<UpcomingLitter[]> {
  const base = supabase
    .from("upcoming_litters")
    .select(
      `*,
      dam:breeding_dogs!dam_id(id, name, photo_path),
      sire:breeding_dogs!sire_id(id, name, photo_path)`
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data, error } = await base;

  if (error) {
    // Fallback: fetch without join so public page still shows litters (denormalized fields only).
    const fallback = await supabase
      .from("upcoming_litters")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data ?? []) as UpcomingLitter[];
  }

  return (data ?? []) as UpcomingLitter[];
}
