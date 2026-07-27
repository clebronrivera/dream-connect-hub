// Pure helpers for reading puppy_media by meaning rather than by position.
//
// Before puppy_media, the capture wizard derived its four photo slots from
// array indices — photos[0] was "the face shot" purely by convention. That
// convention broke the moment anything appended a fifth photo, and live data
// had several puppies in exactly that state. These helpers replace the
// convention with the `kind` column.
//
// Kept free of React and network calls so the selection rules can be tested
// directly.

import type { PuppyMediaKind, PuppyMediaRow } from "@/lib/breeder/api";

/** The four structured angles the capture wizard walks through, in order. */
export type PhotoSlot = "face" | "back" | "top" | "paw";

/**
 * The media row that should fill a given capture-wizard slot.
 *
 * Preference order within a kind:
 *   1. the primary (only ever relevant for `face`)
 *   2. published before staged — the wizard is showing what the site shows
 *   3. lowest sort_order, then oldest, for a stable pick
 *
 * Returns null when the puppy has no photo of that kind yet, which is what
 * makes the slot render as an empty capture target.
 */
export function selectSlotMedia(
  media: PuppyMediaRow[],
  slot: PhotoSlot,
): PuppyMediaRow | null {
  const candidates = media.filter((m) => m.media_type === "photo" && m.kind === slot);
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    if (a.is_public !== b.is_public) return a.is_public ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
  return ranked[0] ?? null;
}

/** The video shown in the wizard's video step — the public one if there is
 *  one, since puppies.video_path only ever projects a public row. */
export function selectVideoMedia(media: PuppyMediaRow[]): PuppyMediaRow | null {
  const videos = media.filter((m) => m.media_type === "video");
  if (videos.length === 0) return null;
  const ranked = [...videos].sort((a, b) => {
    if (a.is_public !== b.is_public) return a.is_public ? -1 : 1;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at.localeCompare(b.created_at);
  });
  return ranked[0] ?? null;
}

/**
 * Which directions a photo may move within the public lane.
 *
 * The projection orders public photos `is_primary DESC, sort_order`, so the
 * main photo is pinned to the front no matter what sort_order says. Two rules
 * fall out of that, and both need enforcing in the UI or the operator taps a
 * button that silently does nothing:
 *   - the main photo itself never moves
 *   - nothing can move above the main photo
 */
export function computeMoveBounds(
  publicLane: PuppyMediaRow[],
  mediaId: string,
): { canMoveEarlier: boolean; canMoveLater: boolean } {
  const index = publicLane.findIndex((m) => m.id === mediaId);
  if (index < 0) return { canMoveEarlier: false, canMoveLater: false };
  if (publicLane[index]?.is_primary) return { canMoveEarlier: false, canMoveLater: false };

  const floor = publicLane[0]?.is_primary ? 1 : 0;
  return {
    canMoveEarlier: index > floor,
    canMoveLater: index < publicLane.length - 1,
  };
}

/**
 * The full id list to hand to reorderPuppyMedia after moving one item.
 *
 * Staged rows are appended so sort_order stays dense across the whole set —
 * leaving gaps invites collisions with the next upload, which takes
 * max(sort_order) + 1.
 *
 * Returns null when the move isn't legal, so callers can no-op rather than
 * send a pointless round trip.
 */
export function buildReorderIds(
  publicLane: PuppyMediaRow[],
  stagedLane: PuppyMediaRow[],
  mediaId: string,
  direction: -1 | 1,
): string[] | null {
  const bounds = computeMoveBounds(publicLane, mediaId);
  if (direction === -1 && !bounds.canMoveEarlier) return null;
  if (direction === 1 && !bounds.canMoveLater) return null;

  const ids = publicLane.map((m) => m.id);
  const from = ids.indexOf(mediaId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to]!, ids[from]!];

  return [...ids, ...stagedLane.map((m) => m.id)];
}

/** Human label for a kind, shared by the tile badge and the wizard header. */
export const KIND_LABEL: Record<PuppyMediaKind, string> = {
  face: "Face",
  back: "Back / profile",
  top: "Top-down",
  paw: "Paw print",
  candid: "Candid",
  video: "Video",
};
