-- Wave A6: drop two RLS policies that exist on remote but are not in any migration.
--
-- Background: a live `pg_policy` query against deposit_agreements showed four
-- policies, two of which never originated in a migration:
--   * public_insert_deposit_agreements (plural)  — permissive INSERT allowing
--     agreement_status IN ('sent','buyer_signed') and fewer NULL constraints.
--     Lets a stranger insert a row claiming buyer_signed. Postgres OR's
--     permissive policies, so this currently overrides the strict singular
--     policy below.
--   * public_read_recent_deposit_agreements      — public SELECT window of
--     anything inserted in the last 60 seconds. Leaks buyer PII for one-minute
--     windows after submission.
--
-- Both must go. The singular `public_insert_deposit_agreement` (no trailing
-- 's', defined in 20260422000000_fix_deposit_and_audit_rls.sql) keeps the
-- legitimate public INSERT path with the strict locked-initial-state CHECK.
-- The buyer-readable path is replaced in Wave D by a token-based SELECT
-- policy. Until then, public SELECT on this table is admin-only.

DROP POLICY IF EXISTS public_insert_deposit_agreements ON public.deposit_agreements;
DROP POLICY IF EXISTS public_read_recent_deposit_agreements ON public.deposit_agreements;

COMMENT ON TABLE public.deposit_agreements IS
  'Public INSERT only via public_insert_deposit_agreement (singular, locked initial state — see 20260422000000). Public SELECT will be added by Wave D via a buyer-token RLS policy. Operator/admin path uses admin_all_deposit_agreements.';
