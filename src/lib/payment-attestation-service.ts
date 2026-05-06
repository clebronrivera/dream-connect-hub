// src/lib/payment-attestation-service.ts
// Wave H phase 1b: client-side helpers for the H1 + H2 buyer attestation
// flows on the payment dashboard. Both call into the public
// `submit-payment-attestation` edge function with token-in-body auth.
//
// File handling: the edge function accepts base64-encoded image data in
// the JSON body. We use FileReader.readAsDataURL to turn the chosen
// File into a `data:image/...;base64,...` string and pass it through;
// the function strips the data URL prefix server-side. A 6-MB cap on
// the encoded payload prevents accidental gigantic-photo uploads from
// failing slowly server-side.

import { supabase } from '@/lib/supabase-client';

export interface SubmitAttestationResult {
  ok: true;
  attestation_id: string;
  status: 'signed';
  screenshot_path: string;
}

export interface BuyerGeolocation {
  lat: number;
  lng: number;
  accuracy: number;
}

const MAX_BASE64_BYTES = 6 * 1024 * 1024; // ~6 MB encoded ≈ 4.5 MB raw

async function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) {
    throw new Error(`Unsupported file type: ${file.type}. Please upload an image.`);
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || typeof result !== 'string') {
        reject(new Error('Could not read file'));
        return;
      }
      if (result.length > MAX_BASE64_BYTES) {
        reject(new Error('Image too large. Please choose a screenshot smaller than ~4 MB.'));
        return;
      }
      resolve({ data: result, mime: file.type || 'image/png' });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Surface the edge function's structured error body as Error.message. */
async function unwrapInvokeError(err: unknown): Promise<string> {
  let detail = (err as Error)?.message ?? 'Request failed';
  try {
    // @ts-expect-error context is a Response on FunctionsHttpError
    const ctx: Response | undefined = err?.context;
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) detail = body.details ? `${body.error}: ${body.details}` : body.error;
    }
  } catch {
    /* ignore parse errors */
  }
  return detail;
}

/**
 * H1: buyer signs the payment attestation and uploads a screenshot of
 * their payment-app handle. UPSERTs the attestation row to
 * attestation_status='signed' on success.
 */
export async function submitH1Attestation(args: {
  agreementId: string;
  buyerToken: string;
  paymentMethodHandleToUse: string;
  buyerPaymentHandle: string;
  buyerPhoneAtPayment?: string;
  paymentAttestationText: string;
  geolocation: BuyerGeolocation | null;
  handleScreenshotFile: File;
}): Promise<SubmitAttestationResult> {
  const screenshot = await fileToBase64(args.handleScreenshotFile);

  const { data, error } = await supabase.functions.invoke<SubmitAttestationResult>(
    'submit-payment-attestation',
    {
      body: {
        step: 'h1_sign',
        agreement_id: args.agreementId,
        buyer_access_token: args.buyerToken,
        payment_method_handle_to_use: args.paymentMethodHandleToUse,
        buyer_payment_handle: args.buyerPaymentHandle,
        buyer_phone_at_payment: args.buyerPhoneAtPayment ?? undefined,
        payment_attestation_text: args.paymentAttestationText,
        payment_attestation_geolocation: args.geolocation,
        handle_screenshot_base64: screenshot.data,
        handle_screenshot_mime: screenshot.mime,
      },
    },
  );
  if (error) throw new Error(await unwrapInvokeError(error));
  return data!;
}

/**
 * H2: buyer uploads the post-payment confirmation screenshot and types
 * the transaction reference id. Requires H1 to have been signed first;
 * the edge function returns 409 otherwise.
 */
export async function submitH2Confirmation(args: {
  agreementId: string;
  buyerToken: string;
  transactionReferenceId: string;
  paymentMemoUsed?: string;
  confirmationScreenshotFile: File;
}): Promise<SubmitAttestationResult> {
  const screenshot = await fileToBase64(args.confirmationScreenshotFile);

  const { data, error } = await supabase.functions.invoke<SubmitAttestationResult>(
    'submit-payment-attestation',
    {
      body: {
        step: 'h2_confirm',
        agreement_id: args.agreementId,
        buyer_access_token: args.buyerToken,
        transaction_reference_id: args.transactionReferenceId,
        payment_memo_used: args.paymentMemoUsed ?? undefined,
        confirmation_screenshot_base64: screenshot.data,
        confirmation_screenshot_mime: screenshot.mime,
      },
    },
  );
  if (error) throw new Error(await unwrapInvokeError(error));
  return data!;
}

/**
 * Best-effort geolocation prompt. Wraps the browser API in a promise so
 * the dashboard can `await` it without callbacks. Returns null on denial,
 * timeout, or any error — the H1 flow accepts a null geolocation.
 */
export function tryGetGeolocation(timeoutMs = 8000): Promise<BuyerGeolocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(t);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
