// Shared CORS helper for Supabase edge functions.
//
// Allowlist policy:
//   - Production:        https://puppyheavenllc.com
//   - Production (www):  https://www.puppyheavenllc.com
//   - Local development: http://localhost:8080  (Vite dev server, see vite.config.ts)
//
// Unknown / non-allowlisted origins receive an empty Access-Control-Allow-Origin
// header, which causes the browser to block the response. Server-to-server
// callers (cron, database webhooks, supabase-js with the service role from a
// server context) typically don't send an Origin header and so don't depend on
// CORS at all.
//
// Netlify deploy-preview origins (https://deploy-preview-NN--silver-moxie-59da12.netlify.app)
// are intentionally NOT included. If preview-deploy testing of the
// CORS-protected functions becomes necessary, add a regex match in a later PR
// scoped tightly to that pattern.

const ALLOWED_ORIGINS = new Set<string>([
  "https://puppyheavenllc.com",
  "https://www.puppyheavenllc.com",
  "http://localhost:8080",
]);

const STATIC_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
} as const;

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    ...STATIC_HEADERS,
  };
}
