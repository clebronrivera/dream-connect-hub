// supabase/functions/generate-agreement-pdf/index.test.ts — Wave G1
//
// Deno unit tests for the generate-agreement-pdf edge function handler.
// Run with: deno test --allow-env --no-check supabase/functions/generate-agreement-pdf/index.test.ts
//
// Tests verify the HTTP contract (method routing, auth, body validation,
// success response shape) by injecting mock Supabase client and PDF generator.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { GeneratePdfOutcome } from "../_shared/pdf/generateDepositPdf.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRequest(
  method: string,
  body?: unknown,
  authHeader?: string
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;
  return new Request("http://localhost/generate-agreement-pdf", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Minimal mock Supabase client that satisfies verifyAdmin's needs. */
function makeMockSupabase({
  userId = "admin-uid",
  role = "admin",
  authError = null as Error | null,
  profileError = null as Error | null,
} = {}): SupabaseClient {
  return {
    auth: {
      getUser: async (_jwt: string) =>
        authError
          ? { data: { user: null }, error: authError }
          : { data: { user: { id: userId } }, error: null },
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () =>
            profileError
              ? { data: null, error: profileError }
              : { data: { user_id: userId, role }, error: null },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

/** Mock generateDepositPdf that resolves immediately with a success result. */
const successfulPdfGenerator = async (
  _supabase: SupabaseClient,
  agreementId: string
): Promise<GeneratePdfOutcome> => ({
  ok: true,
  pdf_path: `${agreementId}/DP-0001.pdf`,
  agreement_number: "DP-0001",
  buyer_access_token: "tok-abcdef",
});

/** Mock that simulates a precondition failure. */
const failingPdfGenerator = async (): Promise<GeneratePdfOutcome> => ({
  ok: false,
  status: 400,
  body: { error: "Deposit must be admin_confirmed before PDF generation" },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test("generate-agreement-pdf: OPTIONS is handled by CORS middleware", async () => {
  const req = makeRequest("OPTIONS");
  // The function itself does not handle OPTIONS (CORS middleware does that
  // at the gateway level), so we only verify it's not a 500.
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  // Handler sees OPTIONS as a non-POST → 405 (no CORS wrapper in tests)
  assertEquals(res.status, 405);
});

Deno.test("generate-agreement-pdf: non-POST returns 405", async () => {
  const req = makeRequest("GET");
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  assertEquals(res.status, 405);
  const body = await res.json();
  assertEquals(body.error, "Method not allowed");
});

Deno.test("generate-agreement-pdf: missing Authorization header returns 401", async () => {
  const req = makeRequest("POST", { agreement_id: "agr-1" });
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  assertEquals(res.status, 401);
});

Deno.test("generate-agreement-pdf: non-admin profile returns 403", async () => {
  const mockClient = makeMockSupabase({ role: "user" });
  const req = makeRequest(
    "POST",
    { agreement_id: "agr-1" },
    "Bearer valid-admin-jwt"
  );
  const res = await handler(req, mockClient, successfulPdfGenerator);
  assertEquals(res.status, 403);
});

Deno.test("generate-agreement-pdf: auth DB error returns 500", async () => {
  const mockClient = makeMockSupabase({
    profileError: new Error("profiles DB unavailable"),
  });
  const req = makeRequest(
    "POST",
    { agreement_id: "agr-1" },
    "Bearer valid-admin-jwt"
  );
  const res = await handler(req, mockClient, successfulPdfGenerator);
  assertEquals(res.status, 500);
});

Deno.test("generate-agreement-pdf: missing agreement_id returns 400", async () => {
  const req = makeRequest("POST", {}, "Bearer valid-admin-jwt");
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "agreement_id is required");
});

Deno.test("generate-agreement-pdf: malformed JSON returns 400", async () => {
  const req = new Request("http://localhost/generate-agreement-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-admin-jwt",
    },
    body: "not-json",
  });
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Invalid JSON");
});

Deno.test("generate-agreement-pdf: success returns 200 with pdf_path, agreement_number, download_url", async () => {
  const req = makeRequest(
    "POST",
    { agreement_id: "agr-42" },
    "Bearer valid-admin-jwt"
  );
  const res = await handler(req, makeMockSupabase(), successfulPdfGenerator);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.ok, true);
  assertEquals(body.pdf_path, "agr-42/DP-0001.pdf");
  assertEquals(body.agreement_number, "DP-0001");
  // download_url should be the puppyheavenllc.com path (PUBLIC_SITE_URL fallback)
  assertEquals(
    body.download_url,
    "https://puppyheavenllc.com/agreements/agr-42/tok-abcdef/download"
  );
});

Deno.test("generate-agreement-pdf: generateDepositPdf failure forwards the error status", async () => {
  const req = makeRequest(
    "POST",
    { agreement_id: "agr-99" },
    "Bearer valid-admin-jwt"
  );
  const res = await handler(req, makeMockSupabase(), failingPdfGenerator);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.error, "Deposit must be admin_confirmed before PDF generation");
});
