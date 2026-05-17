import { lazy, type ComponentType } from "react";

/**
 * `lazyWithRetry` — drop-in replacement for React's `lazy()` that auto-recovers
 * from stale-chunk failures after a deploy.
 *
 * Why: when a new Vite build ships, the `index.html` referenced by browser tabs
 * already in memory still points at old chunk hashes. When the user navigates
 * to a lazy route, the browser tries to fetch an asset that no longer exists,
 * the dynamic `import()` rejects, and the ErrorBoundary fires with
 * "Importing a module script failed."
 *
 * Strategy: catch chunk-load errors specifically (not evaluation errors —
 * those are real bugs), reload the page once per tab, and use a sessionStorage
 * sentinel so we never reload in a loop if the failure recurs.
 */

const RELOAD_SENTINEL = "lazy-retry-reloaded";

function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  // Cover the three messages emitted by Chromium / Firefox / Safari for a
  // failed dynamic import.
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

function safeGetSentinel(): string | null {
  try {
    return sessionStorage.getItem(RELOAD_SENTINEL);
  } catch {
    return null;
  }
}

function safeSetSentinel(): void {
  try {
    sessionStorage.setItem(RELOAD_SENTINEL, "1");
  } catch {
    // sessionStorage unavailable (private mode, SSR): proceed without
    // sentinel — at worst the user gets one extra reload.
  }
}

function safeClearSentinel(): void {
  try {
    sessionStorage.removeItem(RELOAD_SENTINEL);
  } catch {
    // see above
  }
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Successful load — clear the sentinel so a future stale-chunk event
      // in this same tab still gets one retry.
      safeClearSentinel();
      return mod;
    } catch (err) {
      if (!isChunkLoadError(err)) {
        // Evaluation-time error (TypeError, syntax error, etc.) — don't mask
        // it with a reload. Let the ErrorBoundary surface the real bug.
        throw err;
      }
      if (safeGetSentinel()) {
        // We already reloaded once this tab and the chunk is *still* missing.
        // Treat it as a real failure and surface to the ErrorBoundary.
        safeClearSentinel();
        throw err;
      }
      safeSetSentinel();
      window.location.reload();
      // Return a never-resolving promise so React keeps the Suspense fallback
      // visible until the reload actually fires (avoids a brief ErrorBoundary
      // flash).
      return new Promise<{ default: T }>(() => {});
    }
  });
}
