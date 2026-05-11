// Supabase Edge Function: breeder-upload-photo
//
// Gated by `x-breeder-token`. Accepts multipart POST:
//   - file: the (client-side compressed) image
//   - kind: 'puppy' | 'parent'
//   - subjectId: the puppies.id or breeding_dogs.id the photo belongs to
//
// Writes to the public `puppy-photos` bucket at:
//   breeder/{kind}/{subjectId}/{uuid}.{ext}
//
// Returns { ok, path, publicUrl }. The client patches the subject row
// (puppies.photos / breeding_dogs.photos) through breeder-write.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyBreederToken, extractBreederToken } from "../_shared/auth/verifyBreederToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "puppy-photos";
const MAX_BYTES = 5_000_000; // 5MB hard cap; client compresses to ~1.2MB
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function handler(
  req: Request,
  adminOverride?: SupabaseClient,
): Promise<Response> {
  const cors = corsHeaders(req);
  const json = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  const supabase = adminOverride ?? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const tokenCheck = await verifyBreederToken(supabase, extractBreederToken(req));
  if (!tokenCheck.ok) return json(tokenCheck.status, tokenCheck.body);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json(400, { ok: false, error: "Invalid multipart body" });
  }

  const file = form.get("file");
  const kind = form.get("kind");
  const subjectId = form.get("subjectId");

  if (!(file instanceof File)) return json(400, { ok: false, error: "Missing file" });
  if (kind !== "puppy" && kind !== "parent")
    return json(400, { ok: false, error: "kind must be 'puppy' or 'parent'" });
  if (typeof subjectId !== "string" || !/^[0-9a-f-]{36}$/i.test(subjectId))
    return json(400, { ok: false, error: "subjectId must be a UUID" });

  if (file.size > MAX_BYTES)
    return json(413, { ok: false, error: `File too large (${file.size} > ${MAX_BYTES})` });

  const ext = ALLOWED_MIME[file.type];
  if (!ext)
    return json(415, {
      ok: false,
      error: `Unsupported mime type: ${file.type}. Use jpeg, png, or webp.`,
    });

  const path = `breeder/${kind}/${subjectId}/${crypto.randomUUID()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  });
  if (uploadErr)
    return json(500, { ok: false, error: "Upload failed", details: uploadErr.message });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return json(200, { ok: true, path, publicUrl: pub.publicUrl });
}

// See breeder-login for the rationale of the arrow wrap.
Deno.serve((req) => handler(req));
