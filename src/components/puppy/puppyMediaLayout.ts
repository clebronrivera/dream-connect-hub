// Shared grid geometry for puppy photo presentations.
//
// Both PuppyMediaCollage (interactive lightbox in the detail modal) and
// PuppyMediaThumbs (non-interactive preview on the puppy card) follow the
// same 1 / 2 / 3 / 4-tile heuristic so the two surfaces don't drift.

export function puppyMediaLayoutClass(count: number): string {
  if (count === 1) return "grid grid-cols-1 gap-2 aspect-square";
  // 2-photo case fills the square as two tall halves so two-photo puppies
  // don't read as a wide orphan band next to four-photo neighbors.
  if (count === 2) return "grid grid-cols-2 gap-2 aspect-square";
  // 3 and 4 share the 2-col layout; tile-level row-span gives 3 the
  // "1 large + 2 stacked" arrangement.
  return "grid grid-cols-2 gap-2 aspect-square";
}

export function puppyMediaTileClass(count: number, index: number): string {
  if (count <= 2) return "";
  if (count === 3) {
    if (index === 0) return "row-span-2";
    return "";
  }
  return "";
}
