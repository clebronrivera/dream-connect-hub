// supabase/functions/validate-deposit-request/index.test.ts
//
// Deno unit tests for the validate-deposit-request decision logic + handler.
// Run with:
//   deno test --allow-env --no-check supabase/functions/validate-deposit-request/index.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluate, handler, type RequestRow } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const VALID_ID = "11111111-2222-4333-8444-555555555555";

function row(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    request_status: "deposit_link_sent",
    puppy_id: null,
    upcoming_litter_id: null,
    deposit_agreement_id: null,
    ...overrides,
  };
}

// --- evaluate() pure logic ---------------------------------------------------

Deno.test("evaluate: valid when deposit_link_sent, returns puppy/litter", () => {
  assertEquals(evaluate(row({ upcoming_litter_id: "litter-1" })), {
    valid: true,
    puppyId: null,
    litterId: "litter-1",
  });
  assertEquals(evaluate(row({ puppy_id: "puppy-9" })), {
    valid: true,
    puppyId: "puppy-9",
    litterId: null,
  });
});

Deno.test("evaluate: missing row → not found", () => {
  assertEquals(evaluate(null), { valid: false, reason: "Request not found" });
});

Deno.test("evaluate: converted status → already converted", () => {
  assertEquals(evaluate(row({ request_status: "converted" })), {
    valid: false,
    reason: "Request already converted",
  });
});

Deno.test("evaluate: deposit_agreement_id set → already converted (any status)", () => {
  assertEquals(
    evaluate(row({ deposit_agreement_id: "agreement-1" })),
    { valid: false, reason: "Request already converted" },
  );
});

Deno.test("evaluate: other statuses report the status", () => {
  assertEquals(evaluate(row({ request_status: "pending" })), {
    valid: false,
    reason: "Request status is pending",
  });
  assertEquals(evaluate(row({ request_status: "declined" })), {
    valid: false,
    reason: "Request status is declined",
  });
});

// --- handler() routing + input guards ---------------------------------------

function makeReq(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost/validate-deposit-request", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Minimal supabase stub whose maybeSingle resolves to the given result. */
function stubClient(result: { data: unknown; error: unknown }): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(result),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

Deno.test("handler: OPTIONS preflight returns ok", async () => {
  const res = await handler(makeReq(undefined, "OPTIONS"));
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "ok");
});

Deno.test("handler: non-POST → 405", async () => {
  const res = await handler(makeReq(undefined, "GET"));
  assertEquals(res.status, 405);
});

Deno.test("handler: malformed (non-UUID) requestId → not found, no DB hit", async () => {
  // No supabase override passed; if it tried to hit the DB it would throw on
  // missing env. Reaching a 200 not-found proves the guard short-circuits.
  const res = await handler(makeReq({ requestId: "not-a-uuid" }));
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { valid: false, reason: "Request not found" });
});

Deno.test("handler: valid UUID + row → evaluate result", async () => {
  const supa = stubClient({
    data: { request_status: "deposit_link_sent", puppy_id: "p1", upcoming_litter_id: null, deposit_agreement_id: null },
    error: null,
  });
  const res = await handler(makeReq({ requestId: VALID_ID }), supa);
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { valid: true, puppyId: "p1", litterId: null });
});

Deno.test("handler: DB error → fail closed as not found, no internals leaked", async () => {
  const supa = stubClient({ data: null, error: { message: "internal pg error" } });
  const res = await handler(makeReq({ requestId: VALID_ID }), supa);
  assertEquals(res.status, 200);
  const payload = await res.json();
  assertEquals(payload, { valid: false, reason: "Request not found" });
});
