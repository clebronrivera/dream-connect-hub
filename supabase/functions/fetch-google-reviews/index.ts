// Supabase Edge Function: fetch-google-reviews
//
// Returns the public Google rating + review count + up to 5 reviews for the
// Dream Puppies business listing, sourced from the Google Places API (New).
//
// The Google API key is held server-side (never exposed to the browser). The
// result is cached in public.google_reviews_cache (single row) and refreshed at
// most once per CACHE_TTL_MS window. If a refresh fails but a cached copy
// exists, the cached copy is served (graceful degradation). The browser calls
// this function with the anon key (a valid JWT), so default JWT verification
// passes.
//
// Required secrets (Supabase Edge Function secrets):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - GOOGLE_PLACES_API_KEY        (your Google Cloud API key, Places API (New) enabled)
// Optional secrets:
//   - GOOGLE_PLACES_PLACE_ID       (skip name-search if you know the exact place id)
//   - GOOGLE_PLACES_TEXT_QUERY     (override the default name used to resolve the place)
//
// CORS allowlist comes from _shared/cors.ts.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";
const PLACE_ID_OVERRIDE = Deno.env.get("GOOGLE_PLACES_PLACE_ID") ?? "";
const TEXT_QUERY =
  Deno.env.get("GOOGLE_PLACES_TEXT_QUERY") ??
  "Dream Puppies Pet Store, Raeford, NC";

// Refresh from Google at most once per day. Google's policy allows caching
// place ids indefinitely and rating/review content for a limited window; daily
// is comfortably within norms and keeps the listing fresh.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const PLACES_BASE = "https://places.googleapis.com/v1";

interface NormalizedReview {
  authorName: string;
  authorPhotoUri: string | null;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string | null;
}

interface NormalizedPlace {
  placeId: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  googleMapsUri: string | null;
  reviews: NormalizedReview[];
}

interface CacheRow {
  place_id: string | null;
  rating: number | null;
  user_ratings_total: number | null;
  google_maps_uri: string | null;
  reviews: NormalizedReview[];
  fetched_at: string;
}

function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Resolve the place id from a text query when no override is configured.
async function resolvePlaceId(query: string): Promise<string | null> {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) {
    console.error("Places searchText failed:", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    places?: { id?: string }[];
  };
  return data.places?.[0]?.id ?? null;
}

// Fetch place details (rating, count, reviews) for a known place id.
async function fetchPlaceDetails(placeId: string): Promise<NormalizedPlace> {
  const fieldMask = [
    "id",
    "rating",
    "userRatingCount",
    "googleMapsUri",
    "reviews.rating",
    "reviews.text",
    "reviews.relativePublishTimeDescription",
    "reviews.authorAttribution",
    "reviews.publishTime",
  ].join(",");

  const res = await fetch(
    `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": fieldMask,
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `Places details failed: ${res.status} ${await res.text()}`,
    );
  }

  const data = (await res.json()) as {
    id?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    reviews?: {
      rating?: number;
      text?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      authorAttribution?: {
        displayName?: string;
        uri?: string;
        photoUri?: string;
      };
    }[];
  };

  const reviews: NormalizedReview[] = (data.reviews ?? [])
    .map((r) => ({
      authorName: r.authorAttribution?.displayName?.trim() || "Google user",
      authorPhotoUri: r.authorAttribution?.photoUri ?? null,
      authorUri: r.authorAttribution?.uri ?? null,
      rating: typeof r.rating === "number" ? r.rating : 0,
      text: r.text?.text?.trim() ?? "",
      relativeTime: r.relativePublishTimeDescription?.trim() ?? "",
      publishTime: r.publishTime ?? null,
    }))
    .filter((r) => r.text.length > 0);

  return {
    placeId: data.id ?? placeId,
    rating: typeof data.rating === "number" ? data.rating : null,
    userRatingsTotal:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    googleMapsUri: data.googleMapsUri ?? null,
    reviews,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  // Read-only endpoint; allow GET and POST (functions.invoke uses POST).
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, cors);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Load the existing cache row (if any).
  const { data: cached } = await supabase
    .from("google_reviews_cache")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const cacheRow = cached as CacheRow | null;
  const isFresh =
    cacheRow &&
    Date.now() - new Date(cacheRow.fetched_at).getTime() < CACHE_TTL_MS;

  // 2. Serve fresh cache without touching Google.
  if (isFresh) {
    return jsonResponse(
      {
        rating: cacheRow!.rating,
        userRatingsTotal: cacheRow!.user_ratings_total,
        googleMapsUri: cacheRow!.google_maps_uri,
        reviews: cacheRow!.reviews ?? [],
        fetchedAt: cacheRow!.fetched_at,
        cached: true,
      },
      200,
      cors,
    );
  }

  // 3. Need a refresh. If the key is missing, fall back to stale cache.
  if (!GOOGLE_PLACES_API_KEY) {
    if (cacheRow) {
      return jsonResponse(
        {
          rating: cacheRow.rating,
          userRatingsTotal: cacheRow.user_ratings_total,
          googleMapsUri: cacheRow.google_maps_uri,
          reviews: cacheRow.reviews ?? [],
          fetchedAt: cacheRow.fetched_at,
          cached: true,
          stale: true,
        },
        200,
        cors,
      );
    }
    return jsonResponse(
      { error: "GOOGLE_PLACES_API_KEY not configured", reviews: [] },
      503,
      cors,
    );
  }

  // 4. Refresh from Google.
  try {
    const placeId =
      PLACE_ID_OVERRIDE ||
      cacheRow?.place_id ||
      (await resolvePlaceId(TEXT_QUERY));

    if (!placeId) {
      throw new Error("Could not resolve a Google Place ID");
    }

    const place = await fetchPlaceDetails(placeId);

    const { error: upsertError } = await supabase
      .from("google_reviews_cache")
      .upsert({
        id: 1,
        place_id: place.placeId,
        rating: place.rating,
        user_ratings_total: place.userRatingsTotal,
        google_maps_uri: place.googleMapsUri,
        reviews: place.reviews,
        fetched_at: new Date().toISOString(),
      });
    if (upsertError) {
      console.error("Failed to upsert reviews cache:", upsertError);
    }

    return jsonResponse(
      {
        rating: place.rating,
        userRatingsTotal: place.userRatingsTotal,
        googleMapsUri: place.googleMapsUri,
        reviews: place.reviews,
        fetchedAt: new Date().toISOString(),
        cached: false,
      },
      200,
      cors,
    );
  } catch (err) {
    console.error("fetch-google-reviews refresh failed:", err);
    // Serve stale cache rather than erroring the page, if we have one.
    if (cacheRow) {
      return jsonResponse(
        {
          rating: cacheRow.rating,
          userRatingsTotal: cacheRow.user_ratings_total,
          googleMapsUri: cacheRow.google_maps_uri,
          reviews: cacheRow.reviews ?? [],
          fetchedAt: cacheRow.fetched_at,
          cached: true,
          stale: true,
        },
        200,
        cors,
      );
    }
    return jsonResponse(
      { error: "Failed to fetch Google reviews", reviews: [] },
      502,
      cors,
    );
  }
});
