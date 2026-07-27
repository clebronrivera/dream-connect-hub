// Supabase Edge Function: breeder-media
//
// Every puppy_media operation for the breeder portal. Same `x-breeder-token`
// gate and service-role client as breeder-write, but deliberately a SEPARATE
// function rather than more cases on that switchboard:
//
// breeder-write is load-bearing for the entire breeder app (home, roster,
// puppy create/update, parents). Media is a new, self-contained concern, so
// keeping it in its own deployable means a bad media deploy can never take
// the rest of the portal down with it.
//
// Contract shared by all mutating ops: they return BOTH the affected media
// row(s) and the freshly-projected `puppies` row, because writing puppy_media
// rewrites puppies.photos / primary_photo / video_path via the DB trigger.
// Returning both lets the client patch its media list and its puppy roster
// cache from one response instead of refetching.
//
// Note on ordering and primary: neither is computed here. `sort_order` is
// rewritten by puppy_media_reorder() and the primary is moved by
// puppy_media_set_primary(), both SQL functions, so the multi-statement work
// happens in one transaction inside the partial unique index rather than
// being raced from the client.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyBreederToken, extractBreederToken } from "../_shared/auth/verifyBreederToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export type JsonResponder = (status: number, body: unknown) => Response;

interface RequestBody {
  op?: string;
  payload?: unknown;
}

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

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const res = await handlePuppyMediaOp(supabase, body.op ?? "", body.payload, json);
  if (res) return res;
  return json(400, { ok: false, error: `Unknown op: ${body.op ?? "(none)"}` });
}

export const PUPPY_SELECT =
  "id, name, gender, breed, color, date_of_birth, photos, primary_photo, video_path, " +
  "description, ready_date, base_price, status, is_publicly_visible, vaccinated_at, " +
  "generation, personality_blurb";

const MEDIA_SELECT =
  "id, puppy_id, media_type, kind, url, storage_bucket, storage_path, is_public, " +
  "is_primary, sort_order, derived_from_media_id, edit_ops, width, height, " +
  "captured_at, created_at, updated_at";

const MEDIA_KINDS = new Set(["face", "back", "top", "paw", "candid", "video"]);
const OUR_BUCKETS = new Set(["puppy-photos", "puppy-videos"]);

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

/** Mirror of the SQL puppy_media_parse_storage(). Returns nulls for anything
 *  we don't recognize, which is what keeps us from ever deleting a file we
 *  didn't upload. */
export function parseStorageLocation(
  url: string,
  defaultBucket: string,
): { bucket: string | null; path: string | null } {
  const clean = url.trim().split("?")[0].split("#")[0];
  if (!clean) return { bucket: null, path: null };
  if (/^https?:\/\//i.test(clean) || clean.startsWith("//")) {
    const m = clean.match(
      /\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/]+)\/(.+)$/,
    );
    return m ? { bucket: m[1], path: m[2] } : { bucket: null, path: null };
  }
  return { bucket: defaultBucket, path: clean.replace(/^\/+/, "") };
}

async function freshPuppy(supabase: SupabaseClient, puppyId: string) {
  const { data } = await supabase
    .from("puppies")
    .select(PUPPY_SELECT)
    .eq("id", puppyId)
    .maybeSingle();
  return data ?? null;
}

