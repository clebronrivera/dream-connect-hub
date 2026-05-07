// supabase/functions/mark-payment-sent/index.test.ts — Wave G1
//
// Deno unit tests for the mark-payment-sent edge function handler.
// Run with: deno test --allow-env --no-check supabase/functions/mark-payment-sent/index.test.ts
//
// Tests cover:
//   - Method routing (OPTIONS/GET → correct response)
//   - Invalid/missing buyer token → 400/403/404
//   - Idempotency: buyer_marked_payment_sent_at already set → 200 already_marked
//   - Lifecycle gate: past initial state → 409
//   - H1 attestation preconditions (5 individual failure cases)
//   - Full happy-path → 200 success

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/mark-payment-sent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Fully-populated valid agreement row (token valid, not yet marked). */
const VALID_AGREEMENT = {
  id: "agr-1",
  agreement_number: "DP-0001",
  buyer_name: "Maria Souza",
  buyer_email: "maria@example.com",
  buyer_phone: "555-1234",
  puppy_name: "Luna",
  deposit_amount: 300,
  deposit_payment_method: "zelle",
  payment_memo: "DP-0001 LUNA DEP",
  buyer_access_token: "tok-good",
  buyer_access_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
  buyer_marked_payment_sent_at: null,
  agreement_status: "sent",
  deposit_status: "pending",
};

/** Fully-completed attestation row. */
const VALID_ATTESTATION = {
  attestation_status: "signed",
  buyer_payment_handle_screenshot_path: "payment-evidence/agr-1/handle-123.png",
  confirmation_screenshot_path: "payment-evidence/agr-1/confirm-456.png",
  transaction_reference_id: "ZL-7891234567",
};

/**
 * Build a mock Supabase client for mark-payment-sent tests.
 *
 * verifyBuyerToken makes two queries:
 *   1. deposit_agreements: .select('*').eq('id', ...).maybeSingle()
 *
 * Then the handler makes:
 *   2. payment_attestations: .select(...).eq(...).maybeSingle()
 *   3. deposit_agreements: .update(...).eq(...).is(...).select('id').maybeSingle()
 *   4. (optional) email send — mocked via env / getAdminRecipients returning []
 *
 * We use a queue to return different results for each successive .maybeSingle() call.
 */
function buildMockClient(options: {
  agreementResult: { data: typeof VALID_AGREEMENT | null; error: Error | null };
  attestationResult?: { data: typeof VALID_ATTESTATION | null; error: Error | null };
  updateResult?: { data: { id: string } | null; error: Error | null };
}): SupabaseClient {
  const results = [
    options.agreementResult,
    options.attestationResult ?? { data: VALID_ATTESTATION, error: null },
    options.updateResult   ?? { data: { id: "agr-1" }, error: null },
  ];
  let callIndex = 0;

  const maybeSingleFn = async () => results[callIndex++] ?? { data: null, error: null };

  const chain = (): unknown => ({
    select:      () => chain(),
    update:      () => chain(),
    eq:          () => chain(),
    is:          () => chain(),
    not:         () => chain(),
    maybeSingle: maybeSingleFn,
  });

  return { from: () => chain() } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("mark-payment-sent: OPTIONS returns 204", async () => {
  const req = new Request("http://localhost/mark-payment-sent", {
    method: "OPTIONS",
  });
  const res = await handler(req);
  assertEquals(res.status, 204);
});

Deno.test("mark-payment-sent: GET returns 405", async () => {
  const req = new Request("http://localhost/mark-payment-sent", {
    method: "GET",
  });
  const res = await handler(req);
  assertEquals(res.status, 405);
});

Deno.test("mark-payment-sent: malformed JSON returns 400", async () => {
  const req = new Request("http://localhost/mark-payment-sent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not-valid-json",
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("mark-payment-sent: agreement not found returns 404", async () => {
  const client = buildMockClient({
    agreementResult: { data: null, error: null }, // no row → not found
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "wrong-tok" });
  const res = await handler(req, client);
  assertEquals(res.status, 404);
});

Deno.test("mark-payment-sent: expired token returns 403", async () => {
  const expiredAgreement = {
    ...VALID_AGREEMENT,
    buyer_access_token_expires_at: new Date(Date.now() - 86400000).toISOString(),
  };
  const client = buildMockClient({
    agreementResult: { data: expiredAgreement, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error, "Buyer access token has expired");
});

Deno.test("mark-payment-sent: already marked returns 200 with already_marked=true", async () => {
  const markedAgreement = {
    ...VALID_AGREEMENT,
    buyer_marked_payment_sent_at: "2026-05-07T10:00:00Z",
  };
  const client = buildMockClient({
    agreementResult: { data: markedAgreement, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.already_marked, true);
  assertEquals(body.marked_at, "2026-05-07T10:00:00Z");
});

Deno.test("mark-payment-sent: lifecycle gate — agreement_status != sent returns 409", async () => {
  const finalizedAgreement = {
    ...VALID_AGREEMENT,
    agreement_status: "admin_approved",
  };
  const client = buildMockClient({
    agreementResult: { data: finalizedAgreement, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 409);
  const body = await res.json();
  assertEquals(body.agreement_status, "admin_approved");
});

Deno.test("mark-payment-sent: H1 gate — no attestation row returns 422 h1_attestation", async () => {
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: null, error: null }, // no attestation row
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.missing_precondition, "h1_attestation");
});

Deno.test("mark-payment-sent: H1 gate — attestation_status=draft returns 422 h1_attestation", async () => {
  const draftAttestation = { ...VALID_ATTESTATION, attestation_status: "draft" };
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: draftAttestation, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.missing_precondition, "h1_attestation");
});

Deno.test("mark-payment-sent: H1 gate — missing handle screenshot returns 422 h1_handle_screenshot", async () => {
  const noScreenshot = {
    ...VALID_ATTESTATION,
    buyer_payment_handle_screenshot_path: null,
  };
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: noScreenshot, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.missing_precondition, "h1_handle_screenshot");
});

Deno.test("mark-payment-sent: H2 gate — missing confirmation screenshot returns 422 h2_confirmation_screenshot", async () => {
  const noConfirm = {
    ...VALID_ATTESTATION,
    confirmation_screenshot_path: null,
  };
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: noConfirm, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.missing_precondition, "h2_confirmation_screenshot");
});

Deno.test("mark-payment-sent: H2 gate — missing transaction_reference_id returns 422 h2_transaction_reference_id", async () => {
  const noRef = {
    ...VALID_ATTESTATION,
    transaction_reference_id: null,
  };
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: noRef, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 422);
  const body = await res.json();
  assertEquals(body.missing_precondition, "h2_transaction_reference_id");
});

Deno.test("mark-payment-sent: happy path — all preconditions met returns 200 success", async () => {
  // Build a client where the UPDATE also succeeds
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: VALID_ATTESTATION, error: null },
    updateResult:      { data: { id: "agr-1" }, error: null },
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(typeof body.marked_at, "string");
});

Deno.test("mark-payment-sent: race condition — UPDATE returns no row → 200 already_marked", async () => {
  // UPDATE matches 0 rows (another request already wrote) → updateResult data is null
  const client = buildMockClient({
    agreementResult:   { data: VALID_AGREEMENT, error: null },
    attestationResult: { data: VALID_ATTESTATION, error: null },
    updateResult:      { data: null, error: null }, // 0 rows updated
  });
  const req = makeRequest({ agreement_id: "agr-1", buyer_access_token: "tok-good" });
  const res = await handler(req, client);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.already_marked, true);
});
