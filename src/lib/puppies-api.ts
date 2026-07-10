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
        "*, upcoming_litter:upcoming_litters(dam_id, sire_id, dam_name, sire_name, dam_photo_path, sire_photo_path)",
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

const PUPPY_DETAIL_SELECT =
  "*, upcoming_litter:upcoming_litters(dam_id, sire_id, dam_name, sire_name, dam_photo_path, sire_photo_path)";
const PUPPY_DETAIL_STATUSES = ["Available", "Reserved"] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PuppyDetailLookup =
  | { kind: "found"; puppy: Puppy }
  | { kind: "redirect"; slug: string }
  | { kind: "not-found" };

/**
 * Resolve a /puppies/:slugOrId URL param. Tries slug first (the canonical,
 * going-forward URL shape); falls back to id for pre-Phase-3 shared links
 * (PuppyShareDialog used to emit /puppies/{id}) so old links keep working —
 * callers should client-redirect to the canonical slug on a "redirect" result.
 * Only Available/Reserved puppies resolve; Sold/Deceased/Pending look like
 * "not-found" so no stale detail page stays indexable.
 */
export async function fetchPuppyBySlugOrId(param: string): Promise<PuppyDetailLookup> {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { supabase } = await import("@/lib/supabase");

  return runWithTransientRetries(async () => {
    const { data: bySlug, error: slugError } = await supabase
      .from("puppies")
      .select(PUPPY_DETAIL_SELECT)
      .eq("slug", param)
      .in("status", PUPPY_DETAIL_STATUSES)
      .maybeSingle();

    if (slugError) {
      console.error("Error fetching puppy by slug from Supabase:", slugError);
      if (isTransientSupabaseReadError(slugError)) {
        throw new Error(PUPPIES_TEMPORARY_LOAD_MESSAGE);
      }
      if (isPublicReadPolicyError(slugError.message, slugError.code)) {
        throw new Error(PUPPIES_RLS_MESSAGE);
      }
      throw new Error(`Puppy could not be loaded from Supabase: ${slugError.message}`);
    }
    if (bySlug) return { kind: "found", puppy: bySlug as Puppy };

    if (!UUID_PATTERN.test(param)) return { kind: "not-found" };

    const { data: byId, error: idError } = await supabase
      .from("puppies")
      .select("slug")
      .eq("id", param)
      .in("status", PUPPY_DETAIL_STATUSES)
      .maybeSingle();

    if (idError) {
      console.error("Error fetching puppy by id from Supabase:", idError);
      throw new Error(`Puppy could not be loaded from Supabase: ${idError.message}`);
    }
    if (byId?.slug) return { kind: "redirect", slug: byId.slug };

    return { kind: "not-found" };
  });
}

/**
 * Every Available/Reserved puppy with a slug — the working set for the
 * postbuild-seo.tsx prerender loop and sitemap. Sold/Deceased/Pending puppies
 * are excluded so no stale page stays indexable. Returns [] (not a throw)
 * when Supabase env isn't configured, matching postbuild-seo's degrade-gracefully
 * pattern for local/CI builds without secrets.
 */
export async function fetchPuppiesForPrerender(): Promise<Puppy[]> {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) return [];

  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("puppies")
    .select(PUPPY_DETAIL_SELECT)
    .in("status", PUPPY_DETAIL_STATUSES)
    .not("slug", "is", null);

  if (error) {
    console.error("Error fetching puppies for prerender from Supabase:", error);
    return [];
  }

  return (data ?? []) as Puppy[];
}

/** Slugs of Sold/Deceased puppies — used only by verify-seo-build.ts to assert
 *  none of them got a prerendered page. */
export async function fetchNonPublicPuppySlugsForVerify(): Promise<string[]> {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) return [];

  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("puppies")
    .select("slug")
    .not("status", "in", `(${PUPPY_DETAIL_STATUSES.join(",")})`)
    .not("slug", "is", null);

  if (error) {
    console.error("Error fetching non-public puppy slugs from Supabase:", error);
    return [];
  }

  return (data ?? []).map((row) => row.slug as string).filter(Boolean);
}
