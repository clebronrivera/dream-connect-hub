# Handoff — Galactic public-page design recovery

**Audience:** the agent currently shipping the deposit / contract / transaction system (Waves A → H).
**Author:** design-recovery investigation, 2026-05-06.
**Status:** investigated, plan approved, not yet executed. **Read this before merging anything more from your wave.**

---

## TL;DR

A redesign that unifies the public pages with the home-page galactic style was committed to a local branch on 2026-05-05 and **never merged to main**. While that branch sat dormant, you shipped Waves A → H on main. The two work streams are disjoint at the file level — the recovery cherry-pick will not touch any deposit/contract/transaction code — but you should know the recovery is coming so you can sequence it against any pending PR you have, and so you don't waste effort re-doing the visual unification yourself.

---

## What happened

| Fact | Value |
|---|---|
| Unification commit | `42c0f27 feat: unify galactic styling across public pages` |
| Author | clebronrivera (co-authored by Cursor) |
| Date | Tue 2026-05-05 06:09 EDT |
| Lives on branch | `feat/puppies-hero-color-scheme` (local only — never pushed to `origin`) |
| Based on | `3954f6e feat: simplify upcoming litters lifecycle and visibility flow` (in main) |
| Files changed | 18 files, +864 / −424 lines |
| Merge status | **Not merged. Not on main.** |

The branch was forgotten ~2.5 hours after creation; main pivoted to your deposit work and accumulated 27 commits without ever returning to the design branch. There is no commit on main that *reverted* the design — the work simply was never integrated.

---

## Safety guarantee for your wave

You can stop reading and trust the cherry-pick is orthogonal to your work, OR keep reading for the proof.

**Proof of zero overlap:**

```
$ git diff --name-only 3954f6e 42c0f27 | grep -iE "deposit|payment|agreement|attestation|handover|communication|finalize"
(empty)
```

The cherry-pick's 18 files are entirely public-facing pages, layout components, translations, and one new dev mockup page. Specifically:

```
public/dream-puppies-logo.png                         (new)
src/App.tsx                                           (1 import + 1 mockup route added)
src/components/home/GalacticHomeMiniFooter.tsx        (minor copy/link tweaks)
src/components/home/GalacticHomeNav.tsx               (minor copy/link tweaks)
src/components/layout/Footer.tsx                      (logo swap, copy tweak)
src/components/layout/Layout.tsx                      (Footer → GalacticHomeMiniFooter swap)
src/components/upcoming/UpcomingLittersSection.tsx    (re-skin)
src/i18n/translations.ts                              (hero-copy strings)
src/pages/Contact.tsx                                 (re-skin)
src/pages/DreamyReviews.tsx                           (re-skin)
src/pages/FaqPage.tsx                                 (re-skin)
src/pages/Index.tsx                                   (polish; already galactic)
src/pages/Puppies.tsx                                 (re-skin)
src/pages/PuppyCard.tsx                               (chrome update)
src/pages/TrainingPlanPage.tsx                        (re-skin)
src/pages/UpcomingLitters.tsx                         (re-skin)
src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx  (1-line dead-code drop — IDENTICAL on both sides)
src/pages/dev/UpcomingLittersV2Mockup.tsx             (new dev-only mockup, /__mockup/upcoming-v2)
```

**Proof your improvements are not at risk:** main has zero commits since the divergence point that touched ANY of those files (other than App.tsx and UpcomingLitterForm.tsx, see below):

```
$ for f in src/components/layout/Layout.tsx src/components/layout/Footer.tsx \
           src/components/home/GalacticHomeNav.tsx \
           src/components/home/GalacticHomeMiniFooter.tsx \
           src/i18n/translations.ts \
           src/pages/Index.tsx src/pages/Puppies.tsx src/pages/UpcomingLitters.tsx \
           src/pages/TrainingPlanPage.tsx src/pages/DreamyReviews.tsx \
           src/pages/FaqPage.tsx src/pages/Contact.tsx src/pages/PuppyCard.tsx \
           src/components/upcoming/UpcomingLittersSection.tsx; do
    echo "$f: $(git log --oneline 3954f6e..main -- "$f" | wc -l)"
done
# All zero.
```

So the cherry-pick is not at risk of overwriting an improvement you made — there is no improvement to overwrite. **Confirm this for yourself by re-running the loop above before merging anything new.**

**Proof your pages don't touch Layout:** the cherry-pick changes `Layout.tsx` to swap `<Footer>` for `<GalacticHomeMiniFooter>`. None of `DepositAgreement`, `RequestDeposit`, `PaymentDashboard`, `AgreementsPage`, `PickupHandover`, `DepositRequests` or any admin page imports `<Layout>` or `<Footer>` — they ship their own chrome:

```
$ grep -lE "Layout|Footer" src/pages/DepositAgreement.tsx src/pages/RequestDeposit.tsx \
                            src/pages/PaymentDashboard.tsx \
                            src/pages/admin/AgreementsPage.tsx \
                            src/pages/admin/PickupHandover.tsx \
                            src/pages/admin/DepositRequests.tsx
(empty)
```

