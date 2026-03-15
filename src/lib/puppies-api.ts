import type { Puppy } from "@/lib/supabase";
import { appEnv } from "@/lib/env";

export const MISSING_SUPABASE_CONFIG_MESSAGE =
  "Puppies cannot load because Supabase client settings are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the site environment, then redeploy.";
export const PUPPIES_RLS_MESSAGE =
  "Puppies cannot load because Supabase is blocking public read access. Check the puppies table SELECT policy / RLS settings for the anon role.";

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

/** Fetch only Available puppies for public/customer list. Shared by Puppies page and landing marquee. */
export async function fetchAvailablePuppies(): Promise<Puppy[]> {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error(MISSING_SUPABASE_CONFIG_MESSAGE);
  }

  const { supabase } = await import("@/lib/supabase");
  const { data, error } = await supabase
    .from("puppies")
    .select("*")
    .eq("status", "Available")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching puppies from Supabase:", error);
    if (isPublicReadPolicyError(error.message, error.code)) {
      throw new Error(PUPPIES_RLS_MESSAGE);
    }
    throw new Error(`Puppies could not be loaded from Supabase: ${error.message}`);
  }

  return data || [];
}
