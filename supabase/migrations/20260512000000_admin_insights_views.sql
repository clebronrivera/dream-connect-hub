-- ============================================================================
-- ADMIN INSIGHTS VIEWS & RPC
-- Migration: 20260512000000_admin_insights_views.sql
-- Powers the rewritten /admin Dashboard (revenue, pipeline, projections).
-- ============================================================================
-- All views use security_invoker so they respect base-table RLS:
-- admin sees everything; non-admin sees nothing. No new grants needed.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- v_admin_revenue_monthly
-- Monthly revenue buckets, last 24 months. Splits collected deposits from
-- collected balances. Empty months render as zero (LEFT JOIN over generated
-- month series), so client charts never have gaps.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_admin_revenue_monthly;
CREATE VIEW public.v_admin_revenue_monthly
WITH (security_invoker = on) AS
WITH months AS (
  SELECT date_trunc('month', d)::date AS month
    FROM generate_series(
      date_trunc('month', now() - interval '23 months'),
      date_trunc('month', now()),
      interval '1 month'
    ) AS d
),
deposits AS (
  SELECT date_trunc('month', payment_confirmed_at)::date AS month,
         count(*) AS cnt,
         coalesce(sum(deposit_amount), 0) AS amt
    FROM public.deposit_agreements
   WHERE deposit_status = 'admin_confirmed'
     AND payment_confirmed_at IS NOT NULL
     AND payment_confirmed_at >= date_trunc('month', now() - interval '23 months')
   GROUP BY 1
),
balances AS (
  SELECT date_trunc('month', fs.final_payment_confirmed_at)::date AS month,
         count(*) AS cnt,
         coalesce(sum(da.balance_due), 0) AS amt
    FROM public.final_sales fs
    JOIN public.deposit_agreements da ON da.id = fs.deposit_agreement_id
   WHERE fs.final_payment_status = 'admin_confirmed'
     AND fs.final_payment_confirmed_at IS NOT NULL
     AND fs.final_payment_confirmed_at >= date_trunc('month', now() - interval '23 months')
   GROUP BY 1
)
SELECT m.month,
       coalesce(d.cnt, 0)::int                                     AS deposits_collected_count,
       coalesce(d.amt, 0)::numeric(10,2)                           AS deposits_collected_amount,
       coalesce(b.cnt, 0)::int                                     AS balances_collected_count,
       coalesce(b.amt, 0)::numeric(10,2)                           AS balances_collected_amount,
       (coalesce(d.amt, 0) + coalesce(b.amt, 0))::numeric(10,2)    AS total_collected_amount
  FROM months m
  LEFT JOIN deposits d ON d.month = m.month
  LEFT JOIN balances b ON b.month = m.month
 ORDER BY m.month;

COMMENT ON VIEW public.v_admin_revenue_monthly IS
  'Monthly revenue buckets (last 24 months). Splits collected deposits from collected balances. Admin-only via base-table RLS.';


-- ---------------------------------------------------------------------------
-- v_admin_pipeline_funnel
-- Conversion funnel: count + $ at each pipeline stage.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_admin_pipeline_funnel;
CREATE VIEW public.v_admin_pipeline_funnel
WITH (security_invoker = on) AS
SELECT 1 AS display_order,
       'request_pending'::text AS stage_key,
       'New deposit requests'::text AS stage_label,
       (SELECT count(*)::int FROM public.deposit_requests
         WHERE request_status = 'pending') AS count,
       NULL::numeric AS total_dollars
UNION ALL
SELECT 2,
       'request_accepted',
       'Accepted, link not yet sent',
       (SELECT count(*)::int FROM public.deposit_requests
         WHERE request_status = 'accepted'),
       (SELECT coalesce(sum(p.base_price), 0)::numeric
          FROM public.deposit_requests dr
          LEFT JOIN public.puppies p ON p.id = dr.puppy_id
         WHERE dr.request_status = 'accepted')
UNION ALL
SELECT 3,
       'request_link_sent',
       'Deposit link sent, awaiting buyer',
       (SELECT count(*)::int FROM public.deposit_requests
         WHERE request_status = 'deposit_link_sent'),
       (SELECT coalesce(sum(p.base_price), 0)::numeric
          FROM public.deposit_requests dr
          LEFT JOIN public.puppies p ON p.id = dr.puppy_id
         WHERE dr.request_status = 'deposit_link_sent')
UNION ALL
SELECT 4,
       'agreement_sent_unpaid',
       'Agreement signed, deposit unpaid',
       (SELECT count(*)::int FROM public.deposit_agreements
         WHERE agreement_status = 'sent' AND deposit_status = 'pending'),
       (SELECT coalesce(sum(purchase_price), 0)::numeric
          FROM public.deposit_agreements
         WHERE agreement_status = 'sent' AND deposit_status = 'pending')
