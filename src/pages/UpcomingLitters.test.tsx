import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import UpcomingLitters from '@/pages/UpcomingLitters';
import type { UpcomingLitter } from '@/lib/supabase';

// ── Module mocks ────────────────────────────────────────────────────────────

// vi.mock factories are hoisted — define the fn with vi.hoisted so it's in scope.
const { mockFetchActiveUpcomingLitters } = vi.hoisted(() => ({
  mockFetchActiveUpcomingLitters: vi.fn(),
}));

vi.mock('@/lib/upcoming-litters', () => ({
  fetchActiveUpcomingLitters: mockFetchActiveUpcomingLitters,
  UPCOMING_LITTERS_ACTIVE_QUERY_KEY: ['upcoming-litters-active'],
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.example.com/${path ?? 'placeholder'}` },
        }),
      }),
    },
  },
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/seo/Seo', () => ({ Seo: () => null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key, // returns key as-is so tests can assert by key
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/contact-messages', () => ({
  insertContactMessage: vi.fn().mockResolvedValue({ error: null }),
  upcomingLitterPayloadToRow: vi.fn((p) => p),
}));

// ── Test helpers ────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

const sampleLitter: UpcomingLitter = {
  id: 'litter-1',
  breed: 'Goldendoodle',
  display_breed: 'F1B Goldendoodle',
  due_label: 'July 2026',
  price_label: '$2,500',
  is_active: true,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
} as unknown as UpcomingLitter;

// ── Tests ───────────────────────────────────────────────────────────────────

describe('UpcomingLitters page', () => {
  beforeEach(() => {
    mockFetchActiveUpcomingLitters.mockReset();
  });

  it('renders the loading spinner while the query is in flight', () => {
    // Never-resolving promise keeps the component in loading state.
    mockFetchActiveUpcomingLitters.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<UpcomingLitters />);

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the empty state when no litters are returned', async () => {
    mockFetchActiveUpcomingLitters.mockResolvedValue([]);

    renderWithProviders(<UpcomingLitters />);

    // Empty state renders "upcomingEmptyPrefix <link> upcomingEmptySuffix" — the link
    // text is a single element we can assert on exactly.
    await waitFor(() => {
      expect(screen.getByText('upcomingContactUs')).toBeInTheDocument();
    });
  });

  it('renders a litter card when litters are returned', async () => {
    mockFetchActiveUpcomingLitters.mockResolvedValue([sampleLitter]);

    renderWithProviders(<UpcomingLitters />);

    // Card renders display_breed in both title and breed detail; use getAllByText.
    await waitFor(() => {
      expect(screen.getAllByText('F1B Goldendoodle').length).toBeGreaterThan(0);
    });
  });

  it('renders multiple litter cards', async () => {
    const secondLitter: UpcomingLitter = {
      ...sampleLitter,
      id: 'litter-2',
      display_breed: 'Mini Goldendoodle',
    } as unknown as UpcomingLitter;

    mockFetchActiveUpcomingLitters.mockResolvedValue([sampleLitter, secondLitter]);

    renderWithProviders(<UpcomingLitters />);

    await waitFor(() => {
      expect(screen.getAllByText('F1B Goldendoodle').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Mini Goldendoodle').length).toBeGreaterThan(0);
    });
  });

  it('renders the error state when the fetch throws', async () => {
    mockFetchActiveUpcomingLitters.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<UpcomingLitters />);

    await waitFor(() => {
      // t('upcomingLoadError') returns the key as-is per mock.
      expect(screen.getByText('upcomingLoadError')).toBeInTheDocument();
    });
  });
});
