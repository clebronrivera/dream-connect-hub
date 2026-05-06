import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DepositAgreement from './DepositAgreement';

const { mockValidate } = vi.hoisted(() => ({
  mockValidate: vi.fn(),
}));

vi.mock('@/lib/deposit-service', () => ({
  validateDepositRequest: (...args: unknown[]) =>
    (mockValidate as (...a: unknown[]) => unknown)(...args),
}));

// Render a stub for DepositForm so we can assert what props the gate passed
// without pulling the entire form (and its supabase/email deps) into scope.
vi.mock('@/components/deposit/DepositForm', () => ({
  DepositForm: (props: { puppyId?: string; litterId?: string; requestId?: string }) => (
    <div
      data-testid="deposit-form"
      data-puppy-id={props.puppyId ?? ''}
      data-litter-id={props.litterId ?? ''}
      data-request-id={props.requestId ?? ''}
    >
      DepositForm
    </div>
  ),
}));

function renderAt(initialEntry: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={qc}>
        <DepositAgreement />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('DepositAgreement gate', () => {
  beforeEach(() => {
    mockValidate.mockReset();
  });

  it('shows the operator-only landing when no requestId is in the URL', () => {
    renderAt('/deposit');

    expect(screen.getByRole('heading', { name: /operator-only entry/i })).toBeInTheDocument();
    expect(screen.queryByTestId('deposit-form')).not.toBeInTheDocument();

    // CTA points back to the public intake form.
    const cta = screen.getByRole('link', { name: /start a deposit request/i });
    expect(cta).toHaveAttribute('href', '/request-deposit');

    // Validation should not run without a requestId.
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('shows "Reservation link not recognized" when the request is not found', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request not found' });

    renderAt('/deposit?requestId=00000000-0000-0000-0000-000000000000');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /not recognized/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('deposit-form')).not.toBeInTheDocument();
  });

  it('shows "Reservation already submitted" when the request is converted', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request already converted' });

    renderAt('/deposit?requestId=req-converted');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /already submitted/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('deposit-form')).not.toBeInTheDocument();
  });

  it('shows "Reservation not yet ready" when the request is still pending', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request status is pending' });

    renderAt('/deposit?requestId=req-pending');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /not yet ready/i })).toBeInTheDocument();
    });
  });

  it('shows "Reservation declined" when the request is declined', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request status is declined' });

    renderAt('/deposit?requestId=req-declined');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reservation declined/i })).toBeInTheDocument();
    });
  });

  it('renders the form with the request banner when validation succeeds (litter-bound)', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      puppyId: null,
      litterId: 'litter-abc',
    });

    renderAt('/deposit?requestId=12345678-aaaa-bbbb-cccc-ddddeeeeffff');

    const form = await screen.findByTestId('deposit-form');
    expect(form).toBeInTheDocument();
    expect(form.getAttribute('data-litter-id')).toBe('litter-abc');
    expect(form.getAttribute('data-puppy-id')).toBe('');
    expect(form.getAttribute('data-request-id')).toBe('12345678-aaaa-bbbb-cccc-ddddeeeeffff');

    // Banner shows uppercase 8-char prefix.
    expect(screen.getByText(/#DEP-12345678/i)).toBeInTheDocument();
  });

  it('renders the form with puppy context when validation succeeds (puppy-bound)', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      puppyId: 'puppy-xyz',
      litterId: null,
    });

    renderAt('/deposit?requestId=req-puppy');

    const form = await screen.findByTestId('deposit-form');
    expect(form.getAttribute('data-puppy-id')).toBe('puppy-xyz');
    expect(form.getAttribute('data-litter-id')).toBe('');
  });
});
