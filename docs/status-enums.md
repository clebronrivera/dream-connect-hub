# Status enum source of truth

This file is the canonical list of allowed values for every status column in
the reservation workflow. All TypeScript types, RLS policies, edge functions,
and documentation must agree with this file. Update *here first*, then
propagate.

## deposit_requests.request_status
- pending — buyer submitted /request-deposit; operator has not reviewed.
- accepted — operator clicked Accept in OperatorReviewForm. Puppy/price/deposit captured. Link not yet emailed.
- deposit_link_sent — operator clicked Send Deposit Link. send-deposit-link emailed the URL with ?requestId=… .
- converted — buyer submitted the formal agreement, creating a deposit_agreements row with deposit_request_id set. Set by trigger link_deposit_agreement_to_request, not by client UPDATE.
- declined — operator declined. decline_reason populated. Terminal.

State diagram:
  pending → accepted → deposit_link_sent → converted (terminal)
  pending → declined (terminal)
  accepted → declined (terminal)

## deposit_agreements.agreement_status
- sent — row created by buyer submission. buyer_signed_at set on insert. Initial state — NEVER transitioned to "buyer_signed" (that value was removed; see Wave A5).
- admin_approved — finalize-agreement edge function set admin_approved_at after verifying buyer_signed_at + admin_signed_at + deposit_status='admin_confirmed'.
- complete — set after generate-agreement-pdf wrote signed_pdf_storage_path and the buyer email was sent. Terminal happy-path state.
- cancelled — operator voided. Terminal.

## deposit_agreements.deposit_status
- pending — initial. Awaiting payment confirmation.
- admin_confirmed — operator marked payment received via /admin/agreements.
- rejected — operator rejected within the 48-hour breeder window. Terminal.
- refunded — operator processed an explicit refund. Terminal.

## puppies.status
- Available — listed publicly, accepting deposits. (Title-case is the existing convention.)
- Reserved — has an active non-terminal deposit_agreement. Set automatically by the `sync_puppy_status_from_agreement` trigger (Wave G partial) when an agreement enters `admin_approved` or `complete`. Cleared back to `Available` when the agreement transitions to `cancelled`.
- Sold — picked up. Terminal — the trigger never overwrites it.

## final_sales.final_payment_status
- pending — balance not yet collected.
- admin_confirmed — operator marked balance received.

## payment_attestations.attestation_status (Wave H1)
- draft — buyer started the attestation form.
- signed — buyer completed and signed the attestation. Required before mark-payment-sent fires.

## pickup_handovers.handover_status (Wave H4)
- scheduled — pickup window opened.
- in_person_verified — operator confirmed buyer ID, photos uploaded, signatures captured. Terminal.
