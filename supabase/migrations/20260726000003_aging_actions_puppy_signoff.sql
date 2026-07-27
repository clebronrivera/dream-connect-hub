-- Queue the paperwork left over after a puppy is marked Sold.
--
-- Marking a puppy Sold takes one tap and immediately pulls it off the public
-- site (puppies_enforce_visibility forces is_publicly_visible=false, and
-- puppies_autoset_date_sold stamps date_sold). What it does NOT capture is how
-- much it actually sold for — and nothing was reminding anyone to come back for
-- it. Measured on production when this was written: 22 of 22 sold puppies had
-- no sale_price.
--
-- So the sale price is now tracked as a fourth class of aging action item,
-- surfacing in the same /admin Dashboard "Needs attention" panel as stale
-- requests and overdue pickups. The operator marks the puppy sold in the
-- moment and records the money later, without having to remember which ones
-- are outstanding.
--
-- Deliberately keyed on sale_price alone. reserved_for_customer_id is also
-- empty on every sold puppy, but linking a customer record is optional in this
-- workflow — gating on it would leave every row permanently stuck in the queue.
-- The close-out dialog offers it; the queue doesn't demand it.
--
-- `dollars` carries the listed price (final_price, else base_price) rather than
-- the sale price, since the whole point is that the sale price is missing. It
-- gives the operator the expected number to check against while filling it in.

DROP FUNCTION IF EXISTS public.get_aging_action_items();
CREATE OR REPLACE FUNCTION public.get_aging_action_items()
RETURNS TABLE (
  kind          text,
  id            uuid,
  label         text,
  created_at    timestamptz,
  days_stale    int,
  dollars       numeric,
  link_path     text
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT 'request_stale'::text                                              AS kind,
         dr.id                                                              AS id,
         coalesce(dr.customer_name, 'Unnamed') || ' — ' ||
           coalesce(dr.upcoming_litter_label, dr.puppy_name, 'request')     AS label,
         dr.created_at                                                      AS created_at,
         (now()::date - dr.created_at::date)::int                           AS days_stale,
         NULL::numeric                                                      AS dollars,
         ('/admin/deposit-requests?open=' || dr.id::text)                   AS link_path
    FROM public.deposit_requests dr
   WHERE dr.request_status = 'pending'
     AND dr.created_at < now() - interval '3 days'

  UNION ALL

  SELECT 'agreement_unpaid_stale'::text,
         da.id,
         da.buyer_name || ' — ' || coalesce(da.puppy_name, 'puppy'),
         da.created_at,
         (now()::date - da.created_at::date)::int,
         da.purchase_price::numeric,
         ('/admin/agreements?open=' || da.id::text)
    FROM public.deposit_agreements da
   WHERE da.agreement_status = 'sent'
     AND da.deposit_status = 'pending'
     AND da.created_at < now() - interval '5 days'

  UNION ALL

  SELECT 'reservation_pickup_overdue'::text,
         da.id,
         da.buyer_name || ' — ' || coalesce(da.puppy_name, 'puppy'),
         da.created_at,
         (now()::date - da.pickup_deadline)::int,
         da.balance_due::numeric,
         ('/admin/agreements?open=' || da.id::text)
    FROM public.deposit_agreements da
   WHERE da.agreement_status IN ('sent', 'admin_approved')
     AND da.pickup_deadline IS NOT NULL
     AND da.pickup_deadline < now()::date

  UNION ALL

  -- Sold, but we never recorded what it sold for.
  SELECT 'puppy_signoff_incomplete'::text,
         p.id,
         p.name || ' — ' || coalesce(p.breed, 'puppy'),
         coalesce(p.date_sold::timestamptz, p.updated_at),
         (now()::date - coalesce(p.date_sold, p.updated_at::date))::int,
         coalesce(p.final_price, p.base_price)::numeric,
         ('/admin/puppies?closeout=' || p.id::text)
    FROM public.puppies p
   WHERE p.status = 'Sold'
     AND coalesce(p.is_deceased, false) = false
     AND p.sale_price IS NULL

   ORDER BY days_stale DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_aging_action_items() IS
  'Four classes of aging items for the /admin Dashboard action panel: stale pending requests, signed-but-unpaid agreements, reservations past pickup deadline, and sold puppies still missing a sale price. Admin-only via base-table RLS.';
