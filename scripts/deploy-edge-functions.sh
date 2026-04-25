#!/usr/bin/env bash
# scripts/deploy-edge-functions.sh
#
# Bundled deploy for the current pending edge-function changes:
#   Wave 2.1 PR-A (#44) — send-pending-reminders, finalize-agreement
#   Wave 2.2     (#46) — generate-training-plan, send-deposit-link,
#                        send-deposit-receipt, send-request-decision
#   Wave 2.6 PR-1 (#49) — generate-training-plan (Turnstile gate)
#
# `generate-training-plan` is deployed once and activates BOTH the Wave 2.2
# CORS allowlist AND the Wave 2.6 Turnstile gate at the same time. The smoke
# test in docs/ops/smoke-test.md covers both signals.
#
# Idempotent: re-running this script re-deploys the same six functions; the
# Supabase CLI replaces the existing deployment in place. No DB migrations are
# triggered here — run `supabase db push` separately if needed.
#
# Prereqs (verify before running):
#   1. `supabase --version` works (CLI installed).
#   2. `supabase projects list` succeeds (CLI authenticated).
#   3. The CLI is linked to the prod project, e.g.:
#        supabase link --project-ref <YOUR_PROJECT_REF>
#      (project_id in supabase/config.toml is "dream-connect-hub" — confirm
#       this matches the prod project before deploying.)
#   4. You are on `main` with a clean working tree.
#   5. CRON_SECRET and TURNSTILE_SECRET_KEY are set in Supabase Edge Function
#      secrets. The functions will fail-closed without them.
#
# Usage:
#   ./scripts/deploy-edge-functions.sh
#
# Stops at the first failure. Re-run safely after fixing.

set -euo pipefail

FUNCTIONS=(
  "send-pending-reminders"   # Wave 2.1 PR-A — CRON_SECRET gate
  "finalize-agreement"       # Wave 2.1 PR-A — JWT + admin role gate
  "generate-training-plan"   # Wave 2.2 CORS + Wave 2.6 PR-1 Turnstile gate
  "send-deposit-link"        # Wave 2.2 — CORS allowlist
  "send-deposit-receipt"     # Wave 2.2 — CORS allowlist
  "send-request-decision"    # Wave 2.2 — CORS allowlist
)

echo ""
echo "=== deploy-edge-functions.sh: deploying ${#FUNCTIONS[@]} edge functions ==="
echo ""

i=0
for fn in "${FUNCTIONS[@]}"; do
  i=$((i + 1))
  echo ">>> [${i}/${#FUNCTIONS[@]}] supabase functions deploy ${fn}"
  supabase functions deploy "${fn}"
  echo "<<< [${i}/${#FUNCTIONS[@]}] ${fn} deployed"
  echo ""
done

echo "=== deploy-edge-functions.sh: all ${#FUNCTIONS[@]} functions deployed successfully ==="
echo ""
echo "Next: run docs/ops/smoke-test.md against https://puppyheavenllc.com to"
echo "verify CORS + Turnstile, then update the audit roadmap entries from"
echo "'awaiting deploy' to 'production-verified'."
