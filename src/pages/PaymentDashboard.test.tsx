import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentDashboard from './PaymentDashboard';

const { mockFetch, mockMethods, mockMarkSent, mockToastSuccess, mockToastError, mockFetchAttestation } = vi.hoisted(
  () => ({
    mockFetch: vi.fn(),
    mockMethods: vi.fn(),
    mockMarkSent: vi.fn(),
    mockFetchAttestation: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  })
);

vi.mock('@/lib/payment-dashboard-service', () => ({
  fetchAgreementByToken: (...args: unknown[]) =>
    (mockFetch as (...a: unknown[]) => unknown)(...args),
  fetchPaymentAttestation: (...args: unknown[]) =>
    (mockFetchAttestation as (...a: unknown[]) => unknown)(...args),
  markPaymentSent: (...args: unknown[]) =>
    (mockMarkSent as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('@/lib/payment-attestation-service', () => ({
  submitH1Attestation: vi.fn(),
  submitH2Confirmation: vi.fn(),
  tryGetGeolocation: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/deposit-service', () => ({
  fetchEnabledPaymentMethods: (...args: unknown[]) =>
    (mockMethods as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) =>
      (mockToastSuccess as (...a: unknown[]) => unknown)(...args),
    error: (...args: unknown[]) =>
      (mockToastError as (...a: unknown[]) => unknown)(...args),
  },
}));

const baseAgreement = {
  id: '12345678-aaaa-bbbb-cccc-ddddeeeeffff',
  agreement_number: 'DP-2026-TEST',
  buyer_name: 'Maria',
  buyer_phone: '4075551212',
  puppy_name: 'Star x Koko #1',
  breed: 'F1B Goldendoodle',
  purchase_price: 1500,
  deposit_amount: 300,
  deposit_payment_method: 'zelle',
  payment_memo: 'Maria · 4075551212 · Deposit',
  buyer_access_token: 'tok',
  buyer_access_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
};

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/payment/:agreementId/:buyerToken" element={<PaymentDashboard />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('PaymentDashboard gate states', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockMethods.mockReset();
    mockMarkSent.mockReset();
    mockFetchAttestation.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockMethods.mockResolvedValue([
      {
        method_key: 'zelle',
        display_name: 'Zelle',
        handle_or_recipient: '(407) 744-5855',
        requires_manual_confirm: false,
      },
    ]);
    // Default: no attestation row yet → dashboard renders the H1 form.
    mockFetchAttestation.mockResolvedValue(null);
  });

  /** Helper: a mock payment_attestations row for tests that need to land
   * the dashboard in a specific multi-step state. */
  function attestation(overrides: Record<string, unknown> = {}) {
    return {
      id: 'att-1',
      agreement_id: '12345678-aaaa-bbbb-cccc-ddddeeeeffff',
      attestation_status: 'signed',
      payment_method_handle_to_use: '(407) 744-5855',
      buyer_payment_handle: 'maria@example.com',
      buyer_payment_handle_screenshot_path: 'agreement/handle-1.png',
      buyer_phone_at_payment: '4075551212',
      payment_attestation_text: 'I confirm…',
      payment_attestation_signed_at: '2026-05-06T13:00:00Z',
      confirmation_screenshot_path: null,
      transaction_reference_id: null,
      payment_memo_used: null,
      confirmation_captured_at: null,
      ...overrides,
    };
  }

  it('renders "Reservation link not active" when the row is denied (not_found)', async () => {
    mockFetch.mockResolvedValue({ status: 'not_found' });
    renderAt('/payment/abc/wrong-token');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Reservation link not active/i })
      ).toBeInTheDocument();
    });
  });

  it('renders the expired-link gate when the token is past its window', async () => {
    mockFetch.mockResolvedValue({ status: 'expired' });
    renderAt('/payment/abc/old-token');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Payment link expired/i })
      ).toBeInTheDocument();
    });
  });

  it('renders the dashboard with stats + memo when ok (default lands on H1 form)', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', agreement: baseAgreement });
    renderAt('/payment/12345678/tok');

    await waitFor(() => {
      expect(screen.getByText(/DP-2026-TEST/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Star x Koko #1/)).toBeInTheDocument();
    expect(screen.getByText(/\$300\.00/)).toBeInTheDocument();
    expect(screen.getByText('Maria · 4075551212 · Deposit')).toBeInTheDocument();
    // With no attestation row yet, the H1 form is the rendered step. Wait
    // for the second query (fetchPaymentAttestation) to resolve.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Sign the payment attestation/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Sign attestation and continue/i })
    ).toBeInTheDocument();
  });

  it('renders the H2 confirmation form when H1 is signed but H2 is not', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', agreement: baseAgreement });
    mockFetchAttestation.mockResolvedValue(attestation());
    renderAt('/payment/12345678/tok');

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Upload your payment confirmation/i })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /Save confirmation and continue/i })
    ).toBeInTheDocument();
  });

  it('renders the "I have sent payment" button when H1 + H2 are both complete', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', agreement: baseAgreement });
    mockFetchAttestation.mockResolvedValue(
      attestation({
        confirmation_screenshot_path: 'agreement/confirmation-1.png',
        transaction_reference_id: 'TXN-123',
        confirmation_captured_at: '2026-05-06T13:30:00Z',
      })
    );
    renderAt('/payment/12345678/tok');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /I have sent payment/i })
      ).toBeInTheDocument();
    });
  });

  it('renders the recorded-payment confirmation when buyer_marked_payment_sent_at is set', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      agreement: { ...baseAgreement, buyer_marked_payment_sent_at: '2026-05-06T13:29:28Z' },
    });
    renderAt('/payment/12345678/tok');

    await waitFor(() => {
      expect(
        screen.getByText(/We've recorded that you sent payment/)
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: /I have sent payment/i })
    ).not.toBeInTheDocument();
  });

  it('clicking "I have sent payment" calls markPaymentSent and toasts success', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', agreement: baseAgreement });
    mockFetchAttestation.mockResolvedValue(
      attestation({
        confirmation_screenshot_path: 'agreement/confirmation-1.png',
        transaction_reference_id: 'TXN-123',
        confirmation_captured_at: '2026-05-06T13:30:00Z',
      })
    );
    mockMarkSent.mockResolvedValue({ success: true, marked_at: 'now' });

    renderAt('/payment/12345678/tok');

    const btn = await screen.findByRole('button', { name: /I have sent payment/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockMarkSent).toHaveBeenCalledWith('12345678', 'tok');
    });
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast and keeps the button when markPaymentSent rejects', async () => {
    mockFetch.mockResolvedValue({ status: 'ok', agreement: baseAgreement });
    mockFetchAttestation.mockResolvedValue(
      attestation({
        confirmation_screenshot_path: 'agreement/confirmation-1.png',
        transaction_reference_id: 'TXN-123',
        confirmation_captured_at: '2026-05-06T13:30:00Z',
      })
    );
    mockMarkSent.mockRejectedValue(new Error('Token expired'));

    renderAt('/payment/12345678/tok');

    const btn = await screen.findByRole('button', { name: /I have sent payment/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Token expired');
    });
    // Button still present (mutation failed, not success path).
    expect(screen.getByRole('button', { name: /I have sent payment/i })).toBeInTheDocument();
  });
});
