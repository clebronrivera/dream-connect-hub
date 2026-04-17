// Brand constants for all transactional emails.
// Red primary matches src/index.css --primary (hsl(0 72% 51%)).
// DBA: "Dream Puppies" (Build Rule #11). Descriptor: "hobby breeding program" (Build Rule #12).

export const BRAND = {
  name: "Dream Puppies",
  descriptor: "hobby breeding program",
  phone: "(321) 697-8864",
  email: "Dreampuppies22@gmail.com",
  locations: "Orlando, FL · Raeford, NC",
  website: "https://puppyheavenllc.com",
} as const;

// Palette — hex equivalents of the web app HSL tokens in src/index.css
export const COLORS = {
  primary: "#E94B3C", // hsl(0 72% 51%)
  primaryDark: "#C0392B",
  destructive: "#EF4444",
  foreground: "#1A1A1A",
  muted: "#6B7280",
  border: "#E8E3E3",
  bgTint: "#FDF5F4", // very-light-red page background
  bgCard: "#FFFFFF",
  calloutBg: "#FFF8E1",
  calloutBorder: "#F59E0B",
} as const;

export const FONT_STACK =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Paw logo inlined so it renders without an external image fetch
// (matches public/favicon.svg, rendered at 40px for email headers).
export const PAW_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 32 32" aria-label="${BRAND.name}"><g fill="#FFFFFF"><ellipse cx="16" cy="21" rx="7" ry="6"/><circle cx="8" cy="12" r="3"/><circle cx="14" cy="7" r="3"/><circle cx="20" cy="7" r="3"/><circle cx="24" cy="12" r="3"/></g></svg>`;
