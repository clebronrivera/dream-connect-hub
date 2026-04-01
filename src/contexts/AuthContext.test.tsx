import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthContext, AuthProvider } from '@/contexts/AuthContext';

// vi.mock factories are hoisted — define fns with vi.hoisted so they're available.
const { mockGetSession, mockOnAuthStateChange, mockFrom } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  },
}));

/** Minimal consumer that exposes context values via data-testid attributes. */
function TestConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return <div>no context</div>;
  return (
    <>
      <span data-testid="isAdmin">{String(ctx.isAdmin)}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockOnAuthStateChange.mockReset();
    mockFrom.mockReset();
    // Default: no-op subscription so the cleanup function doesn't throw.
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('defaults to isAdmin=false and loading=false when there is no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
  });

  it('sets isAdmin=true when the profiles table returns role "admin"', async () => {
    const mockUser = { id: 'user-admin-123' };
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('sets isAdmin=false when the profiles table returns a non-admin role', async () => {
    const mockUser = { id: 'user-viewer-456' };
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: 'viewer' }, error: null }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('false');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('sets isAdmin=false when the profile lookup returns no row (PGRST116)', async () => {
    const mockUser = { id: 'user-new-789' };
    mockGetSession.mockResolvedValue({ data: { session: { user: mockUser } } });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
        }),
      }),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('false');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