UNION ALL
SELECT 5,
       'agreement_deposit_confirmed',
       'Deposit confirmed, awaiting admin approval',
       (SELECT count(*)::int FROM public.deposit_agreements
         WHERE agreement_status = 'sent' AND deposit_status = 'admin_confirmed'),
       (SELECT coalesce(sum(purchase_price), 0)::numeric
          FROM public.deposit_agreements
         WHERE agreement_status = 'sent' AND deposit_status = 'admin_confirmed')
UNION ALL
SELECT 6,
       'agreement_admin_approved',
       'Admin-approved, awaiting balance',
       (SELECT count(*)::int FROM public.deposit_agreements
         WHERE agreement_status = 'admin_approved'),
       (SELECT coalesce(sum(purchase_price), 0)::numeric
          FROM public.deposit_agreements
         WHERE agreement_status = 'admin_approved')
UNION ALL
SELECT 7,
       'agreement_complete',
       'Sale complete',
       (SELECT count(*)::int FROM public.deposit_agreements
         WHERE agreement_status = 'complete'),
       (SELECT coalesce(sum(purchase_price), 0)::numeric
          FROM public.deposit_agreements
         WHERE agreement_status = 'complete')
ORDER BY display_order;

COMMENT ON VIEW public.v_admin_pipeline_funnel IS
  'Pipeline funnel: count + $ at each conversion stage. Admin-only via base-table RLS.';


-- ---------------------------------------------------------------------------
-- v_admin_breed_performance
-- Per-breed inventory + completed-sale revenue + conversion rate.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_admin_breed_performance;
CREATE VIEW public.v_admin_breed_performance
WITH (security_invoker = on) AS
WITH p AS (
  SELECT breed,
         count(*) FILTER (WHERE status = 'Available') AS available_count,
         count(*) FILTER (WHERE status = 'Reserved')  AS reserved_count,
         count(*) FILTER (WHERE status = 'Sold')      AS sold_count
    FROM public.puppies
   WHERE breed IS NOT NULL AND breed <> ''
   GROUP BY breed
),
inq AS (
  SELECT pp.breed, count(*)::int AS inquiry_count
    FROM public.puppy_inquiries pi
    JOIN public.puppies pp ON pp.id::text = pi.puppy_id
   WHERE pp.breed IS NOT NULL AND pp.breed <> ''
   GROUP BY pp.breed
),
rev AS (
  SELECT pp.breed,
         coalesce(sum(da.purchase_price), 0) AS total_revenue_collected,
         avg(da.purchase_price)::numeric(10,2) AS avg_sale_price
    FROM public.deposit_agreements da
    JOIN public.puppies pp ON pp.id = da.puppy_id
   WHERE da.agreement_status = 'complete'
     AND pp.breed IS NOT NULL AND pp.breed <> ''
   GROUP BY pp.breed
)
SELECT p.breed,
       p.available_count::int,
       p.reserved_count::int,
       p.sold_count::int,
       coalesce(inq.inquiry_count, 0)::int                          AS inquiry_count,
       coalesce(rev.total_revenue_collected, 0)::numeric(10,2)      AS total_revenue_collected,
       rev.avg_sale_price,
       CASE WHEN coalesce(inq.inquiry_count, 0) > 0
            THEN (p.sold_count::numeric / inq.inquiry_count)::numeric(5,4)
            ELSE NULL END                                           AS conversion_rate
  FROM p
  LEFT JOIN inq ON inq.breed = p.breed
  LEFT JOIN rev ON rev.breed = p.breed;

COMMENT ON VIEW public.v_admin_breed_performance IS
  'Per-breed: inventory counts, inquiries, completed-sale revenue, conversion rate. Admin-only via base-table RLS.';


