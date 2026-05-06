import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the leaf-method mock so the vi.mock factory can capture it.
const { mockMaybeSingle } = vi.hoisted(() => ({ mockMaybeSingle: vi.fn() }));

// Mock the supabase chain used by validateDepositRequest:
//   supabase.from('deposit_requests').select(...).eq('id', id).maybeSingle()
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  },
}));

import { validateDepositRequest } from './deposit-service';

describe('validateDepositRequest', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it('returns valid with puppyId/litterId when status is deposit_link_sent', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-1',
        request_status: 'deposit_link_sent',
        puppy_id: null,
        upcoming_litter_id: 'litter-1',
        deposit_agreement_id: null,
      },
      error: null,
    });

    const result = await validateDepositRequest('req-1');

    expect(result).toEqual({ valid: true, puppyId: null, litterId: 'litter-1' });
  });

  it('returns puppyId on a puppy-bound request', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-2',
        request_status: 'deposit_link_sent',
        puppy_id: 'puppy-9',
        upcoming_litter_id: null,
        deposit_agreement_id: null,
      },
      error: null,
    });

    const result = await validateDepositRequest('req-2');

    expect(result).toEqual({ valid: true, puppyId: 'puppy-9', litterId: null });
  });

  it('returns "Request not found" when the row is missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await validateDepositRequest('missing');

    expect(result).toEqual({ valid: false, reason: 'Request not found' });
  });

  it('returns "Request not found" when supabase returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('db') });

    const result = await validateDepositRequest('any');

    expect(result).toEqual({ valid: false, reason: 'Request not found' });
  });

  it('returns "Request already converted" when request_status is converted', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-3',
        request_status: 'converted',
        puppy_id: null,
        upcoming_litter_id: 'litter-1',
        deposit_agreement_id: 'agreement-1',
      },
      error: null,
    });

    const result = await validateDepositRequest('req-3');

    expect(result).toEqual({ valid: false, reason: 'Request already converted' });
  });

  it('returns "Request already converted" when deposit_agreement_id is set even with another status', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-4',
        request_status: 'deposit_link_sent',
        puppy_id: null,
        upcoming_litter_id: 'litter-1',
        deposit_agreement_id: 'agreement-1',
      },
      error: null,
    });

    const result = await validateDepositRequest('req-4');

    expect(result).toEqual({ valid: false, reason: 'Request already converted' });
  });

  it('reports the current status when not yet at deposit_link_sent', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-5',
        request_status: 'pending',
        puppy_id: null,
        upcoming_litter_id: 'litter-1',
        deposit_agreement_id: null,
      },
      error: null,
    });

    const result = await validateDepositRequest('req-5');

    expect(result).toEqual({ valid: false, reason: 'Request status is pending' });
  });

  it('reports the current status when declined', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'req-6',
        request_status: 'declined',
        puppy_id: null,
        upcoming_litter_id: 'litter-1',
        deposit_agreement_id: null,
      },
      error: null,
    });

    const result = await validateDepositRequest('req-6');

    expect(result).toEqual({ valid: false, reason: 'Request status is declined' });
  });
});
