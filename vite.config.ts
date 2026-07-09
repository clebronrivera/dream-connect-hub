import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle-group",
    ],
  },
  build: {
    // Warn loudly if a chunk creeps past this — the largest legit chunk today
    // (charts, admin-only) sits at ~394 KB pre-gzip.
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate, long-lived cacheable chunks
        // instead of one ~634 KB monolith. Vendors change rarely, so repeat
        // visitors keep them cached across app deploys, and the browser can
        // download the chunks in parallel. Route code is already split via
        // lazyWithRetry() in App.tsx; this only regroups node_modules code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // recharts + its d3 deps — only used by the admin Dashboard, but
          // pin it to its own chunk so it can never leak into the entry.
          if (
            id.includes("recharts") ||
            id.includes("/d3-") ||
            id.includes("victory-vendor")
          ) {
            return "charts";
          }
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("/zod/")
          ) {
            return "forms";
          }
          if (id.includes("@tanstack")) return "query";
          // Core React runtime + router. Checked last so the more specific
          // react-* libraries above (react-hook-form) match first.
          if (
            id.includes("/react-router") ||
            id.includes("/react-dom/") ||
            id.includes("/react/") ||
            id.includes("/scheduler/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
}));
