// getPuppyMediaList feeds both PuppyCard (mini-grid on /puppies) and
// PuppyDetailModal (full collage in the modal). If the dedup or ordering
// drifts between them, the card and the modal show different photos —
// these tests pin the contract.
//
// resolvePuppyPhotosPublicUrl + resolvePuppyVideoUrl pass full https://
// URLs through unchanged (see src/lib/puppy-photos.ts), so we use absolute
// URLs in the fixtures and skip mocking the supabase storage client.

import { describe, it, expect } from "vitest";
import { getPuppyMediaList, getPuppyImage } from "./puppy-display-utils";
import type { Puppy } from "./supabase";

function p(overrides: Partial<Puppy> = {}): Puppy {
  return {
    id: "p1",
    name: "Buddy",
    breed: "Goldendoodle",
    primary_photo: null,
    photos: null,
    video_path: null,
    ...overrides,
  } as Puppy;
}

const FACE = "https://cdn.example.com/face.jpg";
const BACK = "https://cdn.example.com/back.jpg";
const TOP = "https://cdn.example.com/top.jpg";
const PAW = "https://cdn.example.com/paw.jpg";
const VIDEO = "https://cdn.example.com/clip.mp4";

describe("getPuppyMediaList", () => {
  it("returns empty arrays when the puppy has no media", () => {
    expect(getPuppyMediaList(p())).toEqual({ photos: [], videoUrl: null });
  });

  it("returns just the primary photo when photos[] is empty", () => {
    expect(getPuppyMediaList(p({ primary_photo: FACE }))).toEqual({
      photos: [FACE],
      videoUrl: null,
    });
  });

  it("returns the photos[] array when primary_photo is null", () => {
    expect(getPuppyMediaList(p({ photos: [FACE, BACK, TOP] }))).toEqual({
      photos: [FACE, BACK, TOP],
      videoUrl: null,
    });
  });

  it("puts primary_photo first, then dedupes if it also appears in photos[]", () => {
    // The wizard typically writes primary_photo === photos[0]. The card and
    // modal must not show the same image twice.
    expect(
      getPuppyMediaList(p({ primary_photo: FACE, photos: [FACE, BACK, TOP, PAW] })),
    ).toEqual({ photos: [FACE, BACK, TOP, PAW], videoUrl: null });
  });

  it("preserves order when primary is disjoint from photos[]", () => {
    expect(
      getPuppyMediaList(p({ primary_photo: FACE, photos: [BACK, TOP] })),
    ).toEqual({ photos: [FACE, BACK, TOP], videoUrl: null });
  });

  it("includes the resolved video url when video_path is set", () => {
    expect(getPuppyMediaList(p({ primary_photo: FACE, video_path: VIDEO }))).toEqual({
      photos: [FACE],
      videoUrl: VIDEO,
    });
  });

  it("filters out null-ish entries inside photos[]", () => {
    // Defensive: legacy rows have surfaced empty / null entries before.
    const photos = [FACE, "", null as unknown as string, BACK];
    expect(getPuppyMediaList(p({ photos }))).toEqual({
      photos: [FACE, BACK],
      videoUrl: null,
    });
  });
});

describe("getPuppyImage (legacy single-photo helper)", () => {
  it("falls back to photos[0] when primary_photo is missing", () => {
    expect(getPuppyImage(p({ photos: [FACE, BACK] }))).toBe(FACE);
  });

  it("prefers primary_photo over photos[]", () => {
    expect(getPuppyImage(p({ primary_photo: FACE, photos: [BACK] }))).toBe(FACE);
  });

  it("returns null when neither field is set", () => {
    expect(getPuppyImage(p())).toBeNull();
  });
});
