import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertContactMessage } from '@/lib/contact-messages';

const mockInsert = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: mockInsert }),
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
    mockInsert.mockReset();
  });

  it('returns { error: null } on a successful insert', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const result = await insertContactMessage(baseRow);

    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith([baseRow]);
  });

  it('returns the database error on a failed insert', async () => {
    const dbError = new Error('insert failed — RLS policy violation');
    mockInsert.mockResolvedValue({ error: dbError });

    const result = await insertContactMessage(baseRow);

    expect(result.error).toBe(dbError);
  });

  it('passes optional fields through to the insert payload', async () => {
    mockInsert.mockResolvedValue({ error: null });
    const rowWithOptional = {
      ...baseRow,
      phone: '555-0000',
      city: 'Austin',
      state: 'TX',
      upcoming_litter_id: 'litter-uuid',
    };

    await insertContactMessage(rowWithOptional);

    expect(mockInsert).toHaveBeenCalledWith([rowWithOptional]);
  });
});
