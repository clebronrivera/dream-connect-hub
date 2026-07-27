// Visual-review-only preview of the new media manager (Stage 1) + edit sheet
// (Stage 2), rendered with a mocked auth session and a pre-seeded query
// cache — so it can be screenshotted without a breeder passcode and without
// any network traffic to the real edge functions.
//
// Real component, fake data: this renders the actual PuppyMediaManagerCard,
// not a redrawn approximation. If an action button IS clicked, it hits the
// real breeder-write function with a bogus token, which verifyBreederToken
// rejects — so nothing in the real database can be touched from here.
//
// Dev-only: not reachable in a production build (see the `import.meta.env.DEV`
// guard around this route in App.tsx), not linked from any nav.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PuppyMediaManagerCard } from "@/components/breeder/PuppyMediaManagerCard";
import { BreederAuthContext } from "@/contexts/BreederAuthContext";
import type { BreederPuppyWithLitter, PuppyMediaRow } from "@/lib/breeder/api";

const PUPPY_ID = "mock-puppy-1";

// Real, already-public storage URLs (Maggie's own page) so the tiles show
// actual photos instead of broken-image icons.
const REAL_URLS = [
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/6b6d7f30-8c7e-499a-a8a4-90af400a67e1.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/0966dd39-f721-4f42-b443-0c830a6ba439.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/ab776f6e-5001-4521-842f-4b1b9a58e04b.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/e704ea8d-ce54-47ab-abb5-bf9a03d4f05e.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/49f8d624-c6bd-43e7-8ba5-7ef42ee72ad6.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/58b7ab51-b6d3-49bb-8fdc-692004fef139.jpg",
  "https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/breeder/puppy/521f1fff-b951-42ec-9082-ea50e323d9f6/d3d1a3f9-0fb1-4d0e-ad3e-27894fe7712a.jpg",
];

function mockMediaRow(over: Partial<PuppyMediaRow> & { id: string; url: string }): PuppyMediaRow {
  return {
    puppy_id: PUPPY_ID,
    media_type: "photo",
    kind: "candid",
    storage_bucket: "puppy-photos",
    storage_path: null,
    is_public: true,
    is_primary: false,
    sort_order: 0,
    derived_from_media_id: null,
    edit_ops: null,
    width: null,
    height: null,
    captured_at: null,
    created_at: "2026-07-20T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    ...over,
  };
}

const MOCK_PUPPY: BreederPuppyWithLitter = {
  id: PUPPY_ID,
  name: "Nova (preview)",
  gender: "Female",
  breed: "Goldendoodle",
  color: "Apricot",
  date_of_birth: "2026-05-10",
  photos: REAL_URLS.slice(0, 4),
  primary_photo: REAL_URLS[0],
  video_path: null,
  description: "Preview data — not a real puppy record.",
  ready_date: "2026-07-05",
  base_price: 2200,
  status: "Available",
  is_publicly_visible: true,
  vaccinated_at: null,
  generation: "F1b",
  personality_blurb: "The cuddly one who falls asleep mid-play.",
  upcoming_litter_id: null,
  litter_id: null,
  dam_name: "Luna",
  sire_name: "Bruno",
};

const MOCK_MEDIA: PuppyMediaRow[] = [
  mockMediaRow({ id: "m1", url: REAL_URLS[0], kind: "face", is_primary: true, sort_order: 0 }),
  mockMediaRow({ id: "m2", url: REAL_URLS[1], kind: "back", sort_order: 1 }),
  mockMediaRow({ id: "m3", url: REAL_URLS[2], kind: "top", sort_order: 2 }),
  mockMediaRow({ id: "m4", url: REAL_URLS[3], kind: "paw", sort_order: 3 }),
  // A background-removed variant, derived from the face shot, still staged.
  mockMediaRow({
    id: "m5",
    url: REAL_URLS[4],
    kind: "face",
    is_public: false,
    sort_order: 0,
    derived_from_media_id: "m1",
    edit_ops: [{ op: "background-removal", backdrop: "white" }],
  }),
  // Two fresh staged additions, as if just batch-uploaded from the library.
  mockMediaRow({ id: "m6", url: REAL_URLS[5], kind: "candid", is_public: false, sort_order: 1 }),
  mockMediaRow({ id: "m7", url: REAL_URLS[6], kind: "candid", is_public: false, sort_order: 2 }),
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
queryClient.setQueryData(["breeder", "allPuppies"], [MOCK_PUPPY]);
queryClient.setQueryData(["breeder", "puppyMedia", PUPPY_ID], MOCK_MEDIA);

const MOCK_AUTH = {
  session: { token: "preview-only-invalid-token", expiresAt: "2099-01-01T00:00:00.000Z" },
  loading: false,
  signIn: async () => ({ ok: true as const }),
  signOut: () => {},
};

export default function BreederMediaManagerMockup() {
  return (
    <QueryClientProvider client={queryClient}>
      <BreederAuthContext.Provider value={MOCK_AUTH}>
        <div className="mx-auto max-w-screen-sm space-y-4 bg-muted/20 px-4 py-8">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            Design preview only — mocked data, no real puppy or network calls.
            Not reachable in production.
          </div>
          <PuppyMediaManagerCard
            puppy={MOCK_PUPPY}
            expanded
            onToggle={() => {}}
            subtitle="Female · Goldendoodle · Luna × Bruno"
          />
        </div>
      </BreederAuthContext.Provider>
    </QueryClientProvider>
  );
}
