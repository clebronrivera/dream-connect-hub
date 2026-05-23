import type { Puppy } from '@/lib/supabase';
import {
  resolvePuppyPhotosPublicUrl,
  resolvePuppyVideoUrl,
} from '@/lib/puppy-photos';

export function getPuppyImage(puppy: Puppy): string | null {
  const raw = puppy.primary_photo || (puppy.photos?.length ? puppy.photos[0] : null);
  return resolvePuppyPhotosPublicUrl(raw);
}

/**
 * "Ready the week of {Sunday}" label. Puppies go home mid-week, so we surface
 * the Sunday that opens the ready week rather than an exact day — a ready_date
 * of Thu May 28 reads as "the week of May 24". Returns the formatted Sunday
 * (e.g. "May 24, 2026") or null for missing/invalid input.
 */
export function formatReadyWeekOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  // Parse a date-only string in local time so a UTC midnight doesn't roll the
  // day backward in negative-offset timezones.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Back up to the Sunday that opens this week (getDay: 0 = Sunday).
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Resolved, deduped media list for a puppy. primary_photo is folded into the
 * front of the photos array (legacy rows that only have primary_photo still
 * render). Both the public puppy card and the detail modal read from this so
 * they don't drift.
 */
export function getPuppyMediaList(puppy: Puppy): {
  photos: string[];
  videoUrl: string | null;
} {
  const all: (string | null | undefined)[] = [
    puppy.primary_photo,
    ...(puppy.photos ?? []),
  ];
  const resolved = all
    .map((p) => resolvePuppyPhotosPublicUrl(p))
    .filter((u): u is string => !!u);
  const photos = Array.from(new Set(resolved));
  const videoUrl = resolvePuppyVideoUrl(puppy.video_path);
  return { photos, videoUrl };
}

export function getDisplayPrice(puppy: Puppy): number | null {
  if (puppy.final_price) return puppy.final_price;
  if (puppy.base_price) return puppy.base_price;
  return null;
}

export function getSizeCategory(puppy: Puppy): 'small' | 'medium' | 'large' | null {
  const mom = puppy.mom_weight_approx ?? 0;
  const dad = puppy.dad_weight_approx ?? 0;
  const avg = mom && dad ? (mom + dad) / 2 : mom || dad;
  if (!avg) return null;
  if (avg < 15) return 'small';
  if (avg < 45) return 'medium';
  return 'large';
}

export function isPoodleOrDoodle(breed: string): boolean {
  const b = (breed || '').toLowerCase();
  return (
    b.includes('poodle') ||
    b.includes('doodle') ||
    b.includes('goldendoodle') ||
    b.includes('labradoodle')
  );
}

export function isSmallBreed(breed: string): boolean {
  const b = (breed || '').toLowerCase();
  return (
    b.includes('maltese') ||
    b.includes('chihuahua') ||
    b.includes('yorkshire') ||
    b.includes('toy') ||
    b.includes('mini') ||
    b.includes('shih tzu') ||
    b.includes('pomeranian') ||
    b.includes('papillon')
  );
}
