# Audit Remediation — Wave Status

Tracking deploy + verification state for the security-audit waves currently in
flight. Update the **Deployed** and **Smoke-tested** columns as you complete
each step.

| Wave        | PR # | Description                                                              | Merged       | Deployed   | Smoke-tested | Status        |
|-------------|------|--------------------------------------------------------------------------|--------------|------------|--------------|---------------|
| 2.1 PR-A    | #44  | Gate two unauthenticated edge functions (`send-pending-reminders` requires `X-Cron-Secret`; `finalize-agreement` validates JWT + admin role) | 2026-04-25   |            |              | Merged, awaiting deploy |
| 2.2         | #46  | CORS allowlist for edge functions — replaces `*` wildcard with `puppyheavenllc.com`, `www.puppyheavenllc.com`, `localhost:8080` | 2026-04-25   |            |              | Merged, awaiting deploy |
| 2.3         | #48  | Retire dangerous one-shot scripts (no edge-function deploy required, but listed here for tracking) | 2026-04-25   |            |              | Merged; deploy = N/A (no runtime artifact); confirm script files are gone on `main` |

## Footer notes

- **Wave 2.1 PR-B — parked.** Not on the current deploy slate. Pick up after
  2.1 PR-A, 2.2, and 2.3 are verified in production.
- **Wave 2.6 — blocked on captcha vendor decision.** Cannot start
  implementation until vendor is selected. Track the decision separately and
  refresh this file when unblocked.
- **Reminder before re-enabling cron in Wave 2.1:** set `CRON_SECRET` in
  Supabase Edge Function secrets, configure the scheduler to send
  `X-Cron-Secret` with the same value, and trigger one manual test run before
  re-enabling the schedule.
