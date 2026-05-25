// src/pages/AgreementDownload.test.tsx — Wave G1
//
// Unit tests for the AgreementDownload page (Wave F6).
// The page is a state machine: loading → redirecting | error.
// We mock supabase.functions.invoke to control what the
// agreement-download-url edge function returns.

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted by Vitest so the static import below sees it
// ---------------------------------------------------------------------------

const mockInvoke = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

vi.mock('@/lib/hooks/useBusinessInfo', () => ({
  useBusinessInfoOrDefaults: () => ({
    phone: '(321) 697-8864',
    phoneRaw: '3216978864',
    email: 'Dreampuppies22@gmail.com',
    locations: [],
  }),
}));

// Static import — safe because vi.mock above is hoisted before any import runs
import AgreementDownload from './AgreementDownload';

// ---------------------------------------------------------------------------
// window.location helper
// ---------------------------------------------------------------------------

let capturedHref = '';

function patchWindowLocation() {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: {
      ...window.location,
      get href() { return capturedHref; },
      set href(v: string) { capturedHref = v; },
    },
  });
}

function restoreWindowLocation() {
  capturedHref = '';
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderPage(agreementId = 'agr-1', buyerToken = 'tok-1') {
  return render(
    <MemoryRouter
      initialEntries={[`/agreements/${agreementId}/${buyerToken}/download`]}
    >
      <Routes>
        <Route
          path="/agreements/:agreementId/:buyerToken/download"
          element={<AgreementDownload />}
        />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgreementDownload', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    restoreWindowLocation();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading text on initial render', async () => {
    // Never resolve so we can inspect the loading state
    mockInvoke.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText(/preparing your download/i)).toBeTruthy();
  });

  it('shows "Download starting…" and redirects via window.location.href on success', async () => {
    patchWindowLocation();
    mockInvoke.mockResolvedValue({
      data: { download_url: 'https://supabase.example.com/signed/pdf.pdf' },
      error: null,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/download starting/i)).toBeTruthy();
    });
    expect(capturedHref).toBe('https://supabase.example.com/signed/pdf.pdf');
  });

  it('shows a retryable error when the edge function returns a generic error', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Something went wrong, please try again.' },
      error: null,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/download unavailable/i)).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('shows a non-retryable expired-token error and hides the retry button', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'Token expired' },
      error: null,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/link has expired/i)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('hides retry when the top-level error message mentions "token"', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'invalid buyer_access_token' },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/download unavailable/i)).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('"Try again" button re-invokes the edge function', async () => {
    patchWindowLocation();
    mockInvoke
      .mockResolvedValueOnce({
        data: { error: 'Network error, please retry.' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { download_url: 'https://supabase.example.com/ok.pdf' },
        error: null,
      });

    renderPage();

    const retryBtn = await screen.findByRole('button', { name: /try again/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  it('passes the correct agreement_id and buyerToken to the edge function', async () => {
    patchWindowLocation();
    mockInvoke.mockResolvedValue({
      data: { download_url: 'https://cdn.example.com/x.pdf' },
      error: null,
    });

    renderPage('my-agr-id', 'my-tok-123');

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'agreement-download-url',
        expect.objectContaining({
          body: {
            agreement_id: 'my-agr-id',
            buyer_access_token: 'my-tok-123',
          },
        })
      );
    });
  });

  it('shows "Invalid download link" when URL params are missing', async () => {
    render(
      <MemoryRouter initialEntries={['/agreements']}>
        <Routes>
          <Route path="/agreements" element={<AgreementDownload />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid download link/i)).toBeTruthy();
    });
  });
});
