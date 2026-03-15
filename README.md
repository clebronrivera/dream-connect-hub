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

   Optional: `VITE_BANNER_IMAGE_URL` for the hero banner. If you set it, use a public asset URL such as `https://YOUR_REF.supabase.co/storage/v1/object/public/site-assets/banner-puppies.png.jpeg`, not a Supabase dashboard URL. `SUPABASE_SERVICE_ROLE_KEY` is for admin/scripts only and must never be committed.

3. **Run**

   ```sh
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173).

## Build & deploy

- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Deploy:** The app is configured for Netlify (`netlify.toml`). Use `npm run build` and SPA fallback. Ensure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_SITE_URL` are set in the deploy environment.
- **Banner image:** If `VITE_BANNER_IMAGE_URL` is set in Netlify, it must point to a browser-accessible image URL. A `supabase.com/dashboard/project/...` URL is not valid for the live site.

## Deployment troubleshooting

- **Blank site with `Missing Supabase config`:** Netlify built the site without `VITE_SUPABASE_URL` and/or `VITE_SUPABASE_ANON_KEY`. Add the env vars in Netlify, confirm they are available to Production, then redeploy with `Retry without cache with latest branch commit`.
- **Hero image 404:** Check `VITE_BANNER_IMAGE_URL`. If it points to `supabase.com/dashboard/project/...`, replace it with the public storage URL on `https://YOUR_REF.supabase.co/storage/v1/object/public/...` or remove the override and let the app derive the banner from `VITE_SUPABASE_URL`. The default banner path is `site-assets/banner-puppies.png.jpeg`.
- **Puppies page shows a Supabase access/config error:** The page now surfaces the exact failure reason. If it says the client config is missing, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the deploy environment. If it says public read access is blocked, review the `puppies` table anon `SELECT` policy / RLS configuration in Supabase.
- **Pages render HTML but navigation breaks after load:** Make sure the latest production deploy includes the current app bundle, then redeploy without cache. Client-side `VITE_*` values are baked into the build output, so changing env vars alone does not fix an already-published bundle.

## Tech stack

- Vite, TypeScript, React, React Router
- shadcn/ui, Tailwind CSS
- Supabase (Auth, Database, Storage, Edge Functions)
- TanStack Query

## Email notifications

To receive emails when someone submits a puppy inquiry or contact message, see [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md). Setup uses Supabase Edge Functions, database webhooks, and Resend (free tier).

## Documentation and change tracking

- **[CHANGELOG.md](CHANGELOG.md)** – **Changes, fixes, additions, and known issues** by date. Use this to see what was done recently and what was fixed.
- **[docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)** – Index of all project docs: where to find change history, setup, notifications, migrations, and feature guides.
- **[docs/TECHNICAL_AUDIT_REPORT.md](docs/TECHNICAL_AUDIT_REPORT.md)** – Audit outcomes, implementation summary, and file map from the refactor. Use it to see where everything lives and how the system is wired.

## Database

- Schema and migrations live in `supabase/migrations`.
- **With Supabase CLI:** Link once with `supabase link --project-ref YOUR_REF`, then run `npm run db:push` (or `supabase db push`) to apply.
- Admin access is controlled via the `profiles` table (`role = 'admin'`). Create an admin user in Supabase Auth, then insert a row into `profiles` with that user’s `user_id` and `role = 'admin'`.