-- ---------------------------------------------------------------------------
-- v_admin_forward_projection
-- Forward revenue projection by month (next 18 months from today).
--   from_reserved  = signed agreements; balance_due is the locked-in revenue
--   from_available = listed puppies that could sell at base_price
--   from_upcoming  = expected future-litter puppies (count yet to be created)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_admin_forward_projection;
CREATE VIEW public.v_admin_forward_projection
WITH (security_invoker = on) AS
WITH months AS (
  SELECT date_trunc('month', d)::date AS month
    FROM generate_series(
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '17 months',
      interval '1 month'
    ) AS d
),
puppy_ready AS (
  -- For each Available/Reserved puppy: compute its pickup-ready month
  -- (DOB + 56 days, or current month if past). Pull balance_due from any
  -- open agreement so Reserved puppies project the unpaid remainder.
  SELECT pp.id,
         pp.status,
         coalesce(pp.base_price, l.base_price, 0)::numeric AS price,
         da.balance_due,
         greatest(
           date_trunc('month', now())::date,
           date_trunc('month',
             (coalesce(l.date_of_birth, ul.date_of_birth, ul.expected_whelping_date, now()::date)
                + interval '56 days')
           )::date
         ) AS ready_month
    FROM public.puppies pp
    LEFT JOIN public.litters l           ON l.id = pp.litter_id
    LEFT JOIN public.upcoming_litters ul ON ul.id = pp.upcoming_litter_id
    LEFT JOIN LATERAL (
      SELECT balance_due
        FROM public.deposit_agreements
       WHERE puppy_id = pp.id
         AND agreement_status IN ('sent', 'admin_approved')
       ORDER BY created_at DESC
       LIMIT 1
    ) da ON true
   WHERE pp.status IN ('Available', 'Reserved')
),
reserved AS (
  SELECT ready_month AS month,
         count(*)::int AS cnt,
         coalesce(sum(coalesce(balance_due, price)), 0)::numeric(10,2) AS amt
    FROM puppy_ready
   WHERE status = 'Reserved'
   GROUP BY ready_month
),
available AS (
  SELECT ready_month AS month,
         count(*)::int AS cnt,
         coalesce(sum(price), 0)::numeric(10,2) AS amt
    FROM puppy_ready
   WHERE status = 'Available'
   GROUP BY ready_month
),
upcoming_expected AS (
  -- Expected puppies from upcoming_litters that haven't been created yet
  -- (total expected minus existing puppy rows linked to the upcoming_litter).
  -- Use breed-level base_price from most-recent matching litter as price proxy.
  SELECT greatest(
           date_trunc('month', now())::date,
           date_trunc('month',
             (coalesce(ul.date_of_birth, ul.expected_whelping_date) + interval '56 days')
           )::date
         ) AS month,
         greatest(
           coalesce(ul.total_puppy_count,
                    coalesce(ul.male_puppy_count, 0) + coalesce(ul.female_puppy_count, 0))
           - (SELECT count(*) FROM public.puppies pp2 WHERE pp2.upcoming_litter_id = ul.id),
           0
         ) AS expected_remaining,
         (SELECT l2.base_price
            FROM public.litters l2
           WHERE lower(l2.breed) = lower(ul.breed)
             AND l2.base_price IS NOT NULL
             AND l2.base_price > 0
           ORDER BY l2.date_of_birth DESC NULLS LAST
           LIMIT 1) AS price_per_pup
    FROM public.upcoming_litters ul
   WHERE ul.lifecycle_status IN ('pre_birth', 'post_birth')
     AND coalesce(ul.is_active, true) = true
     AND coalesce(ul.date_of_birth, ul.expected_whelping_date) IS NOT NULL
),
upcoming AS (
  SELECT month,
         sum(expected_remaining)::int AS cnt,
         coalesce(sum(expected_remaining * coalesce(price_per_pup, 0)), 0)::numeric(10,2) AS amt
    FROM upcoming_expected
   WHERE expected_remaining > 0
   GROUP BY month
)
SELECT m.month,
       coalesce(r.cnt, 0)::int                              AS from_reserved_count,
       coalesce(r.amt, 0)::numeric(10,2)                    AS from_reserved_amount,
       coalesce(a.cnt, 0)::int                              AS from_available_count,
       coalesce(a.amt, 0)::numeric(10,2)                    AS from_available_amount,
       coalesce(u.cnt, 0)::int                              AS from_upcoming_count,
       coalesce(u.amt, 0)::numeric(10,2)                    AS from_upcoming_amount,
       CASE
         WHEN coalesce(a.cnt, 0) + coalesce(u.cnt, 0) = 0
              AND coalesce(r.cnt, 0) > 0 THEN 'committed'
         ELSE 'projected'
       END                                                  AS confidence
  FROM months m
  LEFT JOIN reserved  r ON r.month = m.month
  LEFT JOIN available a ON a.month = m.month
  LEFT JOIN upcoming  u ON u.month = m.month
 ORDER BY m.month;

COMMENT ON VIEW public.v_admin_forward_projection IS
  'Forward revenue projection by month (next 18 months). from_reserved = locked-in balances; from_available = listed inventory; from_upcoming = expected future litters. Admin-only.';


