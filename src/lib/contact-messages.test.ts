import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertContactMessage } from '@/lib/contact-messages';

const mockInvoke = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    // Wrap in a thunk so the factory doesn't read `mockInvoke` before vitest
    // hoists its initializer (vi.mock factory runs before top-level `const`s).
    functions: {
      invoke: (...args: unknown[]) =>
        (mockInvoke as (...a: unknown[]) => unknown)(...args),
    },
  },
}));

const baseRow = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'General',
  message: 'Hello from the test suite',
};

describe('insertContactMessage', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('returns { error: null } on a successful submit', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true, id: 'row-1' }, error: null });

    const result = await insertContactMessage(baseRow, 'turnstile-token');

    expect(result.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith('submit-contact-message', {
      body: { ...baseRow, turnstile_token: 'turnstile-token' },
    });
  });

  it('surfaces the edge function error message when present', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Captcha verification failed', codes: ['missing-input-response'] },
      error: new Error('FunctionsHttpError: 403'),
    });

    const result = await insertContactMessage(baseRow, null);

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe('Captcha verification failed');
  });

  it('passes optional fields through to the edge function payload', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    const rowWithOptional = {
      ...baseRow,
      phone: '555-0000',
      city: 'Austin',
      state: 'TX',
      upcoming_litter_id: 'litter-uuid',
    };

    await insertContactMessage(rowWithOptional, 'tok');

    expect(mockInvoke).toHaveBeenCalledWith('submit-contact-message', {
      body: { ...rowWithOptional, turnstile_token: 'tok' },
    });
  });

  it('defaults turnstile_token to null when omitted', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    await insertContactMessage(baseRow);

    expect(mockInvoke).toHaveBeenCalledWith('submit-contact-message', {
      body: { ...baseRow, turnstile_token: null },
    });
  });
});
