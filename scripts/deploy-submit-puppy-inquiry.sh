#!/usr/bin/env bash
# scripts/deploy-submit-puppy-inquiry.sh
#
# Wave 2.6 PR-4 — deploy the new `submit-puppy-inquiry` edge function.
#
# This is a minimal, single-function deploy. Run after the PR merges to ship
# the captcha-gated puppy-inquiry path. The downstream `notify-puppy-inquiry`
# webhook fires on the row insert exactly as before, so the admin
# notification email continues unchanged.
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
#   ./scripts/deploy-submit-puppy-inquiry.sh
#
# After deploy, smoke-test from a browser on https://puppyheavenllc.com:
#   - Open /contact?subject=puppy-inquiry (or any entry that opens
#     PuppyInterestForm), complete the form, submit. Expect "Interest
#     Received!" toast and a row in admin → puppy inquiries plus the admin
#     notification email.
#   - Curl directly with no token to fail-closed:
#       curl -X POST -H 'Content-Type: application/json' \
#         -d '{"name":"smoke","email":"smoke@x.test"}' \
#         https://<PROJECT_REF>.supabase.co/functions/v1/submit-puppy-inquiry
#     Expect HTTP 403 with body
#       {"error":"Captcha verification failed","codes":["missing-input-response"]}

set -euo pipefail

echo ""
echo "=== deploy-submit-puppy-inquiry.sh: deploying submit-puppy-inquiry ==="
echo ""

supabase functions deploy submit-puppy-inquiry

echo ""
echo "=== deploy-submit-puppy-inquiry.sh: deploy complete ==="
echo ""
echo "Next: run the browser + curl smoke tests above, then update"
echo "docs/security/wave-2-pending-hardening.md verification log."