-- ---------------------------------------------------------------------------
-- v_admin_kpi_summary
-- Single-row headline numbers for the top-of-dashboard tiles.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_admin_kpi_summary;
CREATE VIEW public.v_admin_kpi_summary
WITH (security_invoker = on) AS
WITH ytd_deposits AS (
  SELECT coalesce(sum(deposit_amount), 0) AS amt
    FROM public.deposit_agreements
   WHERE deposit_status = 'admin_confirmed'
     AND payment_confirmed_at >= date_trunc('year', now())
),
ytd_balances AS (
  SELECT coalesce(sum(da.balance_due), 0) AS amt
    FROM public.final_sales fs
    JOIN public.deposit_agreements da ON da.id = fs.deposit_agreement_id
   WHERE fs.final_payment_status = 'admin_confirmed'
     AND fs.final_payment_confirmed_at >= date_trunc('year', now())
),
last30_deposits AS (
  SELECT coalesce(sum(deposit_amount), 0) AS amt
    FROM public.deposit_agreements
   WHERE deposit_status = 'admin_confirmed'
     AND payment_confirmed_at >= now() - interval '30 days'
),
last30_balances AS (
  SELECT coalesce(sum(da.balance_due), 0) AS amt
    FROM public.final_sales fs
    JOIN public.deposit_agreements da ON da.id = fs.deposit_agreement_id
   WHERE fs.final_payment_status = 'admin_confirmed'
     AND fs.final_payment_confirmed_at >= now() - interval '30 days'
),
prev30_deposits AS (
  SELECT coalesce(sum(deposit_amount), 0) AS amt
    FROM public.deposit_agreements
   WHERE deposit_status = 'admin_confirmed'
     AND payment_confirmed_at >= now() - interval '60 days'
     AND payment_confirmed_at <  now() - interval '30 days'
),
prev30_balances AS (
  SELECT coalesce(sum(da.balance_due), 0) AS amt
    FROM public.final_sales fs
    JOIN public.deposit_agreements da ON da.id = fs.deposit_agreement_id
   WHERE fs.final_payment_status = 'admin_confirmed'
     AND fs.final_payment_confirmed_at >= now() - interval '60 days'
     AND fs.final_payment_confirmed_at <  now() - interval '30 days'
),
pipeline AS (
  SELECT coalesce(sum(purchase_price), 0) AS amt
    FROM public.deposit_agreements
   WHERE agreement_status IN ('sent', 'admin_approved')
     AND deposit_status IN ('pending', 'admin_confirmed')
),
inv AS (
  SELECT count(*) FILTER (WHERE status = 'Reserved')                              AS reserved_cnt,
         count(*) FILTER (WHERE status = 'Available')                             AS available_cnt,
         coalesce(sum(base_price) FILTER (WHERE status = 'Available'), 0)         AS available_val
    FROM public.puppies
),
proj_90 AS (
  SELECT coalesce(sum(from_reserved_amount + from_available_amount + from_upcoming_amount), 0) AS amt
    FROM public.v_admin_forward_projection
   WHERE month < (date_trunc('month', now()) + interval '3 months')
),
proj_12 AS (
  SELECT coalesce(sum(from_reserved_amount + from_available_amount + from_upcoming_amount), 0) AS amt
    FROM public.v_admin_forward_projection
   WHERE month < (date_trunc('month', now()) + interval '12 months')
),
conv AS (
  SELECT (SELECT count(*)::numeric FROM public.deposit_agreements
           WHERE agreement_status = 'complete') AS complete_cnt,
         (SELECT count(*)::numeric FROM public.deposit_requests) AS req_cnt
)
SELECT (ytd_deposits.amt + ytd_balances.amt)::numeric(10,2)         AS revenue_ytd,
       (last30_deposits.amt + last30_balances.amt)::numeric(10,2)   AS revenue_last_30d,
       (prev30_deposits.amt + prev30_balances.amt)::numeric(10,2)   AS revenue_prev_30d,
       pipeline.amt::numeric(10,2)                                  AS pipeline_value,
       inv.reserved_cnt::int                                        AS active_reservations_count,
       inv.available_cnt::int                                       AS available_inventory_count,
       inv.available_val::numeric(10,2)                             AS available_inventory_value,
       proj_90.amt::numeric(10,2)                                   AS next_90d_projection,
       proj_12.amt::numeric(10,2)                                   AS next_12mo_projection,
       CASE WHEN conv.req_cnt > 0
            THEN (conv.complete_cnt / conv.req_cnt)::numeric(5,4)
            ELSE NULL END                                           AS request_to_complete_conversion
  FROM ytd_deposits, ytd_balances,
       last30_deposits, last30_balances,
       prev30_deposits, prev30_balances,
       pipeline, inv, proj_90, proj_12, conv;

COMMENT ON VIEW public.v_admin_kpi_summary IS
  'One-row headline numbers for /admin dashboard tiles. Admin-only via base-table RLS.';


-- ---------------------------------------------------------------------------
-- get_aging_action_items() RPC
-- Returns the rows for the "needs attention" panel on /admin Dashboard.
-- ---------------------------------------------------------------------------
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

   ORDER BY days_stale DESC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_aging_action_items() IS
  'Three classes of aging items for the /admin Dashboard action panel: stale pending requests, signed-but-unpaid agreements, reservations past pickup deadline. Admin-only via base-table RLS.';
