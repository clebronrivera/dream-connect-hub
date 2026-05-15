// Admin-side reads/writes for the customers table.
//
// All reads require the admin RLS policy on `customers` to pass. Anon
// callers see nothing.

import { supabase, type Customer, type CustomerHistoryItem } from "@/lib/supabase";

export async function fetchCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Customer | null) ?? null;
}

/** Find a customer by raw email or raw phone. Either field is acceptable. */
export async function fetchCustomerByPhoneOrEmail(
  email?: string | null,
  phone?: string | null,
): Promise<Customer | null> {
  const normEmail = (email ?? "").trim().toLowerCase();
  const normPhone = (phone ?? "").replace(/[^0-9]/g, "");
  if (!normEmail && !normPhone) return null;

  let query = supabase.from("customers").select("*").limit(1);
  if (normEmail) {
    query = query.eq("email_normalized", normEmail);
  } else {
    query = query.eq("phone_digits", normPhone);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Customer | null) ?? null;
}

/** Returns all inquiries + deposit_requests for a given customer, newest first. */
export async function fetchCustomerHistory(
  customerId: string,
): Promise<CustomerHistoryItem[]> {
  const [{ data: inquiries, error: e1 }, { data: deposits, error: e2 }] =
    await Promise.all([
      supabase
        .from("puppy_inquiries")
        .select("id, created_at, puppy_name, puppy_id, status")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("deposit_requests")
        .select("id, created_at, puppy_name, puppy_id, request_status")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const items: CustomerHistoryItem[] = [
    ...((inquiries ?? []) as Array<{
      id: string;
      created_at: string;
      puppy_name: string | null;
      puppy_id: string | null;
      status: string | null;
    }>).map((r) => ({
      source: "puppy_inquiry" as const,
      id: r.id,
      created_at: r.created_at,
      puppy_name: r.puppy_name,
      puppy_id: r.puppy_id,
      status: r.status,
    })),
    ...((deposits ?? []) as Array<{
      id: string;
      created_at: string;
      puppy_name: string | null;
      puppy_id: string | null;
      request_status: string | null;
    }>).map((r) => ({
      source: "deposit_request" as const,
      id: r.id,
      created_at: r.created_at,
      puppy_name: r.puppy_name,
      puppy_id: r.puppy_id,
      status: r.request_status,
    })),
  ];
  items.sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
  return items;
}

/** Set or clear puppies.reserved_for_customer_id. Pass null to clear. */
export async function attachCustomerToPuppy(
  customerId: string | null,
  puppyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("puppies")
    .update({ reserved_for_customer_id: customerId })
    .eq("id", puppyId);
  if (error) throw new Error(error.message);
}

/** Typeahead helper for the "Reserved for" picker on the puppy form. */
export async function searchCustomers(term: string): Promise<Customer[]> {
  const q = term.trim();
  if (!q) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .or(
      `email.ilike.${like},phone.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`,
    )
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []) as Customer[];
}
