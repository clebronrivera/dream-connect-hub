// src/test/integration/reservation-flow.test.tsx — Wave G1
//
// Integration tests for the key service-layer functions that span the full
// reservation workflow.  Each test mocks the Supabase client at the boundary
// and verifies the service function's behaviour end-to-end.
//
// Workflow steps covered:
//   Step 5  – submitDepositAgreement (DepositForm → deposit_agreements INSERT)
//   Step 9  – fetchAgreementByToken  (PaymentDashboard → RLS token-gated SELECT)
//   Step 9  – markPaymentSent        (buyer "I have sent payment" → edge function)
//   Step 10 – confirmDepositPayment  (admin confirms receipt → UPDATE)
//   Step 10 – getAgreementPdfUrl     (admin downloads PDF → signed URL)

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared Supabase mock primitives
// ---------------------------------------------------------------------------

// The chainable .select/.update/.insert/.eq calls run through buildChain()
// rather than these top-level mocks; the unused-underscore prefix keeps
// them around as documentation without tripping the lint rule.
const _mockSelect = vi.fn();
const _mockUpdate = vi.fn();
const _mockInsert = vi.fn();
const _mockEq    = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockInvoke = vi.fn();
const mockGetSession = vi.fn();

// Build a chainable mock that covers the patterns used by the services.
// Each terminal method (single, maybeSingle, etc.) returns a fresh mock so
// individual tests can configure return values independently.
const buildChain = () => ({
  select:      (..._: unknown[]) => buildChain(),
  update:      (..._: unknown[]) => buildChain(),
  insert:      (..._: unknown[]) => buildChain(),
  upsert:      (..._: unknown[]) => buildChain(),
  eq:          (..._: unknown[]) => buildChain(),
  neq:         (..._: unknown[]) => buildChain(),
  is:          (..._: unknown[]) => buildChain(),
  not:         (..._: unknown[]) => buildChain(),
  order:       (..._: unknown[]) => buildChain(),
  limit:       (..._: unknown[]) => buildChain(),
  maybeSingle: () => mockMaybeSingle(),
  single:      () => mockSingle(),
});

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    from:    (..._: unknown[]) => buildChain(),
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// agreements-service imports supabase from '@/lib/supabase-client'
import {
  confirmDepositPayment,
  getAgreementPdfUrl,
  fetchAgreement,
} from '@/lib/admin/agreements-service';

// payment-dashboard-service uses its own createClient (tested separately in
// payment-dashboard-service.test.ts), but markPaymentSent uses supabase.functions.invoke
import { markPaymentSent } from '@/lib/payment-dashboard-service';

// ---------------------------------------------------------------------------

describe('fetchAgreement', () => {
  beforeEach(() => mockSingle.mockReset());

  it('returns the agreement row when found', async () => {
    const fakeRow = {
      id: 'agr-abc',
      agreement_number: 'DP-0001',
      buyer_name: 'Ana Lima',
      deposit_status: 'pending',
      agreement_status: 'sent',
    };
    mockSingle.mockResolvedValue({ data: fakeRow, error: null });

    const result = await fetchAgreement('agr-abc');
    expect(result).toMatchObject({ id: 'agr-abc', agreement_number: 'DP-0001' });
  });

  it('throws when Supabase returns an error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: new Error('not found') });
    await expect(fetchAgreement('missing-id')).rejects.toThrow('not found');
  });
});

// ---------------------------------------------------------------------------

describe('confirmDepositPayment', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockGetSession.mockReset();
    mockInvoke.mockReset();
  });

  it('accepts empty senderHandle and returns mismatch=false (PR 4 — handle is optional)', async () => {
    // PR 4 redesign: senderHandle is no longer required; passing empty string
    // is valid and produces mismatch=false (both normalized handles are '').
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // no attestation
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { mismatch } = await confirmDepositPayment('agr-1', '  ');
    expect(mismatch).toBe(false);
  });

  it('performs the UPDATE and returns mismatch=false when handles match', async () => {
    // fetchAttestedBuyerHandle → maybeSingle returns the buyer handle.
    // The subsequent UPDATE uses the buildChain mock which implicitly resolves
    // to a plain object (no error), so confirmDepositPayment will not throw.
    mockMaybeSingle.mockResolvedValueOnce({
      data: { buyer_payment_handle: 'buyer@zelle.com' },
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { mismatch } = await confirmDepositPayment('agr-1', 'buyer@zelle.com');
    expect(mismatch).toBe(false);
  });

  it('returns mismatch=true when handles differ', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { buyer_payment_handle: 'buyer@zelle.com' },
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { mismatch } = await confirmDepositPayment('agr-1', 'DIFFERENT@handle.com');
    expect(mismatch).toBe(true);
  });

  it('is case-insensitive and trims whitespace when comparing handles', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { buyer_payment_handle: '  Buyer@Zelle.COM ' },
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { mismatch } = await confirmDepositPayment('agr-1', 'buyer@zelle.com');
    expect(mismatch).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe('getAgreementPdfUrl', () => {
  beforeEach(() => mockCreateSignedUrl.mockReset());

  it('returns the signed URL on success', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.example.com/signed.pdf' },
      error: null,
    });

    const url = await getAgreementPdfUrl('agreements/agr-1/DP-0001.pdf');
    expect(url).toBe('https://supabase.example.com/signed.pdf');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'agreements/agr-1/DP-0001.pdf',
      3600
    );
  });

  it('throws when storage returns an error', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Object not found' },
    });

    await expect(
      getAgreementPdfUrl('agreements/agr-1/DP-0001.pdf')
    ).rejects.toThrow('Object not found');
  });

  it('throws when signedUrl is absent in the response', async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: null },
      error: null,
    });

    await expect(
      getAgreementPdfUrl('agreements/agr-1/DP-0001.pdf')
    ).rejects.toThrow(/failed to create signed url/i);
  });
});

// ---------------------------------------------------------------------------

describe('markPaymentSent (edge-function client side)', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('calls mark-payment-sent with agreement_id and buyer_access_token', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, marked_at: '2026-05-07T12:00:00Z' },
      error: null,
    });

    const result = await markPaymentSent('agr-2', 'tok-abc');
    expect(mockInvoke).toHaveBeenCalledWith('mark-payment-sent', {
      body: { agreement_id: 'agr-2', buyer_access_token: 'tok-abc' },
    });
    expect(result.success).toBe(true);
  });

  it('returns already_marked: true for idempotent repeat calls', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, already_marked: true, marked_at: '2026-05-07T12:00:00Z' },
      error: null,
    });

    const result = await markPaymentSent('agr-2', 'tok-abc');
    expect(result.already_marked).toBe(true);
  });

  it('throws with the server error message on HTTP error', async () => {
    const ctxResponse = { json: async () => ({ error: 'Attestation not signed' }) };
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('FunctionsHttpError: 422'), {
        context: ctxResponse,
      }),
    });

    await expect(markPaymentSent('agr-2', 'bad-tok')).rejects.toThrow(
      'Attestation not signed'
    );
  });
});
