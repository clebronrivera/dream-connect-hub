# Puppy Heaven (Dream Connect Hub)

Family-operated puppy website: available puppies, upcoming litters, pet consultation, contact, and breed information. Built with Vite, React, TypeScript, and Supabase.

## Setup

1. **Clone and install**

   ```sh
   git clone <YOUR_GIT_URL>
   cd dream-connect-hub
   npm i
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   - `VITE_SUPABASE_URL` – Supabase project URL (e.g. `https://YOUR_REF.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` – Supabase anon key
   - `VITE_SITE_URL` – Public production site URL used for canonical SEO URLs, `og:url`, sitemap, and robots output

   Optional: `VITE_BANNER_IMAGE_URL` for hero banner; `SUPABASE_SERVICE_ROLE_KEY` for admin/scripts only (never commit).

3. **Run**

   ```sh
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173).

## Build & deploy

- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Deploy:** The app is configured for Netlify (`netlify.toml`). Use `npm run build` and SPA fallback. Ensure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` are set in the deploy environment.

## Tech stack

- Vite, TypeScript, React, React Router
- shadcn/ui, Tailwind CSS
- Supabase (Auth, Database, Storage, Edge Functions)
- TanStack Query

## Email notifications

To receive emails when someone submits a puppy inquiry or contact message, see [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md). Setup uses Supabase Edge Functions, database webhooks, and Resend (free tier).

## Technical audit report

A technical report with audit outcomes, implementation summary, and a file map is in **[docs/TECHNICAL_AUDIT_REPORT.md](docs/TECHNICAL_AUDIT_REPORT.md)**. Use it to see what was changed, where everything lives, and how the system is wired after the refactor.

## Database

- Schema and migrations live in `supabase/migrations`.
- **With Supabase CLI:** Link once with `supabase link --project-ref YOUR_REF`, then run `npm run db:push` (or `supabase db push`) to apply.
- Admin access is controlled via the `profiles` table (`role = 'admin'`). Create an admin user in Supabase Auth, then insert a row into `profiles` with that user’s `user_id` and `role = 'admin'`.
