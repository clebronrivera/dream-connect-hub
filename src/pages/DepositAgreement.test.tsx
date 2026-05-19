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

// Stub the wizard so we can assert what props the gate passed without
// pulling the whole wizard (supabase, signature pad, etc.) into scope.
vi.mock('@/components/wizard/DepositWizard', () => ({
  DepositWizard: (props: { puppyId?: string; litterId?: string; requestId?: string }) => (
    <div
      data-testid="deposit-wizard"
      data-puppy-id={props.puppyId ?? ''}
      data-litter-id={props.litterId ?? ''}
      data-request-id={props.requestId ?? ''}
    >
      DepositWizard
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
    expect(screen.queryByTestId('deposit-wizard')).not.toBeInTheDocument();

    // The public intake form was retired in the redesign — no CTA link
    // should encourage self-serve sign-up from this page anymore.
    expect(screen.queryByRole('link', { name: /start a deposit request/i })).not.toBeInTheDocument();

    // Validation should not run without a requestId.
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('shows "Reservation link not recognized" when the request is not found', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request not found' });

    renderAt('/deposit?requestId=00000000-0000-0000-0000-000000000000');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /not recognized/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('deposit-wizard')).not.toBeInTheDocument();
  });

  it('shows "Reservation already submitted" when the request is converted', async () => {
    mockValidate.mockResolvedValue({ valid: false, reason: 'Request already converted' });

    renderAt('/deposit?requestId=req-converted');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /already submitted/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('deposit-wizard')).not.toBeInTheDocument();
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

  it('renders the wizard with litter context when validation succeeds (litter-bound)', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      puppyId: null,
      litterId: 'litter-abc',
    });

    renderAt('/deposit?requestId=12345678-aaaa-bbbb-cccc-ddddeeeeffff');

    const wizard = await screen.findByTestId('deposit-wizard');
    expect(wizard).toBeInTheDocument();
    expect(wizard.getAttribute('data-litter-id')).toBe('litter-abc');
    expect(wizard.getAttribute('data-puppy-id')).toBe('');
    expect(wizard.getAttribute('data-request-id')).toBe('12345678-aaaa-bbbb-cccc-ddddeeeeffff');
  });

  it('renders the wizard with puppy context when validation succeeds (puppy-bound)', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      puppyId: 'puppy-xyz',
      litterId: null,
    });

    renderAt('/deposit?requestId=req-puppy');

    const wizard = await screen.findByTestId('deposit-wizard');
    expect(wizard.getAttribute('data-puppy-id')).toBe('puppy-xyz');
    expect(wizard.getAttribute('data-litter-id')).toBe('');
  });
});
