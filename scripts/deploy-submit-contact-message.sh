#!/usr/bin/env bash
# scripts/deploy-submit-contact-message.sh
#
# Wave 2.6 PR-3 — deploy the new `submit-contact-message` edge function.
#
# This is a minimal, single-function deploy. Run after the PR merges to ship
# the captcha-gated contact-form path. The downstream `notify-contact-message`
# webhook fires on the row insert exactly as before.
#
# Prereqs (verify before running):
#   1. `supabase --version` works (CLI installed).
#   2. `supabase projects list` succeeds (CLI authenticated).
#   3. The CLI is linked to the prod project, e.g.:
#        supabase link --project-ref <YOUR_PROJECT_REF>
#      (project_id in supabase/config.toml is "dream-connect-hub" — confirm
#       this matches the prod project before deploying.)
#   4. You are on `main` with a clean working tree.
#   5. TURNSTILE_SECRET_KEY is set in Supabase Edge Function secrets. The
#      function fail-closes (returns 403 with secret-not-configured) without
#      it.
#
# Usage:
#   ./scripts/deploy-submit-contact-message.sh
#
# After deploy, smoke-test from a browser on https://puppyheavenllc.com:
#   - Open /contact, submit the general form with a real email and message.
#     Expect a "Message Sent!" toast and a row in admin → contact messages.
#   - Open /contact?subject=upcoming-litter, complete the upcoming-litter
#     form, submit. Expect the same toast and row.
#   - Curl directly with no token to fail-closed:
#       curl -X POST -H 'Content-Type: application/json' \
#         -d '{"name":"smoke","email":"smoke@x.test","subject":"smoke","message":"smoke"}' \
#         https://<PROJECT_REF>.supabase.co/functions/v1/submit-contact-message
#     Expect HTTP 403 with body
#       {"error":"Captcha verification failed","codes":["missing-input-response"]}

set -euo pipefail

echo ""
echo "=== deploy-submit-contact-message.sh: deploying submit-contact-message ==="
echo ""

supabase functions deploy submit-contact-message

echo ""
echo "=== deploy-submit-contact-message.sh: deploy complete ==="
echo ""
echo "Next: run the browser + curl smoke tests above, then update"
echo "docs/security/wave-2-pending-hardening.md verification log."