So even the layout swap can't reach into your wave's pages.

---

## Two real conflict surfaces (both small, both safe)

### `src/App.tsx` — additive

Both sides added imports + routes in different sections of the file. Resolution: **keep all of yours, add both of theirs.**

- Lazy-import block (~line 38–50): keep your `PaymentDashboard` and `PickupHandover` imports. Add the cherry-pick's `UpcomingLittersV2Mockup` import.
- Public-routes block (~line 88–96): keep your `/payment/:agreementId/:buyerToken` route. The cherry-pick doesn't touch this region.
- `/__mockup/*` block (~line 96–98): add the cherry-pick's `<Route path="/__mockup/upcoming-v2" element={<UpcomingLittersV2Mockup />} />` next to the existing `/__mockup/hero-v3`.
- Admin-routes block (~line 123–130): keep your `pickup/:agreementId` route. The cherry-pick doesn't touch this region.

Net: +2 lines (one import, one route). All your existing routes remain.

### `src/pages/admin/upcoming-litters/UpcomingLitterForm.tsx` — identical change

Both sides removed the same line:

```
- const readyDate = getReadyDateFromDob(dob);
```

Git will detect the identical change and apply it cleanly — no manual resolution.

---

## The cherry-pick plan

```bash
# from the main repo, on main, working tree as clean as you can get it
git cherry-pick -x 42c0f27
# resolve src/App.tsx per the rules above
git add src/App.tsx
git cherry-pick --continue
```

The `-x` flag appends `(cherry picked from commit 42c0f27…)` to the new commit message — preserves provenance.

---

## What the design looks like (page-by-page)

The unified design language is a **galactic dark theme** with **neon pink accents**. Every public page picks up the same shell:

```tsx
<Layout bare>
  <div className="min-h-screen bg-[#0f041b] text-white">
    <GalacticHomeNav />
    <section
      className="relative overflow-hidden border-b border-white/10 py-14 text-white md:py-20"
      style={{ background: 'radial-gradient(circle at 50% 25%, #2a0f3a 0%, #1a0a2e 40%, #0f041b 80%)' }}
    >
      <GalacticPawCanvas className="absolute inset-0 z-0 opacity-80" />
      <div className="pointer-events-none absolute inset-0 z-10
                      bg-gradient-to-b from-[#0f041b]/60 via-transparent to-[#0f041b]/80" />
      <div className="relative z-20 mx-auto max-w-screen-2xl px-6 text-center md:px-8">
        <h1 className="mb-3 font-display text-4xl uppercase tracking-tight md:text-6xl">…</h1>
      </div>
    </section>
    {/* page body — dark surfaces, white/10 borders, glossy pink CTAs */}
    <GalacticHomeMiniFooter />
  </div>
</Layout>
```

Color palette:

| Token | Hex | Use |
|---|---|---|
| Page shell | `#0f041b` | Deep space navy — base bg of every page |
| Hero radial | `#2a0f3a → #1a0a2e → #0f041b` | Hero background gradient |
| Card surface | `bg-white/[0.06]`, `bg-[#12051f]/90` | Cards/panels on the dark shell |
| Card border | `border-white/10` to `border-white/15` | Subtle separators |
| Primary CTA (pink) | `#ff3399` | Glossy pink sticker buttons with `before:` highlight |
| Secondary CTA (purple) | `bg-violet-500` style | Outline + purple variants |
| Display font | Archivo, Inter Tight | Headings (`font-display`) |
| Body font | Inter Tight | Paragraphs |

Page-specific notes (from screenshots taken in the worktree):

| Page | Path | What you see |
|---|---|---|
| Home | `/` | Already galactic (this is the reference). "FIND YOUR / FUR-EVER / SOMEBODY." with FUR-EVER in pink-to-fuchsia-to-purple gradient. Pink "Text us now" + violet "View puppies" CTAs. Trust badges (Vet checked, Home raised, Family socialized) below. |
| Available puppies | `/puppies` | Dark hero with "AVAILABLE PUPPIES" display. Pink "Inquire About a Puppy" + violet "See upcoming litters" CTAs. Filter pills + sort dropdown styled dark. Puppy cards keep colored corners/badges. |
| Upcoming litters | `/upcoming-litters` | Dark hero "WHAT IS COMING NEXT." Pink "Text us for updates" + violet "Call our team" CTAs. Litter cards on `bg-[#12051f]/90` surfaces. |
| Training plan | `/training-plan` | Dark hero with cap icon + "Free Personalized Training Plan". Form below uses light card surfaces inside the dark shell (intentional contrast for readability). |
| Reviews | `/dreamy-reviews` | Dark hero "DREAMY REVIEWS". Single violet "SHARE YOUR STORY" CTA. Empty state ("No reviews yet — be the first!") rendered on dark surface. |
| FAQ | `/faq` | Dark hero "FREQUENTLY ASKED QUESTIONS". Topic tabs in left sidebar with pink active state, accordion items on dark surface with subtle borders. Section descriptions surface above each topic. |
| Contact | `/contact` | Dark hero with mail icon + "CONTACT US". Two info cards (Phone, Email) on left, "SEND US A MESSAGE" form on right — both on dark surfaces. |

