import type { Puppy } from "@/lib/supabase";
import { appEnv } from "@/lib/env";
import { isTransientSupabaseReadError, runWithTransientRetries } from "@/lib/supabase-query-retry";

export const MISSING_SUPABASE_CONFIG_MESSAGE =
  "Puppies cannot load because Supabase client settings are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the site environment, then redeploy.";
export const PUPPIES_RLS_MESSAGE =
  "Puppies cannot load because Supabase is blocking public read access. Check the puppies table SELECT policy / RLS settings for the anon role.";
export const PUPPIES_TEMPORARY_LOAD_MESSAGE =
  "Puppies are taking longer to load right now. Please refresh and try again.";

export function isPublicReadPolicyError(message: string, code?: string): boolean {
  const normalized = message.toLowerCase();
  return (
    code === "42501" ||
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("not allowed") ||
    normalized.includes("not authorized")
  );
}

/** Fetch publicly visible puppies for customer-facing surfaces. */
export async function fetchAvailablePuppies(): Promise<Puppy[]> {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { supabase } = await import("@/lib/supabase");

  return runWithTransientRetries(async () => {
    // Join the puppy's upcoming_litter so the public card can show dam/sire
    // thumbnails. Left-join shape: puppies without an upcoming_litter_id
    // (post-birth orphans or older rows) come back with upcoming_litter=null.
    const { data, error } = await supabase
      .from("puppies")
      .select(
        "*, upcoming_litter:upcoming_litters(dam_name, sire_name, dam_photo_path, sire_photo_path)",
      )
      .eq("is_publicly_visible", true)
      .eq("is_deceased", false)
      .eq("status", "Available")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching puppies from Supabase:", error);
      if (isTransientSupabaseReadError(error)) {
        throw new Error(PUPPIES_TEMPORARY_LOAD_MESSAGE);
      }
      if (isPublicReadPolicyError(error.message, error.code)) {
        throw new Error(PUPPIES_RLS_MESSAGE);
      }
      throw new Error(`Puppies could not be loaded from Supabase: ${error.message}`);
    }

    return (data ?? []) as Puppy[];
  });
}
