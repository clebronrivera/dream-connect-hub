# Payment handle & merchant descriptor hygiene

> Wave H phase 3 (H7). **Operator action** — these are dashboard-side
> settings on the payment processors themselves; there is no code that
> can enforce them. The chargeback defense layer (H1–H4, H8) records
> evidence on the receiving side, but the **sending side** of the
> payment is what the buyer's bank sees on a dispute. If the sender
> sees an unfamiliar name on their statement they're more likely to
> dispute. These settings make sure the name they see clearly maps to
> the agreement they signed.

## Why this matters

Buyers sometimes file chargebacks weeks after a deposit because the
charge on their statement doesn't match the business they remember.
Square in particular has a formal chargeback process that we can fight
with the H8 evidence packet — but it's much easier to *prevent* the
dispute by making sure the descriptor matches the public-facing brand.
Zelle, Venmo, and Cash App don't have a true chargeback flow but
buyers can still file with their issuing bank if the receiving account
looks suspicious.

## Required settings

### Square — merchant descriptor
- Sign in to the Square dashboard.
- Navigate: **Settings → Account & Settings → Business → Locations →
  (your location) → Receipt Information**.
- **Statement descriptor** must read exactly:
  `DREAMPUPPIES 321-697-8864`
- The phone number is intentionally part of the string so a confused
  buyer can call us before disputing.
- Verify by running a test charge against your own card and reading the
  bank statement. Update if the live descriptor differs.

### Zelle
- Receiving account display name must read **Dream Puppies** or
  **Dream Enterprises Puppy Heaven LLC** — never an individual operator's
  personal name.
- If the bank app shows a personal name, the sender will see that on
  their confirmation screen and it won't match the agreement.
- Update via the bank app's profile / nickname setting; some banks
  surface this as "business name on Zelle."

### Venmo
- The receiving account must be a **Business Profile**, not a personal
  one. Business Profile is required for any payments related to goods
  or services (Venmo's TOS).
- Display name on the business profile: **Dream Puppies**.
- Profile picture: the brand paw logo (consistent with email + site).

### Cash App
- Use a **$Cashtag for the business**, not a personal one. Display name:
  **Dream Puppies**.
- Note: Cash App is the weakest channel for dispute defense (their
  consumer-protection program is limited). Consider it last-resort.

## Verification cadence

- **At least quarterly**: open each payment app and confirm the
  display/descriptor still matches the values above. Banks and apps
  occasionally reset display names after profile changes.
- **After any rebrand or phone number change**: update all four
  immediately and run a test transaction.

## Cross-references

- Buyer-side capture of the same data is in
  `payment_attestations.buyer_payment_handle` (Wave H phase 1, H1) — the
  buyer types their own handle in the H1 attestation form. The
  operator's typed sender-handle (H3) is matched against it to detect
  spoofing.
- The H8 dispute-evidence packet pulls all of these into one ZIP for
  manual upload to Square's dispute portal.
