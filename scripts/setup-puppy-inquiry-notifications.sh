#!/usr/bin/env bash
# Deploy the puppy-inquiry notification Edge Function and print next steps.
# Run from anywhere. Requires: supabase CLI, and you must run `supabase login` first.

set -e
cd "$(dirname "$0")/.." || exit 1
PROJECT_REF="xwudsqswlfpoljuhbphr"
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
echo "2. (Optional) Set where to receive notifications (default: Dreampuppies22@gmail.com):"
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
