import { describe, expect, it } from "vitest";
import {
  buildReorderIds,
  computeMoveBounds,
  selectSlotMedia,
  selectVideoMedia,
} from "@/lib/breeder/mediaSlots";
import type { PuppyMediaRow } from "@/lib/breeder/api";

function row(over: Partial<PuppyMediaRow> & { id: string }): PuppyMediaRow {
  return {
    puppy_id: "p1",
    media_type: "photo",
    kind: "candid",
    url: `https://example.test/${over.id}.jpg`,
    storage_bucket: "puppy-photos",
    storage_path: `breeder/puppy/p1/${over.id}.jpg`,
    is_public: true,
    is_primary: false,
    sort_order: 0,
    derived_from_media_id: null,
    edit_ops: null,
    width: null,
    height: null,
    captured_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("selectSlotMedia", () => {
  it("returns null when the puppy has no photo of that kind", () => {
    const media = [row({ id: "a", kind: "back" })];
    expect(selectSlotMedia(media, "face")).toBeNull();
  });

  it("matches on kind, not on array position", () => {
    // The regression this whole table exists for: the face shot is third.
    const media = [
      row({ id: "a", kind: "candid" }),
      row({ id: "b", kind: "paw" }),
      row({ id: "c", kind: "face" }),
    ];
    expect(selectSlotMedia(media, "face")?.id).toBe("c");
  });

  it("prefers the primary when several photos share a kind", () => {
    const media = [
      row({ id: "a", kind: "face", sort_order: 0 }),
      row({ id: "b", kind: "face", sort_order: 5, is_primary: true }),
    ];
    expect(selectSlotMedia(media, "face")?.id).toBe("b");
  });

  it("prefers a published photo over a staged one", () => {
    const media = [
      row({ id: "staged", kind: "top", is_public: false, sort_order: 0 }),
      row({ id: "live", kind: "top", is_public: true, sort_order: 9 }),
    ];
    expect(selectSlotMedia(media, "top")?.id).toBe("live");
  });

  it("falls back to sort_order, then created_at, for a stable pick", () => {
    const media = [
      row({ id: "later", kind: "paw", sort_order: 2 }),
      row({ id: "earlier", kind: "paw", sort_order: 1 }),
    ];
    expect(selectSlotMedia(media, "paw")?.id).toBe("earlier");

    const tied = [
      row({ id: "newer", kind: "paw", sort_order: 1, created_at: "2026-02-01T00:00:00.000Z" }),
      row({ id: "older", kind: "paw", sort_order: 1, created_at: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(selectSlotMedia(tied, "paw")?.id).toBe("older");
  });

  it("never returns a video for a photo slot", () => {
    const media = [row({ id: "v", media_type: "video", kind: "video" })];
    expect(selectSlotMedia(media, "face")).toBeNull();
  });
});

describe("selectVideoMedia", () => {
  it("returns null when there is no video", () => {
    expect(selectVideoMedia([row({ id: "a" })])).toBeNull();
  });

  it("prefers the published video, since only that one projects to the puppy", () => {
    const media = [
      row({ id: "staged", media_type: "video", kind: "video", is_public: false }),
      row({ id: "live", media_type: "video", kind: "video", is_public: true }),
    ];
    expect(selectVideoMedia(media)?.id).toBe("live");
  });
});

describe("computeMoveBounds", () => {
  const lane = [
    row({ id: "p", is_primary: true, sort_order: 0 }),
    row({ id: "b", sort_order: 1 }),
    row({ id: "c", sort_order: 2 }),
  ];

  it("pins the main photo — it can never move", () => {
    expect(computeMoveBounds(lane, "p")).toEqual({
      canMoveEarlier: false,
      canMoveLater: false,
    });
  });

  it("stops anything from moving above the main photo", () => {
    // 'b' sits directly after the primary, so "Earlier" would be a no-op:
    // the projection sorts is_primary first regardless of sort_order.
    expect(computeMoveBounds(lane, "b")).toEqual({
      canMoveEarlier: false,
      canMoveLater: true,
    });
  });

  it("allows movement below the pinned primary", () => {
    expect(computeMoveBounds(lane, "c")).toEqual({
      canMoveEarlier: true,
      canMoveLater: false,
    });
  });

  it("uses index 0 as the floor when there is no primary", () => {
    const noPrimary = [row({ id: "a" }), row({ id: "b" })];
    expect(computeMoveBounds(noPrimary, "a")).toEqual({
      canMoveEarlier: false,
      canMoveLater: true,
    });
    expect(computeMoveBounds(noPrimary, "b")).toEqual({
      canMoveEarlier: true,
      canMoveLater: false,
    });
  });

  it("returns false/false for an id that isn't in the lane", () => {
    expect(computeMoveBounds(lane, "missing")).toEqual({
      canMoveEarlier: false,
      canMoveLater: false,
    });
  });
});

describe("buildReorderIds", () => {
  const publicLane = [
    row({ id: "p", is_primary: true }),
    row({ id: "b" }),
    row({ id: "c" }),
  ];
  const staged = [row({ id: "s1", is_public: false })];

  it("swaps the pair and appends staged rows so sort_order stays dense", () => {
    expect(buildReorderIds(publicLane, staged, "c", -1)).toEqual(["p", "c", "b", "s1"]);
  });

  it("moves later", () => {
    expect(buildReorderIds(publicLane, staged, "b", 1)).toEqual(["p", "c", "b", "s1"]);
  });

  it("refuses illegal moves rather than sending a pointless round trip", () => {
    expect(buildReorderIds(publicLane, staged, "p", 1)).toBeNull();
    expect(buildReorderIds(publicLane, staged, "b", -1)).toBeNull();
    expect(buildReorderIds(publicLane, staged, "c", 1)).toBeNull();
    expect(buildReorderIds(publicLane, staged, "missing", 1)).toBeNull();
  });
});
