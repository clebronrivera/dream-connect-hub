#!/usr/bin/env bash
# Deploy the puppy-inquiry notification Edge Function and print next steps.
# Run from project root. Requires: supabase CLI, and you must run `supabase login` first.
# Project ref is read from .env.local (VITE_SUPABASE_URL) or SUPABASE_PROJECT_REF.

set -e
cd "$(dirname "$0")/.." || exit 1

if [ -f .env.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

# Derive project ref from VITE_SUPABASE_URL (e.g. https://abc123.supabase.co -> abc123) or use SUPABASE_PROJECT_REF
if [ -n "$SUPABASE_PROJECT_REF" ]; then
  PROJECT_REF="$SUPABASE_PROJECT_REF"
elif [ -n "$VITE_SUPABASE_URL" ]; then
  PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed -n 's|https://\([^.]*\)\.supabase\.co.*|\1|p')
fi

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Set VITE_SUPABASE_URL in .env.local (e.g. https://YOUR_REF.supabase.co) or SUPABASE_PROJECT_REF"
  exit 1
fi

FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/notify-puppy-inquiry"
WEBHOOKS_URL="https://supabase.com/dashboard/project/${PROJECT_REF}/database/hooks"

echo "→ Linking Supabase project (if not already linked)..."
supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true

echo "→ Deploying Edge Functions: notify-puppy-inquiry, notify-contact-message"
supabase functions deploy notify-puppy-inquiry
supabase functions deploy notify-contact-message

echo ""
echo "✅ Function deployed."
echo ""
echo "Next steps:"
echo "1. Set your Resend API key (get one at https://resend.com/api-keys):"
echo "   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx"
echo ""
echo "2. Set where to receive notifications:"
echo "   supabase secrets set NOTIFY_EMAIL=your@email.com"
echo ""
echo "3. Create Database Webhooks (if not already):"
echo "   Open: ${WEBHOOKS_URL}"
echo "   Webhook 1 - Puppy inquiries:"
echo "   - Table: puppy_inquiries, Events: Insert"
echo "   - URL: ${FUNCTION_URL}"
echo "   Webhook 2 - Contact Us messages:"
echo "   - Table: contact_messages, Events: Insert"
echo "   - URL: https://${PROJECT_REF}.supabase.co/functions/v1/notify-contact-message"
echo ""
