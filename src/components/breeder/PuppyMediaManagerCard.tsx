// One puppy's media library in the breeder portal.
//
// Collapsed it's a summary row; expanded it fetches that puppy's puppy_media
// rows and splits them into two lanes:
//
//   "On the site"  is_public = true   → exactly what puppies.photos projects to
//   "Staging"      is_public = false  → visible only here
//
// The lanes are the whole point of the feature. The operator photographs
// puppies all day and dumps the batch in here; nothing reaches the public site
// until they publish it. So the add-flow always uploads to staging, and
// publishing is a separate, deliberate tap.
//
// Media is fetched lazily per card — a roster of 30+ puppies shouldn't fire 30
// requests on page load when the operator only wants to work on one.
//
// This component owns every mutation for its puppy. MediaTile and
// MediaActionSheet are presentational and report intent upward, so optimistic
// cache patching and error handling live in exactly one place.

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaTile } from "@/components/breeder/MediaTile";
import { MediaActionSheet } from "@/components/breeder/MediaActionSheet";
import { MediaEditSheet } from "@/components/breeder/media-edit/MediaEditSheet";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { compressPhoto } from "@/lib/breeder/compressImage";
import { buildReorderIds, computeMoveBounds } from "@/lib/breeder/mediaSlots";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";
import {
  deletePuppyMedia,
  listPuppyMedia,
  reorderPuppyMedia,
  replacePuppyMedia,
  setPuppyMediaPrimary,
  setPuppyMediaVisibility,
  updatePuppyMedia,
  uploadBreederPhoto,
  uploadBreederVideo,
  type BreederPuppyRow,
  type BreederPuppyWithLitter,
  type PuppyMediaKind,
  type PuppyMediaRow,
} from "@/lib/breeder/api";

const ALL_PUPPIES_QK = ["breeder", "allPuppies"] as const;
export const MEDIA_QK = (puppyId: string) => ["breeder", "puppyMedia", puppyId] as const;

const VIDEO_MIME = /^video\//i;

export interface PuppyMediaManagerCardProps {
  puppy: BreederPuppyWithLitter;
  expanded: boolean;
  onToggle: () => void;
  subtitle: string;
}

