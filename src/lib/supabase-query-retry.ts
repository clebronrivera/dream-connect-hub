/**
 * Helpers for Supabase PostgREST calls that occasionally fail with transient
 * browser/network errors (AbortError, "Failed to fetch") — especially under
 * navigation or when the tab is backgrounded.
 */

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

/** True when a retry may succeed (same request shape, no schema change). */
export function isTransientSupabaseReadError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  const msg = messageOf(err);
  return (
    msg.includes("AbortError") ||
    msg.includes("The operation was aborted") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("Network request failed")
  );
}

/**
 * Run `work` up to `attempts` times when it throws a transient error.
 * Use around public Supabase reads invoked from React Query.
 */
export async function runWithTransientRetries<T>(
  work: () => Promise<T>,
  options?: { attempts?: number; baseDelayMs?: number }
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 100;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await work();
    } catch (e) {
      last = e;
      if (!isTransientSupabaseReadError(e) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw last;
}
