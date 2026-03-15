import { supabase } from "@/lib/supabase";
import type { UpcomingLitter } from "@/lib/supabase";

/** Shared query key for active upcoming litters (public + contact page). */
export const UPCOMING_LITTERS_ACTIVE_QUERY_KEY = ["upcoming-litters-active"] as const;

/** Fetch active upcoming litters with dam/sire from breeding_dogs so their photos are used. */
export async function fetchActiveUpcomingLitters(): Promise<UpcomingLitter[]> {
  const { data, error } = await supabase
    .from("upcoming_litters")
    .select(
      `*,
      dam:breeding_dogs!dam_id(id, name, photo_path),
      sire:breeding_dogs!sire_id(id, name, photo_path)`
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UpcomingLitter[];
}
