// /breeder/login — Yolanda types the 4-digit pin once per 30 days.
//
// On success, the BreederAuthContext persists the session token in
// localStorage and we route to /breeder.

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PinKeypad } from "@/components/breeder/PinKeypad";
import { useBreederAuth } from "@/hooks/use-breeder-auth";

export default function BreederLogin() {
  const navigate = useNavigate();
  const { session, signIn } = useBreederAuth();
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/breeder" replace />;
  }

  function handlePinChange(next: string) {
    setPin(next);
    // Clear stale error inline when the user starts typing again.
    if (next.length > 0 && error) setError(null);
  }

  async function attempt(fullPin: string) {
    setSubmitting(true);
    setError(null);
    const deviceLabel =
      typeof navigator !== "undefined"
        ? navigator.userAgent.slice(0, 80)
        : undefined;
    const res = await signIn(fullPin, deviceLabel);
    if (res.ok) {
      navigate("/breeder", { replace: true });
      return;
    }
    setError(res.error);
    setPin("");
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Dream Puppies — Breeder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the 4-digit pin to manage litters and puppies.
        </p>
      </div>

      <PinKeypad
        value={pin}
        onChange={handlePinChange}
        onComplete={attempt}
        disabled={submitting}
        length={4}
      />

      <div className="mt-6 h-6 text-center">
        {submitting && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </p>
        )}
        {error && !submitting && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
