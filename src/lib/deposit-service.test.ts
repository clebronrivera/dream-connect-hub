import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the invoke mock so the vi.mock factory can capture it.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

// validateDepositRequest now delegates to the `validate-deposit-request` edge
// function (the decision logic lives there, unit-tested in Deno). The client
// wrapper is responsible only for passing the result through and failing closed
// on transport errors.
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
  },
}));

import { validateDepositRequest } from './deposit-service';

describe('validateDepositRequest', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('passes through a valid result from the edge function', async () => {
    mockInvoke.mockResolvedValue({
      data: { valid: true, puppyId: 'puppy-9', litterId: null },
      error: null,
    });

    const result = await validateDepositRequest('req-1');

    expect(mockInvoke).toHaveBeenCalledWith('validate-deposit-request', {
      body: { requestId: 'req-1' },
    });
    expect(result).toEqual({ valid: true, puppyId: 'puppy-9', litterId: null });
  });

  it('passes through an invalid result (reason preserved)', async () => {
    mockInvoke.mockResolvedValue({
      data: { valid: false, reason: 'Request already converted' },
      error: null,
    });

    const result = await validateDepositRequest('req-2');

    expect(result).toEqual({ valid: false, reason: 'Request already converted' });
  });

  it('fails closed as "Request not found" on a transport error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('network') });

    const result = await validateDepositRequest('req-3');

    expect(result).toEqual({ valid: false, reason: 'Request not found' });
  });

  it('fails closed as "Request not found" when no data is returned', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });

    const result = await validateDepositRequest('req-4');

    expect(result).toEqual({ valid: false, reason: 'Request not found' });
  });
});
