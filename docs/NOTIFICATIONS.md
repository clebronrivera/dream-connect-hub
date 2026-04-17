# Email & SMS notifications

All emails are sent through **Resend** from Supabase Edge Functions. One function (`send-deposit-link`) also sends SMS via Twilio. Every email renders through the shared branded template module at `supabase/functions/_shared/email/` (red primary `#E94B3C`, paw logo header, unified footer).

| Function | Trigger | Channel(s) | Recipient(s) |
|---|---|---|---|
| `notify-puppy-inquiry` | DB webhook on `puppy_inquiries` INSERT | Email | Admin (`NOTIFY_EMAIL`) |
| `notify-contact-message` | DB webhook on `contact_messages` INSERT | Email | Admin + Customer ack |
| `notify-deposit-request` | DB webhook on `deposit_requests` INSERT | Email | Admin + Customer ack |
| `send-deposit-link` | Admin-invoked from `/admin/deposit-requests` | Email + SMS (Twilio) | Customer |
| `finalize-agreement` | Admin-invoked once buyer-signed + admin-signed + deposit confirmed | Email | Customer + Admin |
| `send-pending-reminders` | Scheduled cron | Email | Admin |
| `send-deposit-receipt` | Admin-invoked when `deposit_status = admin_confirmed` | Email | Customer |
| `send-request-decision` | Admin-invoked on accept/decline of a deposit request | Email | Customer |
| `generate-training-plan` | Public POST — returns plan JSON AND emails copy to customer + admin lead alert | Email | Customer + Admin |

The admin-facing functions are one-way alerts to staff. Customer-facing functions send branded acknowledgment and status emails. See `docs/DEPOSIT_REQUEST_FLOW.md` for the full deposit request workflow.

## 1. Resend setup

1. Sign up at [resend.com](https://resend.com) and create an API key at [resend.com/api-keys](https://resend.com/api-keys).
2. For **testing**, you can use the default “from” address `onboarding@resend.dev` (no domain verification).
3. For **production**, verify your domain in Resend and use a “from” address on that domain (e.g. `notifications@yourdomain.com`).

## 2. Deploy the Edge Function

From the project root:

```bash
# Install Supabase CLI if needed: https://supabase.com/docs/guides/cli
supabase login
# Use your project ref from .env.local (VITE_SUPABASE_URL: https://YOUR_PROJECT_REF.supabase.co)
supabase link --project-ref YOUR_PROJECT_REF   # if not already linked
supabase functions deploy notify-puppy-inquiry
supabase functions deploy notify-contact-message
supabase functions deploy notify-deposit-request
supabase functions deploy send-deposit-link
supabase functions deploy finalize-agreement
supabase functions deploy send-pending-reminders
supabase functions deploy send-deposit-receipt
supabase functions deploy send-request-decision
supabase functions deploy generate-training-plan
```

Set the required secrets (and optional ones) in the Supabase Dashboard or via CLI:

```bash
# Required: Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Required: where to send notifications.
# For multiple addresses, use a comma-separated list (no spaces or with spaces, both work):
supabase secrets set NOTIFY_EMAIL="you@example.com, teammate@example.com"

# Optional: "from" address (default: Dream Connect <onboarding@resend.dev>)
# Use this after verifying your domain, e.g.:
# supabase secrets set RESEND_FROM="Dream Connect <notifications@yourdomain.com>"
```

## 3. Create the Database Webhooks

Create **two** webhooks in [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Database** → **Webhooks** (or **Integrations** → **Webhooks**).

**Webhook 1 – Puppy inquiries**
- **Name**: e.g. `Notify on puppy inquiry`
- **Table**: `puppy_inquiries`
- **Events**: **Insert**
- **Type**: HTTP Request
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-puppy-inquiry`  
  (Use the same project ref as in your `VITE_SUPABASE_URL` from `.env.local`.)

**Webhook 2 – Contact Us messages**
- **Name**: e.g. `Notify on contact message`
- **Table**: `contact_messages`
- **Events**: **Insert**
- **Type**: HTTP Request
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-contact-message`

**Webhook 3 – Deposit requests**
- **Name**: e.g. `Notify on deposit request`
- **Table**: `deposit_requests`
- **Events**: **Insert**
- **Type**: HTTP Request
- **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/notify-deposit-request`

After this, new puppy inquiries, Contact Us submissions, and deposit requests will trigger the respective Edge Function and send an email to all addresses in `NOTIFY_EMAIL`.

## 4. Twilio (SMS) setup — for `send-deposit-link`

The `send-deposit-link` function delivers the deposit agreement URL to the customer via email and SMS. Twilio handles the SMS side. See `docs/DEPOSIT_REQUEST_FLOW.md` for the full flow.

Required secrets (Project Settings → Edge Functions → Secrets):

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX   # E.164 format, with the +
SITE_URL=https://puppyheavenllc.com  # base URL used to build the deposit link
```

**Trial caveat:** Twilio trial accounts can only send SMS to phone numbers verified in the Twilio Console (Phone Numbers → Manage → **Verified Caller IDs**). To send to any US number, upgrade the Twilio account.

## 5. Local testing (optional)

To test the function locally with the Supabase CLI:

```bash
# Terminal 1: start Supabase (if using local Supabase)
supabase start

# Terminal 2: serve the function with your env
supabase functions serve notify-puppy-inquiry --no-verify-jwt --env-file supabase/.env.local
```

Create a file `supabase/.env.local` (do not commit it) with:

```
RESEND_API_KEY=re_xxxxxxxxxxxx
NOTIFY_EMAIL=your@email.com
```

Then add a **local** Database Webhook that points to:

`http://host.docker.internal:54321/functions/v1/notify-puppy-inquiry`

(Use the Dashboard or SQL trigger for the local database.)

## Troubleshooting

- **No emails**  
  - Check Database → Webhooks for the webhook and any failure logs.  
  - In Supabase Dashboard go to Edge Functions → `notify-puppy-inquiry` and check Logs for errors.  
  - Ensure `RESEND_API_KEY` is set and valid.

- **Resend errors**  
  - If you see “from” or domain errors, use `onboarding@resend.dev` for testing or verify your domain and set `RESEND_FROM` to an address on that domain.

- **Webhook not firing**  
  - Confirm the webhook is for table `puppy_inquiries`, schema `public`, and event **Insert**.  
  - Ensure the webhook URL is exactly your Edge Function URL (no trailing slash).
