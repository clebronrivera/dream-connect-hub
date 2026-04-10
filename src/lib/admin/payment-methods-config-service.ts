// src/lib/admin/payment-methods-config-service.ts
// CRUD for payment_methods_config table (admin)

import { supabase } from '@/lib/supabase-client';
import type { PaymentMethodConfig } from '@/types/deposit';

const BUCKET = 'puppy-photos'; // reuse existing bucket
const QR_PREFIX = 'payment-qr';

/** Fetch all payment method configs ordered by display_order */
export async function fetchPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const { data, error } = await supabase
    .from('payment_methods_config')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentMethodConfig[];
}

/** Toggle a payment method enabled/disabled */
export async function togglePaymentMethod(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('payment_methods_config')
    .update({ is_enabled: enabled })
    .eq('id', id);

  if (error) throw error;
}

/** Update handle/recipient for a payment method */
export async function updatePaymentHandle(id: string, handle: string): Promise<void> {
  const { error } = await supabase
    .from('payment_methods_config')
    .update({ handle_or_recipient: handle })
    .eq('id', id);

  if (error) throw error;
}

/** Update payment note for a payment method */
export async function updatePaymentNote(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('payment_methods_config')
    .update({ payment_note: note })
    .eq('id', id);

  if (error) throw error;
}

/** Upload QR code image and update the config row */
export async function uploadQrCode(
  id: string,
  methodKey: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${QR_PREFIX}/${methodKey}-${Date.now()}.${ext}`;

  const { data, error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadErr) throw new Error(`QR upload failed: ${uploadErr.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  const { error: updateErr } = await supabase
    .from('payment_methods_config')
    .update({
      qr_code_storage_path: data.path,
      qr_code_public_url: publicUrl,
    })
    .eq('id', id);

  if (updateErr) throw updateErr;
  return publicUrl;
}

/** Remove QR code from storage and clear the config row */
export async function removeQrCode(id: string, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]);

  const { error } = await supabase
    .from('payment_methods_config')
    .update({
      qr_code_storage_path: null,
      qr_code_public_url: null,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Reorder payment methods — accepts array of { id, display_order } */
export async function reorderPaymentMethods(
  order: { id: string; display_order: number }[]
): Promise<void> {
  // Use Promise.all since Supabase doesn't support batch updates natively
  const updates = order.map(({ id, display_order }) =>
    supabase
      .from('payment_methods_config')
      .update({ display_order })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}
