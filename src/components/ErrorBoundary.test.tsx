import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Suppress React's error-boundary console output so test output stays clean.
const consoleSpy = vi.spyOn(console, 'error');
beforeAll(() => consoleSpy.mockImplementation(() => {}));
afterAll(() => consoleSpy.mockRestore());

function Bomb(): never {
  throw new Error('Test explosion');
}

describe('ErrorBoundary', () => {
  it('renders default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByText('Test explosion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('renders the custom fallback prop when a child throws', () => {
    render(
      <ErrorBoundary fallback={<p>Custom error UI</p>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <p>All systems go</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('All systems go')).toBeInTheDocument();
  });
});
