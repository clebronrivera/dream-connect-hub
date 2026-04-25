// Cloudflare Turnstile token verification helper for Supabase edge functions.
//
// Reads TURNSTILE_SECRET_KEY from Deno.env. Set it via:
//   supabase secrets set TURNSTILE_SECRET_KEY=<value> --project-ref <ref>
//
// Returns { ok: true } only when Cloudflare confirms the token is valid for
// our site key. Network errors, missing secrets, or any verification failure
// produce { ok: false } — callers should fail-closed (reject the request).

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  ok: boolean;
  errorCodes?: string[];
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return { ok: false, errorCodes: ["secret-not-configured"] };
  }
  if (!token) {
    return { ok: false, errorCodes: ["missing-input-response"] };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      console.error(
        `Turnstile verify HTTP ${res.status}:`,
        await res.text().catch(() => "<no body>")
      );
      return { ok: false, errorCodes: [`http-${res.status}`] };
    }
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data?.success === true) return { ok: true };
    return { ok: false, errorCodes: data?.["error-codes"] ?? [] };
  } catch (err) {
    console.error("Turnstile verify request failed:", err);
    return { ok: false, errorCodes: ["network-error"] };
  }
}
