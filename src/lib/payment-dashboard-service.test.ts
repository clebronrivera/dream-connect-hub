import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMaybeSingle, mockInvoke, mockCreateClient } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockInvoke: vi.fn(),
  mockCreateClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) =>
    (mockCreateClient as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('@/lib/env', () => ({
  appEnv: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) =>
        (mockInvoke as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

import {
  fetchAgreementByToken,
  markPaymentSent,
} from './payment-dashboard-service';

describe('fetchAgreementByToken', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockCreateClient.mockClear();
  });

  it('returns ok with the agreement when RLS lets the row through', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const fakeRow = {
      id: 'a1',
      buyer_name: 'Maria',
      buyer_access_token_expires_at: future,
    };
    mockMaybeSingle.mockResolvedValue({ data: fakeRow, error: null });

    const result = await fetchAgreementByToken('a1', 'token-123');

    expect(result).toEqual({ status: 'ok', agreement: fakeRow });
    // The token is plumbed through createClient as a global header.
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'anon-key',
      expect.objectContaining({
        global: expect.objectContaining({
          headers: { 'x-buyer-token': 'token-123' },
        }),
      })
    );
  });

  it('returns not_found when RLS denies (no row)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await fetchAgreementByToken('a1', 'wrong-token');
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns not_found when the lookup errors', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('db') });
    const result = await fetchAgreementByToken('a1', 'token-123');
    expect(result).toEqual({ status: 'not_found' });
  });

  it('returns expired when buyer_access_token_expires_at is in the past', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'a1', buyer_access_token_expires_at: past },
      error: null,
    });
    const result = await fetchAgreementByToken('a1', 'token-123');
    expect(result.status).toBe('expired');
  });
});

describe('markPaymentSent', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('calls the edge function with the right body and returns its data', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, marked_at: '2026-05-06T13:29:28Z' },
      error: null,
    });

    const result = await markPaymentSent('a1', 'token-123');

    expect(mockInvoke).toHaveBeenCalledWith('mark-payment-sent', {
      body: { agreement_id: 'a1', buyer_access_token: 'token-123' },
    });
    expect(result).toEqual({ success: true, marked_at: '2026-05-06T13:29:28Z' });
  });

  it('returns already_marked when the function reports it', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, already_marked: true, marked_at: '2026-05-06T13:29:28Z' },
      error: null,
    });
    const result = await markPaymentSent('a1', 'token-123');
    expect(result.already_marked).toBe(true);
  });

  it('throws with the server error message when the function returns an HTTP error', async () => {
    const ctxResponse = {
      json: async () => ({ error: 'Token expired' }),
    };
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('FunctionsHttpError: 403'), { context: ctxResponse }),
    });

    await expect(markPaymentSent('a1', 'wrong-token')).rejects.toThrow('Token expired');
  });

  it('falls back to the generic error message when the context body is unparseable', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error('FunctionsHttpError: 500'),
    });

    await expect(markPaymentSent('a1', 'token-123')).rejects.toThrow(
      'FunctionsHttpError: 500'
    );
  });
});