async function listMedia(supabase: SupabaseClient, puppyId: string) {
  const { data, error } = await supabase
    .from("puppy_media")
    .select(MEDIA_SELECT)
    .eq("puppy_id", puppyId)
    // Same ordering the projection uses, so the UI's "on the site" lane
    // matches puppies.photos exactly.
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** The subset of puppy_media we actually branch on server-side. The Supabase
 *  client here is untyped (no generated Database types in this project), so
 *  responses come back as `any`-ish and need naming at the boundary. */
interface MediaRow {
  id: string;
  puppy_id: string;
  media_type: "photo" | "video";
  kind: string;
  url: string;
  storage_bucket: string | null;
  storage_path: string | null;
  is_public: boolean;
  is_primary: boolean;
  sort_order: number;
}

/** Load one media row, or produce the 400/404 response for the caller. */
async function loadMediaRow(
  supabase: SupabaseClient,
  mediaId: unknown,
  json: JsonResponder,
): Promise<{ row: MediaRow } | { fail: Response }> {
  if (!isUuid(mediaId)) {
    return { fail: json(400, { ok: false, error: "mediaId must be a UUID" }) };
  }
  const { data, error } = await supabase
    .from("puppy_media")
    .select(MEDIA_SELECT)
    .eq("id", mediaId)
    .maybeSingle();
  if (error) {
    return { fail: json(500, { ok: false, error: "Failed to load media", details: error.message }) };
  }
  if (!data) return { fail: json(404, { ok: false, error: "Media not found" }) };
  return { row: data as unknown as MediaRow };
}

/** Best-effort storage retirement. Deletes only objects we uploaded into this
 *  puppy's own breeder folder, and only when no other media row still points
 *  at the same URL. Never throws — an orphaned object is harmless next to a
 *  deleted-photo-we-still-needed. */
async function retireObject(
  supabase: SupabaseClient,
  row: { url?: unknown; puppy_id?: unknown; storage_bucket?: unknown; storage_path?: unknown },
  excludeMediaId: string,
): Promise<void> {
  const bucket = typeof row.storage_bucket === "string" ? row.storage_bucket : null;
  const path = typeof row.storage_path === "string" ? row.storage_path : null;
  const url = typeof row.url === "string" ? row.url : null;
  const puppyId = typeof row.puppy_id === "string" ? row.puppy_id : null;
  if (!bucket || !path || !url || !puppyId) return;
  if (!OUR_BUCKETS.has(bucket)) return;
  // Defence in depth: only inside this puppy's own breeder namespace. Admin
  // uploads land on flat paths and are deliberately never deleted.
  if (!path.startsWith(`breeder/puppy/${puppyId}/`)) return;

  const { data, error } = await supabase
    .from("puppy_media")
    .select("id")
    .eq("url", url)
    .neq("id", excludeMediaId)
    .limit(1);
  if (error) return; // On uncertainty, keep the file.
  if ((data?.length ?? 0) > 0) return;

  await supabase.storage.from(bucket).remove([path]);
}

// ---------------------------------------------------------------------------
// Ops
// ---------------------------------------------------------------------------

export async function handlePuppyMediaOp(
  supabase: SupabaseClient,
  op: string,
  payload: unknown,
  json: JsonResponder,
): Promise<Response | null> {
  const p = (payload ?? {}) as Record<string, unknown>;

  switch (op) {
    // -----------------------------------------------------------------------
    case "listPuppyMedia": {
      if (!isUuid(p.puppyId)) return json(400, { ok: false, error: "puppyId must be a UUID" });
      try {
        return json(200, { ok: true, data: { media: await listMedia(supabase, p.puppyId) } });
      } catch (e) {
        return json(500, {
          ok: false,
          error: "Failed to list media",
          details: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // -----------------------------------------------------------------------
    case "updatePuppyMedia": {
      const loaded = await loadMediaRow(supabase, p.mediaId, json);
      if ("fail" in loaded) return loaded.fail;
      const row = loaded.row;
      const puppyId = row.puppy_id as string;

      const raw = (p.patch ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = {};

      if ("kind" in raw) {
        if (typeof raw.kind !== "string" || !MEDIA_KINDS.has(raw.kind))
          return json(400, { ok: false, error: `kind must be one of ${[...MEDIA_KINDS].join(", ")}` });
        // kind='video' is the same statement as media_type='video'; the DB
        // CHECK enforces it, so reject the mismatch with a clear message here.
        const isVideo = row.media_type === "video";
        if ((raw.kind === "video") !== isVideo)
          return json(400, { ok: false, error: `kind '${raw.kind}' does not match media_type '${row.media_type}'` });
        patch.kind = raw.kind;
      }
      if ("sort_order" in raw) {
        if (typeof raw.sort_order !== "number" || !Number.isInteger(raw.sort_order) || raw.sort_order < 0)
          return json(400, { ok: false, error: "sort_order must be a non-negative integer" });
        patch.sort_order = raw.sort_order;
      }
      if ("is_public" in raw) {
        if (typeof raw.is_public !== "boolean")
          return json(400, { ok: false, error: "is_public must be a boolean" });
        patch.is_public = raw.is_public;
        // The primary must be a public photo. Hiding it demotes it rather
        // than failing the CHECK — the operator gets to publish a new primary
        // afterwards (or the puppy falls back to photos[0] on the site).
        if (raw.is_public === false && row.is_primary === true) patch.is_primary = false;
      }
      if ("is_primary" in raw)
        return json(400, { ok: false, error: "Use setPuppyMediaPrimary to change the primary" });
      if (Object.keys(patch).length === 0)
        return json(400, { ok: false, error: "patch must contain at least one of kind, is_public, sort_order" });

      const { data, error } = await supabase
        .from("puppy_media")
        .update(patch)
        .eq("id", p.mediaId)
        .select(MEDIA_SELECT)
        .single();
      if (error || !data)
        return json(500, { ok: false, error: "Failed to update media", details: error?.message });

      return json(200, { ok: true, data: { media: data, puppy: await freshPuppy(supabase, puppyId) } });
    }

    // -----------------------------------------------------------------------
    case "setPuppyMediaPrimary": {
      const loaded = await loadMediaRow(supabase, p.mediaId, json);
      if ("fail" in loaded) return loaded.fail;
      const puppyId = loaded.row.puppy_id as string;

      const { error } = await supabase.rpc("puppy_media_set_primary", { p_media_id: p.mediaId });
      if (error)
        return json(400, { ok: false, error: "Failed to set primary", details: error.message });

      return json(200, {
        ok: true,
        data: { media: await listMedia(supabase, puppyId), puppy: await freshPuppy(supabase, puppyId) },
      });
    }

    // -----------------------------------------------------------------------
    case "reorderPuppyMedia": {
      if (!isUuid(p.puppyId)) return json(400, { ok: false, error: "puppyId must be a UUID" });
      const ids = p.orderedIds;
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid))
        return json(400, { ok: false, error: "orderedIds must be a non-empty array of UUIDs" });
      if (new Set(ids).size !== ids.length)
        return json(400, { ok: false, error: "orderedIds contains duplicates" });

      // puppy_media_reorder raises if any id belongs to another puppy.
      const { error } = await supabase.rpc("puppy_media_reorder", {
        p_puppy_id: p.puppyId,
        p_ids: ids,
      });
      if (error)
        return json(400, { ok: false, error: "Failed to reorder media", details: error.message });

      return json(200, {
        ok: true,
        data: {
          media: await listMedia(supabase, p.puppyId),
          puppy: await freshPuppy(supabase, p.puppyId),
        },
      });
    }

    // -----------------------------------------------------------------------
    case "setPuppyMediaVisibility": {
      if (!isUuid(p.puppyId)) return json(400, { ok: false, error: "puppyId must be a UUID" });
      const ids = p.mediaIds;
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid))
        return json(400, { ok: false, error: "mediaIds must be a non-empty array of UUIDs" });
      if (typeof p.isPublic !== "boolean")
        return json(400, { ok: false, error: "isPublic must be a boolean" });

      const patch: Record<string, unknown> = { is_public: p.isPublic };
      // Same demote-the-primary rule as updatePuppyMedia.
      if (p.isPublic === false) patch.is_primary = false;

      const { error } = await supabase
        .from("puppy_media")
        .update(patch)
        .in("id", ids)
        .eq("puppy_id", p.puppyId); // scope so a stray id can't touch another puppy
      if (error)
        return json(500, { ok: false, error: "Failed to update visibility", details: error.message });

      return json(200, {
        ok: true,
        data: {
          media: await listMedia(supabase, p.puppyId),
          puppy: await freshPuppy(supabase, p.puppyId),
        },
      });
    }

    // -----------------------------------------------------------------------
    // Single-slot swap: keeps kind / sort_order / is_public / is_primary and
    // just repoints the row at a newly-uploaded file. This is what the capture
    // wizard's "retake" and the manager's "replace" both use.
    case "replacePuppyMedia": {
      const loaded = await loadMediaRow(supabase, p.mediaId, json);
      if ("fail" in loaded) return loaded.fail;
      const row = loaded.row;
      const puppyId = row.puppy_id as string;

      if (typeof p.newUrl !== "string" || p.newUrl.length === 0)
        return json(400, { ok: false, error: "newUrl is required" });
      if (p.newUrl === row.url)
        return json(400, { ok: false, error: "newUrl matches the current url" });

      const defaultBucket = row.media_type === "video" ? "puppy-videos" : "puppy-photos";
      const loc = parseStorageLocation(p.newUrl, defaultBucket);

      const { data, error } = await supabase
        .from("puppy_media")
        .update({ url: p.newUrl, storage_bucket: loc.bucket, storage_path: loc.path })
        .eq("id", p.mediaId)
        .select(MEDIA_SELECT)
        .single();
      if (error || !data)
        return json(500, { ok: false, error: "Failed to replace media", details: error?.message });

      // The row now points at the new file, so nothing references the old one.
      await retireObject(supabase, row, p.mediaId as string);

      return json(200, { ok: true, data: { media: data, puppy: await freshPuppy(supabase, puppyId) } });
    }

    // -----------------------------------------------------------------------
    case "deletePuppyMedia": {
      const loaded = await loadMediaRow(supabase, p.mediaId, json);
      if ("fail" in loaded) return loaded.fail;
      const row = loaded.row;
      const puppyId = row.puppy_id as string;

      const { error } = await supabase.from("puppy_media").delete().eq("id", p.mediaId);
      if (error)
        return json(500, { ok: false, error: "Failed to delete media", details: error.message });

      await retireObject(supabase, row, p.mediaId as string);

      return json(200, {
        ok: true,
        data: {
          id: p.mediaId,
          media: await listMedia(supabase, puppyId),
          puppy: await freshPuppy(supabase, puppyId),
        },
      });
    }
  }

  return null; // not a media op — the caller turns this into a 400
}

// See breeder-login for the rationale of the arrow wrap.
Deno.serve((req) => handler(req));
