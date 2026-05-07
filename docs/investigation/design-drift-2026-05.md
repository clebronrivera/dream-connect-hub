# Design-drift investigation — May 2026

**Date:** 2026-05-06  
**Scope:** All commits from `f045a10` (Wave A start) to `6a003d1` (H8 v2) that touched style-significant files; identification of unreachable design work; catalog of off-system color usage in Wave components.  
**Output of:** Steps A + B of the design-drift investigation block.  
**Status:** Read-only investigation — no files modified.

---

## Step A — Commits since `f045a10` touching style files

### Files checked
- `src/index.css`
- `tailwind.config.ts`
- `postcss.config.js`
- `vite.config.ts`

### Result: zero commits

```
$ git log --oneline f045a10..HEAD -- src/index.css tailwind.config.ts postcss.config.js vite.config.ts
(empty)
```

**The design token files have not changed since the May 3 redesign (`801f4ad`), which predates `f045a10` by three commits.** Every Wave A–H commit worked on top of a frozen token system.

### UI surface changed per Wave commit (style-adjacent summary)

| Commit | Wave | New surface | Style method |
|---|---|---|---|
| `4a1b217` | A2 | Flat $300 deposit display in DepositSummary | System tokens (`bg-muted`, `text-foreground`) |
| `9f8a952` | B | Gate page added | System tokens |
| `a0370ef` | C | OperatorReviewForm | Partial drift — `bg-green-600 hover:bg-green-700` on one button |
| `801729d` | D2 | PaymentDashboard (new page) | **Heavy drift** — 25 off-system color uses |
| `ce325a2` | H1c/d | Attestation flow on PaymentDashboard | **Heavy drift** — adds to existing 25 |
| `8b557bf` | H4 | PickupHandover (new page) | Moderate drift — `bg-green-100`, `border-green-300`, `text-red-700` |
| `45817f4` | H5 | AgreementCommunicationsCard | Moderate drift — `text-red-700`, `text-green-600`, `text-green-700` |
| `aa2cd29` | H5 | Manual-log form in AgreementDetailPanel | Minor drift — direction arrow icons use `text-green-700`/`text-blue-600` |
| `285c069` + `6a003d1` | H8 | DisputeEvidenceCard in AgreementDetailPanel | Minor drift — follows H5 pattern |

### Regression candidates (off-system color files, sorted by severity)

| Severity | File | Off-system count |
|---|---|---|
| 🔴 High | `src/pages/PaymentDashboard.tsx` | 25 |
| 🟡 Medium | `src/pages/admin/AgreementDetailPanel.tsx` | 16 |
| 🟡 Medium | `src/components/admin/DepositRequestDetailPanel.tsx` | 13 |
| 🟡 Medium | `src/components/admin/OperatorReviewForm.tsx` | 7 |
| 🟠 Low | `src/pages/DepositAgreement.tsx` | 4 |
| 🟠 Low | `src/pages/admin/PickupHandover.tsx` | 3 |
| 🟠 Low | `src/components/admin/AgreementCommunicationsCard.tsx` | 3 |

Off-system color patterns found:

| Tailwind class used | Design-system equivalent | Semantic meaning |
|---|---|---|
| `bg-emerald-50`, `border-emerald-200`, `text-emerald-{600,700,900}` | `bg-leaf/10`, `border-leaf/30`, `text-leaf` | Success / payment confirmed |
| `bg-green-100`, `text-green-{600,700,800}`, `border-green-300` | `bg-leaf/15`, `text-leaf`, `border-leaf/30` | Status badge / action done |
| `bg-blue-50`, `border-blue-200`, `text-blue-{800,900}` | `bg-primary/10`, `border-primary/20`, `text-ink` | Info / next-step callout |
| `bg-blue-600 hover:bg-blue-700` | `bg-primaryDeep hover:bg-primary` + `shadow-sticker` | Primary action button |
| `bg-amber-{50,100}`, `border-amber-{200,300}`, `text-amber-{700,800,900}` | `bg-sun/15`, `border-sun/30`, `text-ink` | Warning / mismatch flag |
| `text-red-700` | `text-destructive` | Error / load failure |

---

## Step B — Correct design state before `f045a10`

### The token system (frozen, correct)

Last modified: `801f4ad` (May 3 redesign). Still exactly as shipped. See `docs/spec/design-system.md` for the full canonical reference.

### The orphaned galactic branch

A parallel design pass was committed on 2026-05-05 to a **local branch that was never pushed or merged**:

```
Commit:  42c0f27  feat: unify galactic styling across public pages
Branch:  feat/puppies-hero-color-scheme  (local only — not on origin)
Author:  clebronrivera (co-authored by Cursor)
Date:    Tue 2026-05-05 06:09 EDT
Based:   3954f6e  (on main, ~2 commits before f045a10)
Files:   18 files, +864 / −424 lines
```

This commit re-skins every public page to match the dark "galactic" home-page shell. While it sat dormant, Waves A–H added 27 commits to main. The branch has **zero overlap with any deposit/agreement/payment/admin file** (verified by `git diff --name-only 3954f6e 42c0f27 | grep -iE "deposit|payment|agreement|attestation|handover"` → empty).

The recovery agent left a complete handoff at `docs/design-recovery/HANDOFF.md` including:
- Proof of zero file overlap with Wave work
- The two real merge conflicts in `App.tsx` (additive, safe) and `UpcomingLitterForm.tsx` (identical change)
- A ready-to-run cherry-pick command
- A live worktree at `.claude/worktrees/galactic-mockup/` for preview

### Pages affected by the orphaned branch

| Page | Path | Change |
|---|---|---|
| Available puppies | `/puppies` | Dark hero; pink/violet CTAs; filter pills re-skinned |
| Upcoming litters | `/upcoming-litters` | Dark hero; litter cards on `bg-[#12051f]/90` |
| Training plan | `/training-plan` | Dark hero; light form surfaces for readability |
| Dreamy reviews | `/dreamy-reviews` | Dark hero; single violet CTA |
| FAQ | `/faq` | Dark hero; pink active state on topic tabs |
| Contact | `/contact` | Dark hero; two info cards + form on dark surface |
| `PuppyCard.tsx` | used on `/puppies` | Chrome update — colored corners + badges |
| `Footer.tsx` | all public | Logo swap, copy tweak |
| `Layout.tsx` | all non-bare | `<Footer>` → `<GalacticHomeMiniFooter>` |

### Pages NOT in the branch (follow-up needed after cherry-pick)

`Breeds.tsx`, `Consultation.tsx`, `Essentials.tsx` — still use `<Layout>` (non-bare). After the cherry-pick swaps `Layout.tsx`'s footer, they'll have old light hero sandwiched between new nav and new footer. Not broken, but visually inconsistent. Small follow-up.

### Diff summary: token-system vs galactic extension

The galactic branch hardcodes new dark values rather than mapping them to existing tokens. The token system defines `--bg: #1A1438`; the galactic pages use `#0f041b` (deeper/darker). The two systems coexist: token-system variables remain unchanged; galactic pages opt into the darker shell via hardcoded `bg-[#0f041b]` and the gradient classes.

No conflict. The token values are not wrong — they're just not used by the galactic shell's hero and nav. The token system remains the source of truth for admin/form components.
