// Breeder auth lives outside the main AuthContext on purpose: Yolanda's
// session is a single shared 4-digit-pin → 30-day token bound to her phone,
// not a Supabase auth user. Keeping it in its own context avoids leaking
// admin auth into breeder pages (and vice versa).

import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  clearBreederSession,
  loadBreederSession,
  saveBreederSession,
} from "@/lib/breeder/session";
import { breederLogin } from "@/lib/breeder/api";
import type { BreederSession } from "@/types/breeder";

export interface BreederAuthContextValue {
  session: BreederSession | null;
  loading: boolean;
  signIn: (
    pin: string,
    deviceLabel?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => void;
}

export const BreederAuthContext = createContext<BreederAuthContextValue | undefined>(
  undefined,
);

export function BreederAuthProvider({ children }: { children: ReactNode }) {
  // Lazy initializer — runs once on mount; localStorage is browser-only and
  // loadBreederSession returns null on SSR (no hydration mismatch in this SPA).
  const [session, setSession] = useState<BreederSession | null>(() => loadBreederSession());

  const signIn = useCallback(
    async (pin: string, deviceLabel?: string) => {
      const res = await breederLogin(pin, deviceLabel);
      if (!res.ok) return { ok: false as const, error: res.error };
      const next = { token: res.token, expiresAt: res.expiresAt };
      saveBreederSession(next);
      setSession(next);
      return { ok: true as const };
    },
    [],
  );

  const signOut = useCallback(() => {
    clearBreederSession();
    setSession(null);
  }, []);

  const value = useMemo<BreederAuthContextValue>(
    () => ({ session, loading: false, signIn, signOut }),
    [session, signIn, signOut],
  );

  return (
    <BreederAuthContext.Provider value={value}>
      {children}
    </BreederAuthContext.Provider>
  );
}
