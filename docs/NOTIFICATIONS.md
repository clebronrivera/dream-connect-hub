# Email notifications (puppy inquiries & contact messages)

You can get an email whenever someone submits a **puppy inquiry** or a **Contact Us** message. Both use the same Resend setup and the same recipient list (`NOTIFY_EMAIL`).

- **Puppy inquiries:** Edge Function `notify-puppy-inquiry` + webhook on table `puppy_inquiries` (Insert).
- **Contact Us messages:** Edge Function `notify-contact-message` + webhook on table `contact_messages` (Insert).
- **Resend** – delivers the emails (free tier is enough for typical volume).

## 1. Resend setup

1. Sign up at [resend.com](https://resend.com) and create an API key at [resend.com/api-keys](https://resend.com/api-keys).
2. For **testing**, you can use the default “from” address `onboarding@resend.dev` (no domain verification).
3. For **production**, verify your domain in Resend and use a “from” address on that domain (e.g. `notifications@yourdomain.com`).

## 2. Deploy the Edge Function

From the project root:

```bash
# Install Supabase CLI if needed: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF   # if not already linked
supabase functions deploy notify-puppy-inquiry
supabase functions deploy notify-contact-message
```

Set the required secret (and optional ones) in the Supabase Dashboard or via CLI:

```bash
# Required: Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx

# Optional: where to send notifications (default: Dreampuppies22@gmail.com).
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
- **URL**: `https://xwudsqswlfpoljuhbphr.supabase.co/functions/v1/notify-puppy-inquiry`

**Webhook 2 – Contact Us messages**
- **Name**: e.g. `Notify on contact message`
- **Table**: `contact_messages`
- **Events**: **Insert**
- **Type**: HTTP Request
- **URL**: `https://xwudsqswlfpoljuhbphr.supabase.co/functions/v1/notify-contact-message`

After this, new puppy inquiries and Contact Us submissions will trigger the respective Edge Function and send an email to all addresses in `NOTIFY_EMAIL`.

## 4. Local testing (optional)

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
