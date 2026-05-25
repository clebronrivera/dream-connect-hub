-- ============================================================================
-- Add indexes on unindexed foreign key columns
--
-- Supabase performance advisor flagged 6 FK columns with no covering index.
-- Without these, JOIN / DELETE / UPDATE operations that cascade through these
-- FKs require full sequential scans of the referencing table.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contact_messages_upcoming_litter_id
    ON public.contact_messages(upcoming_litter_id);

CREATE INDEX IF NOT EXISTS idx_deposit_agreements_litter_id
    ON public.deposit_agreements(litter_id);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_puppy_id
    ON public.deposit_requests(puppy_id);

CREATE INDEX IF NOT EXISTS idx_kit_items_product_id
    ON public.kit_items(product_id);

CREATE INDEX IF NOT EXISTS idx_parent_dog_expenses_parent_dog_id
    ON public.parent_dog_expenses(parent_dog_id);

CREATE INDEX IF NOT EXISTS idx_puppy_expenses_puppy_id
    ON public.puppy_expenses(puppy_id);
