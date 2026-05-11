// Client-side persistence of the breeder session token.
//
// The token is what BreederRoute reads to gate every breeder page, and
// what the breeder-write / breeder-upload-* edge functions read off the
// `x-breeder-token` header for service-role authorization.

import type { BreederSession } from "@/types/breeder";

const STORAGE_KEY = "breeder_session";

export function loadBreederSession(): BreederSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BreederSession>;
    if (!parsed.token || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function saveBreederSession(session: BreederSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearBreederSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
