// src/lib/admin/pickup-handover-service.ts
// Wave H phase 2 (H4). Admin client-side helpers for the in-person pickup
// handover flow at /admin/pickup/:agreementId.
//
// All paths run with the admin's JWT — admin_all_pickup_handovers and
// admin_all_pickup_evidence_objects RLS policies (see
// 20260506000010_pickup_handovers.sql) gate the writes.

import { supabase } from '@/lib/supabase-client';
import type { PickupHandover } from '@/types/pickup-handover';

const BUCKET = 'pickup-evidence';

export type PickupPhotoKind =
  | 'buyer_with_puppy'
  | 'buyer_with_id'
  | 'pickup_location';

/** Fetch the existing handover row, if any, for an agreement. */
export async function fetchPickupHandover(
  agreementId: string
): Promise<PickupHandover | null> {
  const { data, error } = await supabase
    .from('pickup_handovers')
    .select('*')
    .eq('agreement_id', agreementId)
    .maybeSingle();
  if (error) throw error;
  return data as PickupHandover | null;
}

/** Upload a pickup-day photo to the private pickup-evidence bucket and
 * return the storage path. Admin-only via RLS. */
export async function uploadPickupPhoto(
  agreementId: string,
  kind: PickupPhotoKind,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type: ${file.type}. Please upload an image.`);
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${agreementId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/** Mint a short-lived signed URL for displaying a pickup photo in the
 * admin UI. The bucket is private so we cannot use getPublicUrl. */
export async function getPickupPhotoSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw new Error(`Failed to mint signed URL: ${error.message}`);
  return data.signedUrl;
}

/** UPSERT the pickup_handovers row. Used as the operator fills in the
 * tablet form — partial saves keep state if the operator navigates away. */
export async function upsertPickupHandover(
  payload: Partial<PickupHandover> & { agreement_id: string; pickup_date: string }
): Promise<PickupHandover> {
  const { data, error } = await supabase
    .from('pickup_handovers')
    .upsert(payload, { onConflict: 'agreement_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PickupHandover;
}

/** Invoke the finalize-pickup-handover edge function. The function
 * verifies admin via JWT, checks all required fields are populated,
 * flips handover_status to 'in_person_verified', transitions the linked
 * puppy to Sold, and sends the welcome email. */
export async function finalizePickupHandover(
  agreementId: string
): Promise<{ success: true; handover_id?: string; already_verified?: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('No active session');

  const { data, error } = await supabase.functions.invoke<{
    success: true;
    handover_id?: string;
    already_verified?: boolean;
  }>('finalize-pickup-handover', {
    body: { agreement_id: agreementId },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw error;
  return data!;
}
