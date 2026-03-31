# Development Tracking Workflow

This document defines the default workflow for tracking code changes in Puppy Heaven.

## Goals

- Keep GitHub and local development in sync.
- Keep a clear written history of why changes were made.
- Ensure every shipped change passes a health check.

## Required process for every code change

1. Create or switch to the intended branch.
2. Make code changes.
3. Run the health check:
   - `npm run health:check`
4. Update tracking docs:
   - Add an entry to `CHANGELOG.md` under the newest date.
   - Add a short delivery note to `docs/DEVELOPMENT_LOG.md`.
5. Commit with a clear message explaining intent.
6. Push to GitHub.

## Fast path (recommended)

Use one command to do the full workflow:

- `npm run ship -- "your commit message"`

This command will:

- run `npm run health:check`
- append a delivery note to `docs/DEVELOPMENT_LOG.md`
- stage all changes
- commit with your message
- push current branch to `origin`

Optional bypass (for emergency or docs-only changes):

- `npm run ship:skip-health -- "your commit message"`

## Commit message guideline

Use this format:

- First line: concise action and outcome.
- Body: why this change was needed and what behavior it protects.

Example:

`Fix consent handling to preserve unspecified preference.`

## Minimum tracking checklist before push

- [ ] `npm run health:check` passes
- [ ] `CHANGELOG.md` updated
- [ ] `docs/DEVELOPMENT_LOG.md` updated
- [ ] Commit created
- [ ] Branch pushed to GitHub

