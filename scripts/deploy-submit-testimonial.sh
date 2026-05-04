#!/usr/bin/env bash
# scripts/deploy-submit-testimonial.sh
#
# Wave 2.6 PR-2 — deploy the new `submit-testimonial` edge function.
#
# This is a minimal, single-function deploy. Run after the PR merges to ship
# the captcha-gated testimonial path.
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
#   ./scripts/deploy-submit-testimonial.sh
#
# After deploy, smoke-test from a browser on https://puppyheavenllc.com:
#   - Open the Dreamy Reviews page → "Share Your Story" dialog.
#   - Confirm the Turnstile widget renders below the photo upload.
#   - Submit with valid token → expect a "pending approval" toast and a row
#     in admin → testimonials.
#   - Curl directly with no token to fail-closed:
#       curl -X POST -H 'Content-Type: application/json' \
#         -d '{"customer_name":"smoke","message":"smoke"}' \
#         https://<PROJECT_REF>.supabase.co/functions/v1/submit-testimonial
#     Expect HTTP 403 with body
#       {"error":"Captcha verification failed","codes":["missing-input-response"]}

set -euo pipefail

echo ""
echo "=== deploy-submit-testimonial.sh: deploying submit-testimonial ==="
echo ""

supabase functions deploy submit-testimonial

echo ""
echo "=== deploy-submit-testimonial.sh: deploy complete ==="
echo ""
echo "Next: run the browser + curl smoke tests above, then update"
echo "docs/security/wave-2-pending-hardening.md verification log."
