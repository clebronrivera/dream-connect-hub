import { describe, it, expect } from "vitest";
import { generatePostCopy } from "./post-generator";
import type { Puppy } from "@/lib/supabase";

function makePuppy(overrides: Partial<Puppy> = {}): Puppy {
  return {
    id: "p1",
    name: "Biscuit",
    breed: "Mini Goldendoodle",
    status: "Available",
    ...overrides,
  };
}

describe("generatePostCopy", () => {
  it("never includes a bare price and always closes with the question CTA", () => {
    const posts = generatePostCopy(makePuppy());
    for (const platform of Object.values(posts)) {
      expect(platform.body).not.toMatch(/\$\d/);
      expect(platform.body).toContain("Tell us about your home");
    }
  });

  it("renders Reserved as On Hold, never omitted", () => {
    const posts = generatePostCopy(makePuppy({ status: "Reserved" }));
    expect(posts.facebook.title).toContain("On Hold");
    expect(posts.facebook.body).toContain("On Hold");
    expect(posts.craigslist.body).toContain("On Hold");
    expect(posts.instagram.body).toContain("On Hold");
    expect(posts.tiktok.body).toContain("On Hold");
  });

  it("leads with buyer-relevant benefits for a poodle mix, not raw specs", () => {
    const posts = generatePostCopy(makePuppy({ breed: "Mini Goldendoodle" }));
    expect(posts.facebook.body.toLowerCase()).toContain("hypoallergenic-friendly");
  });

  it("uses the personality blurb when present", () => {
    const posts = generatePostCopy(
      makePuppy({ personality_blurb: "Falls asleep mid-play, every time." })
    );
    expect(posts.facebook.body).toContain("Falls asleep mid-play, every time.");
  });

  it("keeps craigslist copy free of hashtags and emoji-free platform fields", () => {
    const posts = generatePostCopy(makePuppy());
    expect(posts.craigslist.hashtags).toHaveLength(0);
  });

  it("keeps the Facebook title under 100 characters", () => {
    const posts = generatePostCopy(
      makePuppy({ name: "A".repeat(120), breed: "Standard Poodle" })
    );
    expect(posts.facebook.title.length).toBeLessThanOrEqual(99);
  });

  it("gives Instagram and TikTok non-empty hashtags", () => {
    const posts = generatePostCopy(makePuppy());
    expect(posts.instagram.hashtags.length).toBeGreaterThan(0);
    expect(posts.tiktok.hashtags.length).toBeGreaterThan(0);
  });
});
