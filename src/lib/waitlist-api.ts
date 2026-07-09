import { supabase } from "@/lib/supabase";

export interface WaitlistSignup {
  id: string;
  email: string;
  phone: string | null;
  breed_interest: string | null;
  size_interest: string | null;
  timeframe: string | null;
  created_at: string;
}

export interface WaitlistSignupPayload {
  email: string;
  phone?: string;
  breed_interest?: string;
  size_interest?: string;
  timeframe?: string;
}

/** Public insert — no auth required, used by <WaitlistForm />. */
export async function submitWaitlistSignup(payload: WaitlistSignupPayload): Promise<void> {
  const { error } = await supabase.from("waitlist_signups").insert(payload);
  if (error) throw new Error(error.message);
}

/** Admin-only read (RLS: admin_read_waitlist_signups). */
export async function fetchWaitlistSignups(): Promise<WaitlistSignup[]> {
  const { data, error } = await supabase
    .from("waitlist_signups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
