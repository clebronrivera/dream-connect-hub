import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client with a chain flexible enough for the death-expense
// query shapes: select().eq().eq().maybeSingle(), insert(), update().eq(),
// delete().eq().
const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  deleteEq: vi.fn(),
}));

vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: h.maybeSingle }),
        }),
      }),
      insert: (...a: unknown[]) => h.insert(...a),
      update: (payload: unknown) => {
        h.update(payload);
        return { eq: (...a: unknown[]) => h.updateEq(...a) };
      },
      delete: () => ({ eq: (...a: unknown[]) => h.deleteEq(...a) }),
    }),
  },
}));

import { upsertPuppyDeathExpense } from './puppies-service';

beforeEach(() => {
  h.maybeSingle.mockReset();
  h.insert.mockReset().mockResolvedValue({ error: null });
  h.update.mockReset();
  h.updateEq.mockReset().mockResolvedValue({ error: null });
  h.deleteEq.mockReset().mockResolvedValue({ error: null });
});

describe('upsertPuppyDeathExpense', () => {
  it('inserts a new death expense when none exists and cost > 0', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    await upsertPuppyDeathExpense('pup-1', 250);
    expect(h.insert).toHaveBeenCalledWith([
      expect.objectContaining({ puppy_id: 'pup-1', category: 'death', cost: 250 }),
    ]);
    expect(h.updateEq).not.toHaveBeenCalled();
    expect(h.deleteEq).not.toHaveBeenCalled();
  });

  it('updates the existing row instead of inserting a duplicate', async () => {
    h.maybeSingle.mockResolvedValue({ data: { id: 'exp-1' }, error: null });
    await upsertPuppyDeathExpense('pup-1', 400);
    expect(h.update).toHaveBeenCalledWith({ cost: 400 });
    expect(h.updateEq).toHaveBeenCalledWith('id', 'exp-1');
    expect(h.insert).not.toHaveBeenCalled();
  });

  it('deletes the existing row when cost is 0 (operator said no cost)', async () => {
    h.maybeSingle.mockResolvedValue({ data: { id: 'exp-1' }, error: null });
    await upsertPuppyDeathExpense('pup-1', 0);
    expect(h.deleteEq).toHaveBeenCalledWith('id', 'exp-1');
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.updateEq).not.toHaveBeenCalled();
  });

  it('is a no-op when cost is 0 and no row exists', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: null });
    await upsertPuppyDeathExpense('pup-1', 0);
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.updateEq).not.toHaveBeenCalled();
    expect(h.deleteEq).not.toHaveBeenCalled();
  });

  it('throws when the lookup query errors', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(upsertPuppyDeathExpense('pup-1', 100)).rejects.toBeTruthy();
  });
});
