import "@testing-library/jest-dom";

// GitHub Actions has no .env.local; supabase-client throws if these are missing.
// Tests that import modules pulling in @/lib/supabase-client need placeholders.
if (!process.env.VITE_SUPABASE_URL?.trim()) {
  process.env.VITE_SUPABASE_URL = "https://test-project.supabase.co";
}
if (!process.env.VITE_SUPABASE_ANON_KEY?.trim()) {
  process.env.VITE_SUPABASE_ANON_KEY = "vitest-placeholder-anon-key";
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
