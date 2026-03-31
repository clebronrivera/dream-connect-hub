# Development Log

Chronological delivery notes for shipped development work.

## 2026-03-31

- Added repo-level health check script: `npm run health:check`.
- Fixed puppy inquiry consent handling to preserve tri-state values:
  - `true` (opt in), `false` (inquiry-only), `null` (unspecified).
- Updated Puppy Interest form UI copy from required (`*`) to optional wording for consent.
- Added development tracking workflow in `docs/DEVELOPMENT_TRACKING.md`.