export function PuppyMediaManagerCard({
  puppy,
  expanded,
  onToggle,
  subtitle,
}: PuppyMediaManagerCardProps) {
  const { session } = useBreederAuth();
  const queryClient = useQueryClient();
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const [sheetMedia, setSheetMedia] = useState<PuppyMediaRow | null>(null);
  const [editMedia, setEditMedia] = useState<PuppyMediaRow | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: MEDIA_QK(puppy.id),
    // Lazy: only once the operator opens this puppy.
    enabled: !!session && expanded,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listPuppyMedia(session.token, puppy.id);
      if (!res.ok) throw new Error(res.error);
      return res.data.media;
    },
  });

  // The API already returns canonical order (primary, then sort_order), so the
  // lanes just partition it — no re-sorting that could drift from the DB.
  const publicLane = media.filter((m) => m.is_public);
  const stagedLane = media.filter((m) => !m.is_public);

  /** Merge the server's fresh puppy row back into the roster cache so counts
   *  and thumbnails update without a refetch. */
  function applyPuppy(row: BreederPuppyRow | null) {
    if (!row) return;
    queryClient.setQueryData<BreederPuppyWithLitter[]>(ALL_PUPPIES_QK, (prev) =>
      (prev ?? []).map((p) =>
        p.id === row.id
          ? { ...p, photos: row.photos, primary_photo: row.primary_photo, video_path: row.video_path }
          : p,
      ),
    );
  }

  function refreshMedia() {
    queryClient.invalidateQueries({ queryKey: MEDIA_QK(puppy.id) });
  }

  // Every single-media action funnels through here so busy state, error
  // toasts, and cache updates are identical across the sheet's buttons.
  const opMut = useMutation({
    mutationFn: async (
      run: (token: string) => Promise<
        | { ok: true; data: { puppy?: BreederPuppyRow | null } }
        | { ok: false; error: string }
      >,
    ) => {
      if (!session) throw new Error("Session expired. Sign in again.");
      const res = await run(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      applyPuppy(data.puppy ?? null);
      refreshMedia();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const busy = opMut.isPending || progress !== null;

  // ---------------------------------------------------------------------
  // Add — the batch-dump flow. Always lands in staging.
  // ---------------------------------------------------------------------
  async function handleAddFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!session) {
      toast.error("Session expired. Sign in again.");
      return;
    }
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    let failures = 0;

    // Sequential rather than parallel: phone uploads on LTE, and one failure
    // shouldn't take the rest of the batch down with it.
    for (let i = 0; i < list.length; i++) {
      const file = list[i]!;
      try {
        if (VIDEO_MIME.test(file.type)) {
          const res = await uploadBreederVideo({
            token: session.token,
            file,
            subjectId: puppy.id,
            record: true,
            isPublic: false,
          });
          if (!res.ok) failures++;
        } else {
          const compressed = await compressPhoto(file);
          const res = await uploadBreederPhoto({
            token: session.token,
            file: compressed,
            kind: "puppy",
            subjectId: puppy.id,
            record: true,
            mediaKind: "candid",
            isPublic: false,
          });
          if (!res.ok) failures++;
        }
      } catch {
        failures++;
      }
      setProgress({ done: i + 1, total: list.length });
    }

    setProgress(null);
    refreshMedia();
    const added = list.length - failures;
    if (failures > 0) {
      toast.warning(`Added ${added} of ${list.length} — ${failures} failed to upload.`);
    } else {
      toast.success(
        `Added ${added} to staging. Tap to publish when you're happy with them.`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Sheet actions
  // ---------------------------------------------------------------------
  function closeSheet() {
    setSheetMedia(null);
  }

  function handleSetPublic(m: PuppyMediaRow, isPublic: boolean) {
    closeSheet();
    opMut.mutate((token) =>
      setPuppyMediaVisibility(token, { puppyId: puppy.id, mediaIds: [m.id], isPublic }),
    );
  }

  function handleSetPrimary(m: PuppyMediaRow) {
    closeSheet();
    opMut.mutate((token) => setPuppyMediaPrimary(token, m.id));
  }

  function handleSetKind(m: PuppyMediaRow, kind: PuppyMediaKind) {
    opMut.mutate((token) => updatePuppyMedia(token, m.id, { kind }));
    // Keep the sheet open — labelling is often several taps in a row — but
    // reflect the new kind immediately so the chips don't look unresponsive.
    setSheetMedia({ ...m, kind });
  }

  function handleMove(m: PuppyMediaRow, direction: -1 | 1) {
    closeSheet();
    const full = buildReorderIds(publicLane, stagedLane, m.id, direction);
    if (!full) return;
    opMut.mutate((token) => reorderPuppyMedia(token, puppy.id, full));
  }

  function handleReplace(m: PuppyMediaRow, file: File) {
    closeSheet();
    opMut.mutate(async (token) => {
      const isVideo = VIDEO_MIME.test(file.type);
      const uploaded = isVideo
        ? await uploadBreederVideo({ token, file, subjectId: puppy.id })
        : await uploadBreederPhoto({
            token,
            file: await compressPhoto(file),
            kind: "puppy",
            subjectId: puppy.id,
          });
      if (!uploaded.ok) return uploaded;
      return replacePuppyMedia(token, m.id, uploaded.data.publicUrl);
    });
  }

  function handleDelete(m: PuppyMediaRow) {
    closeSheet();
    opMut.mutate((token) => deletePuppyMedia(token, m.id));
  }

  function handleEdit(m: PuppyMediaRow) {
    closeSheet();
    setEditMedia(m);
  }

  // ---------------------------------------------------------------------
  // Bulk publish
  // ---------------------------------------------------------------------
  function toggleSelect(m: PuppyMediaRow) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }

  function publishSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setSelecting(false);
    setSelected(new Set());
    opMut.mutate((token) =>
      setPuppyMediaVisibility(token, { puppyId: puppy.id, mediaIds: ids, isPublic: true }),
    );
  }

  const heroUrl = resolvePuppyPhotosPublicUrl(
    puppy.primary_photo ?? puppy.photos?.[0] ?? null,
  );
  const moveBounds = sheetMedia
    ? computeMoveBounds(publicLane, sheetMedia.id)
    : { canMoveEarlier: false, canMoveLater: false };

  return (
    <Card className="overflow-hidden">
      {/* ── Summary row ── */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
          {heroUrl && (
            <img src={heroUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{puppy.name || "(no name)"}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {expanded ? (
              isLoading ? (
                "Loading…"
              ) : (
                <>
                  {publicLane.length} on the site
                  {stagedLane.length > 0 && (
                    <span className="text-amber-600"> · {stagedLane.length} staged</span>
                  )}
                </>
              )
            ) : (
              `${puppy.photos?.length ?? 0} on the site`
            )}
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="space-y-4 border-t p-4">
          {isLoading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            </div>
          ) : (
            <>
              {/* ── Public lane ── */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  On the site ({publicLane.length})
                </h3>
                {publicLane.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
                    Nothing published yet — {puppy.name} won't show a photo on the
                    site.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {publicLane.map((m) => (
                      <MediaTile
                        key={m.id}
                        media={m}
                        busy={busy}
                        onOpen={setSheetMedia}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Staging lane ── */}
              {stagedLane.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Staging ({stagedLane.length})
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => {
                        setSelecting((s) => !s);
                        setSelected(new Set());
                      }}
                    >
                      {selecting ? "Cancel" : "Select"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {stagedLane.map((m) => (
                      <MediaTile
                        key={m.id}
                        media={m}
                        busy={busy}
                        onOpen={setSheetMedia}
                        selectable={selecting}
                        selected={selected.has(m.id)}
                        onToggleSelect={toggleSelect}
                      />
                    ))}
                  </div>
                  {selecting && (
                    <Button
                      className="mt-3 h-11 w-full"
                      disabled={busy || selected.size === 0}
                      onClick={publishSelected}
                    >
                      Publish {selected.size || ""} to the site
                    </Button>
                  )}
                </section>
              )}

              {/* ── Add ── */}
              <Button
                variant="outline"
                className="h-12 w-full gap-2"
                disabled={busy}
                onClick={() => addInputRef.current?.click()}
              >
                {progress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading {progress.done} / {progress.total}…
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" aria-hidden />
                    Add photos or video
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                New files go to staging first — nothing appears on the site until
                you publish it.
              </p>
            </>
          )}
        </div>
      )}

      {/* Multi-select, and no `capture` attribute, so the phone opens the photo
          library rather than jumping straight to the camera. */}
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          void handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <MediaActionSheet
        media={sheetMedia}
        open={sheetMedia !== null}
        onOpenChange={(o) => !o && closeSheet()}
        canMoveEarlier={moveBounds.canMoveEarlier}
        canMoveLater={moveBounds.canMoveLater}
        busy={busy}
        onSetPublic={handleSetPublic}
        onSetPrimary={handleSetPrimary}
        onSetKind={handleSetKind}
        onMove={handleMove}
        onReplace={handleReplace}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      {/* Keyed on the target photo so every open starts a fresh editing
          session — see the contract documented on MediaEditSheet itself. */}
      <MediaEditSheet
        key={editMedia?.id ?? "closed"}
        media={editMedia}
        open={editMedia !== null}
        onOpenChange={(o) => !o && setEditMedia(null)}
        onSaved={refreshMedia}
      />
    </Card>
  );
}
