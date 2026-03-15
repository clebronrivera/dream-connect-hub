type RuntimeEnvSource = Partial<ImportMetaEnv> & {
  DEV?: boolean;
  MODE?: string;
};

const importMetaEnv = (import.meta.env ?? {}) as RuntimeEnvSource;

function readProcessEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

function readEnv(name: keyof ImportMetaEnv): string | undefined {
  const viteValue = importMetaEnv[name];
  if (typeof viteValue === "string" && viteValue.trim()) return viteValue;

  const processValue = readProcessEnv(name);
  return processValue?.trim() ? processValue : undefined;
}

function readFlag(name: "DEV"): boolean {
  if (typeof importMetaEnv[name] === "boolean") return Boolean(importMetaEnv[name]);

  const nodeEnv = readProcessEnv("NODE_ENV");
  return nodeEnv !== "production";
}

export const appEnv = {
  get supabaseUrl() {
    return readEnv("VITE_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return readEnv("VITE_SUPABASE_ANON_KEY");
  },
  get bannerImageUrl() {
    return readEnv("VITE_BANNER_IMAGE_URL");
  },
  get siteUrl() {
    return readEnv("VITE_SITE_URL");
  },
  get isDev() {
    return readFlag("DEV");
  },
};
