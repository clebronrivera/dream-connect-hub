// Locks the grid geometry shared between PuppyMediaCollage (interactive
// modal lightbox) and PuppyMediaThumbs (non-interactive card preview).
// If these classnames change, both surfaces drift visually — guard tests
// catch that.

import { describe, it, expect } from "vitest";
import {
  puppyMediaLayoutClass,
  puppyMediaTileClass,
} from "./puppyMediaLayout";

describe("puppyMediaLayoutClass", () => {
  it("uses a single full-square cell for one item", () => {
    expect(puppyMediaLayoutClass(1)).toBe(
      "grid grid-cols-1 gap-2 aspect-square",
    );
  });

  it("uses a 2-up square layout for two items so two-photo puppies fill the gallery as two tall halves", () => {
    expect(puppyMediaLayoutClass(2)).toBe(
      "grid grid-cols-2 gap-2 aspect-square",
    );
  });

  it("uses the same 2-col square for 3 and 4 items", () => {
    // 3 differs from 4 only in tile-level row-span — the grid container is
    // identical so the outer aspect ratio matches.
    expect(puppyMediaLayoutClass(3)).toBe(
      "grid grid-cols-2 gap-2 aspect-square",
    );
    expect(puppyMediaLayoutClass(4)).toBe(
      "grid grid-cols-2 gap-2 aspect-square",
    );
  });
});

describe("puppyMediaTileClass", () => {
  it("returns no extra class for 1 or 2 item layouts", () => {
    expect(puppyMediaTileClass(1, 0)).toBe("");
    expect(puppyMediaTileClass(2, 0)).toBe("");
    expect(puppyMediaTileClass(2, 1)).toBe("");
  });

  it("makes the first tile span both rows in a 3-up grid", () => {
    expect(puppyMediaTileClass(3, 0)).toBe("row-span-2");
    expect(puppyMediaTileClass(3, 1)).toBe("");
    expect(puppyMediaTileClass(3, 2)).toBe("");
  });

  it("uses no extra row-span in a 4-up grid", () => {
    expect(puppyMediaTileClass(4, 0)).toBe("");
    expect(puppyMediaTileClass(4, 1)).toBe("");
    expect(puppyMediaTileClass(4, 2)).toBe("");
    expect(puppyMediaTileClass(4, 3)).toBe("");
  });
});
