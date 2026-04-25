# Smoke Test — Public Training-Plan Form

Browser-based verification that `generate-training-plan` is correctly enforcing
**both** of the security gates that ship in it:

- **Wave 2.2 (CORS):** `Access-Control-Allow-Origin` must be the exact request
  origin from the allowlist (`https://puppyheavenllc.com` /
  `https://www.puppyheavenllc.com` / `http://localhost:8080`), never `*`.
- **Wave 2.6 PR-1 (Turnstile):** the function rejects with HTTP 403 and
  `{"error":"Captcha verification failed","codes":[...]}` if the request body's
  `turnstile_token` is missing or doesn't validate against
  `TURNSTILE_SECRET_KEY`.

Both gates are exercised by a single form submission because both changes live
in the same function. The two failure modes are visually distinct (see
[If it fails](#if-it-fails)).

**Run after** `./scripts/deploy-edge-functions.sh` completes.

## Setup

1. Open a fresh **incognito / private window** in Chrome (or any browser with
   DevTools). Incognito guarantees no cached CORS preflight, no service worker,
   no logged-in admin session interfering.
2. Open **DevTools → Network** tab. Enable:
   - **Preserve log** (so the preflight + actual request both stay visible
     across the navigation).
   - **Disable cache** (defensive — preflight responses can be cached up to
     `Access-Control-Max-Age: 86400`).
3. Filter the Network tab to **Fetch/XHR** to keep noise down.
4. Navigate to <https://puppyheavenllc.com/training-plan>.

## Submit

5. Fill the form with test data — a real-looking but obviously-test payload:
   - **Email:** use an inbox you can check (admin recipients also receive a
     copy via the lead email path)
   - **Dog name:** `SMOKETEST-<today's date>`
   - **Problem type:** pick any (e.g. potty training)
   - Other fields: minimal valid values
6. On step 3, the **Cloudflare Turnstile widget renders below the email
   field**. It usually auto-passes (silent challenge); if it shows a checkbox
   or interactive challenge, complete it. The Generate button stays disabled
   until the widget reports success.
7. Submit the form.

## Expected — request to `generate-training-plan`

In the Network tab you should see two entries to
`https://<project-ref>.supabase.co/functions/v1/generate-training-plan`:

### a) `OPTIONS` preflight (CORS gate)

- **Status:** `204` (or `200`)
- **Response Headers** include:
  - `Access-Control-Allow-Origin: https://puppyheavenllc.com`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`
  - `Vary: Origin`

### b) `POST` (CORS + Turnstile gates)

- **Status:** `200`
- **Response Headers** include the same `Access-Control-Allow-Origin: https://puppyheavenllc.com`
- **Request Body** (Network tab → Payload): contains a `turnstile_token`
  field with a non-empty string.
- **Response Body:** JSON with the generated plan.

The form UI should show its success state. The test inbox should receive the
training-plan delivery email; the admin recipients should receive the new-lead
email.

## What "good" looks like

- No red entries in the Network tab for the function call.
- No CORS errors in the Console (look for `blocked by CORS policy`).
- `Access-Control-Allow-Origin` exactly matches the page's origin
  (`https://puppyheavenllc.com`), NOT `*` — the `*` would mean PR #46 didn't
  actually deploy.
- The POST body shows a `turnstile_token` field, not an empty/missing one.
- HTTP 200 (not 403). A 403 with `Captcha verification failed` means PR #49
  is enforcing but the token didn't validate — see failure mode 5 below.

## If it fails

Failure modes are deliberately distinguishable so you know whether CORS, the
Turnstile gate, or something deeper is at fault.

### 1. Console: `blocked by CORS policy: No 'Access-Control-Allow-Origin'`

**Signal:** purely a browser-side error. The Network entry shows status `(failed)`
or appears red without a body the browser can read. The function may or may not
have actually run.

**Cause:** the deployed function isn't returning the allowlist headers.

**Fix:**
```
supabase functions deploy generate-training-plan
```
then hard-reload the page (preflight is cached for 24h — incognito sidesteps
that, but if you test in a normal window, clear site data).

### 2. `Access-Control-Allow-Origin` is empty (`""`)

**Signal:** preflight succeeds but ACAO header is empty. Browser still blocks.

**Cause:** the request's `Origin` isn't in the allowlist. Confirm the page
really is on `https://puppyheavenllc.com` (not the `www.` host, not a Netlify
preview URL — preview origins are intentionally excluded). The allowlist lives
in `supabase/functions/_shared/cors.ts`.

### 3. POST returns 4xx other than 403, or 5xx

**Signal:** browser sees the response body (CORS allowed it through). The
status indicates a server-side error unrelated to CORS or Turnstile.

**Cause:** function reached, then errored. Pull logs:
```
supabase functions logs generate-training-plan
```
Common causes: missing `ANTHROPIC_API_KEY` secret, missing
`SUPABASE_SERVICE_ROLE_KEY`, Anthropic API rate limit, malformed payload.

### 4. No request appears in the Network tab at all

**Signal:** the form fails client-side before invoking the function.

**Cause:** check the Console for a JS error and confirm the build deployed by
Netlify is current (`/training-plan` should render the latest
`TrainingPlanForm.tsx`). Also: if the Turnstile widget never renders, the
Generate button stays disabled — see mode 6.

### 5. POST returns **HTTP 403** with `{"error":"Captcha verification failed","codes":[...]}`

**Signal:** the response is readable (so CORS is fine), and the body explicitly
says the captcha failed. The `codes` array contains Cloudflare's
`error-codes` (e.g. `invalid-input-response`, `timeout-or-duplicate`,
`secret-not-configured`).

**Cause:** the Turnstile gate from #49 is doing its job — but the token didn't
validate. Possible reasons:

- `TURNSTILE_SECRET_KEY` not set in Supabase Edge Function secrets → code
  `secret-not-configured`. Fix: set the secret, redeploy.
- Token expired / reused → code `timeout-or-duplicate`. Fix: refresh the page
  and re-submit (tokens are single-use, ~5 min lifetime).
- Site key in Netlify (`VITE_TURNSTILE_SITE_KEY`) doesn't match the secret in
  Supabase (different Cloudflare site) → code `invalid-input-response`. Fix:
  copy the site/secret pair from the same Cloudflare Turnstile site.

Pull function logs to see the request-side detail:
```
supabase functions logs generate-training-plan
```

### 6. Turnstile widget never renders / Generate button stays disabled

**Signal:** Step 3 of the form shows no Turnstile widget at all. No `iframe`
from `challenges.cloudflare.com`. Generate is permanently disabled.

**Cause:** `VITE_TURNSTILE_SITE_KEY` isn't being shipped in the Netlify build,
OR a script blocker (uBlock Origin, Brave shields, etc.) is blocking
`challenges.cloudflare.com`.

**Fix:**
1. Confirm `VITE_TURNSTILE_SITE_KEY` is set in **Netlify → Site configuration →
   Environment variables** with the correct value, and that the latest deploy
   was triggered after setting it (clear cache + redeploy).
2. Disable any script blocker for the test, or use a clean incognito profile.

### 7. Preflight succeeds but POST returns CORS error

**Signal:** the `OPTIONS` preflight is 204 with correct headers, but the
subsequent `POST` response shows a CORS error.

**Cause:** almost always means the POST handler is throwing **before** headers
are attached. The `corsHeaders(req)` helper returns headers but the throw
short-circuits. Function logs will show the throw — fix the underlying error
and re-deploy.

## Cleanup

- Delete the test submission row from `training_plan_submissions` if you don't
  want it cluttering the admin view.
- Update the audit roadmap's status section: move Wave 2.2 and Wave 2.6 PR-1
  from "merged, awaiting deploy" to "production-verified" with today's date.

## Notes

- Only `generate-training-plan` is exercised by this smoke test — it's the
  only one of the six in the deploy bundle with a public, unauthenticated
  browser entry point.
- The four admin-invoked functions (`send-deposit-link`, `send-deposit-receipt`,
  `send-request-decision`, `finalize-agreement`) get their CORS exercised
  whenever an admin uses the dashboard from `https://puppyheavenllc.com`.
  Spot-check one admin action after deploy as an extra signal.
- `send-pending-reminders` is server-to-server (cron) and intentionally has no
  CORS — don't try to smoke-test it from a browser. To exercise it, use a
  CLI request that includes the `X-Cron-Secret` header.
- `finalize-agreement` has no frontend caller (the admin UI bypasses it via a
  direct table update). Its CORS isn't exercised by any current code path; the
  JWT + admin gate from Wave 2.1 PR-A is defense-in-depth.