To see the visuals yourself **without touching main**, the worktree is already set up:

```bash
# from the main repo
cp .env.local .claude/worktrees/galactic-mockup/.env.local   # already done by the recovery agent
cd .claude/worktrees/galactic-mockup
npm run dev -- --port 5180
# then open http://127.0.0.1:5180
```

Visit `/`, `/puppies`, `/upcoming-litters`, `/training-plan`, `/dreamy-reviews`, `/faq`, `/contact`.

---

## One side-effect to be aware of (NOT a regression of your wave)

The Layout.tsx change is global: any page using `<Layout>` without `bare` now gets `GalacticHomeMiniFooter` instead of the old `Footer`. The seven cherry-picked pages convert to `<Layout bare>` and own their footer, so they're fine. But three other public pages — **`Breeds.tsx`, `Consultation.tsx`, `Essentials.tsx`** — still use `<Layout>` (non-bare) and were **not** in the unification commit. After the cherry-pick they'll show:

- The new dark `GalacticHomeNav` at the top (because Layout always rendered the new nav even before this commit)
- Their existing light/cream hero and body
- The new `GalacticHomeMiniFooter` at the bottom (the change introduced by this commit)

That's a cosmetic mismatch — old hero sandwiched between new nav and new footer. It does **not** break the deposit flow (those pages are not part of the deposit flow). Options:
- (a) Land the cherry-pick first; treat re-skinning Breeds/Consultation/Essentials as a small follow-up.
- (b) Re-skin those three pages in the same PR for visual consistency.

Recommend **(a)** to keep the recovery PR small and reviewable.

---

## Dirty files unrelated to this fix

The working tree currently has:

```
M netlify.toml
M public/_redirects
?? docs/ops/payment-handle-hygiene.md
```

These are unrelated SPA-routing hardening (a `/assets/* → 404` rule so missing chunks don't fall through to `index.html`) and your H7 ops doc. They're orthogonal to both the cherry-pick and the recovery work — the cherry-pick won't touch them. Commit them separately whenever fits your wave's cadence.

---

## Verification after the cherry-pick

```bash
npm run check       # lint + tsc + tests
npm run build       # production build
```

Manual visual walk-through (already covered against the worktree but should be repeated against main once cherry-pick lands):

- `/`, `/puppies`, `/upcoming-litters`, `/training-plan`, `/dreamy-reviews`, `/faq`, `/contact` — all show the galactic shell described above.
- Mobile width (≤375 px) — hero stacks, nav becomes hamburger, CTAs full-width. Confirmed working in the worktree.

Regression check (your wave must still function):

- `/request-deposit` — submits, admin email arrives.
- `/admin/agreements`, `/admin/deposit-requests`, `/admin/pickup/:agreementId` — render unchanged.
- `/payment/:agreementId/:buyerToken` (Wave D) — gated SELECT works, attestation flow (H1/H2) unaffected.
- `mark-payment-sent` edge function — H1+H2 gating unaffected.

---

## What this work does NOT touch

Explicit non-list (use this to settle any "did the cherry-pick break X" question):

- No edge function modified.
- No migration added.
- No Supabase schema change.
- No deposit / payment / agreement / attestation / handover / communication file modified.
- No `_shared/auth/*`, `_shared/email/*`, `_shared/pdf/*` modified.
- No admin chrome (`AdminLayout`, admin pages other than the dev mockup route) modified.
- No service-role code paths modified.

If something in your wave breaks after the cherry-pick lands, it is by definition **not** caused by the cherry-pick. Look elsewhere.

---

## Process note (so this doesn't happen again)

The orphaned-branch failure mode will recur unless one of:

1. Local feature branches get pushed to `origin/` so they survive context switches and show up in PR-review tooling.
2. `git branch --no-merged main` is run periodically (suggest weekly) to catch dangling work.
3. The galactic shell is extracted into a shared `<GalacticPageShell>` component so adding a new public page doesn't require duplicating the idiom. Suggest as a follow-up after the cherry-pick lands — out of scope for the recovery itself.

After the cherry-pick lands, run `git branch --no-merged main` to confirm there isn't a third orphaned branch hiding.

---

## Worktree the recovery agent left you

A live preview of the design is at:

```
.claude/worktrees/galactic-mockup/   (HEAD: 42c0f27, branch: feat/puppies-hero-color-scheme)
```

`node_modules` is symlinked into the main repo's, and `.env.local` has been copied in. Run `npm run dev -- --port 5180` from inside it for an instant preview. Tear it down with `git worktree remove .claude/worktrees/galactic-mockup` after the cherry-pick lands.
