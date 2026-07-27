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

// Photo kinds only — 'video' belongs to breeder-upload-video.
const MEDIA_KINDS = new Set(["face", "back", "top", "paw", "candid"]);

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
  // Optional puppy_media recording. Absent => legacy behaviour (upload only).
  const record = form.get("record");
  const mediaKind = form.get("mediaKind") ?? "candid";
  const isPublic = form.get("isPublic") ?? "false";
  const derivedFrom = form.get("derivedFrom");
  const editOps = form.get("editOps");

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

  // Optional: also record the upload in puppy_media, so the caller doesn't have
  // to make a second round trip and can't leave a file with no row behind it.
  // Omitted entirely by legacy callers, whose behaviour is unchanged.
  if (record === "1" && kind === "puppy") {
    const mediaRow: Record<string, unknown> = {
      puppy_id: subjectId,
      media_type: "photo",
      kind: MEDIA_KINDS.has(String(mediaKind)) ? mediaKind : "candid",
      url: pub.publicUrl,
      storage_bucket: BUCKET,
      storage_path: path,
      // Staging by default. Only the capture wizard, which replaces one
      // known slot at a time, opts into publishing straight away.
      is_public: isPublic === "true",
      sort_order: await nextSortOrder(supabase, subjectId),
    };
    if (typeof derivedFrom === "string" && /^[0-9a-f-]{36}$/i.test(derivedFrom)) {
      mediaRow.derived_from_media_id = derivedFrom;
    }
    if (typeof editOps === "string" && editOps.length > 0) {
      try {
        mediaRow.edit_ops = JSON.parse(editOps);
      } catch {
        return json(400, { ok: false, error: "editOps must be valid JSON" });
      }
    }

    const { data: media, error: mediaErr } = await supabase
      .from("puppy_media")
      .insert(mediaRow)
      .select("*")
      .single();

    if (mediaErr || !media) {
      // Don't leave a file nobody has a handle on.
      await supabase.storage.from(BUCKET).remove([path]);
      return json(500, {
        ok: false,
        error: "Failed to record media row",
        details: mediaErr?.message,
      });
    }

    return json(200, { ok: true, path, publicUrl: pub.publicUrl, media });
  }

  return json(200, { ok: true, path, publicUrl: pub.publicUrl });
}

/** Append to the end of the puppy's existing photos. Reordering is an explicit
 *  operator action (reorderPuppyMedia), never a side effect of uploading. */
async function nextSortOrder(supabase: SupabaseClient, puppyId: string): Promise<number> {
  const { data } = await supabase
    .from("puppy_media")
    .select("sort_order")
    .eq("puppy_id", puppyId)
    .eq("media_type", "photo")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const top = data?.sort_order;
  return typeof top === "number" ? top + 1 : 0;
}

// See breeder-login for the rationale of the arrow wrap.
Deno.serve((req) => handler(req));
