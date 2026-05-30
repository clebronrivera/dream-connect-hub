-- ============================================================================
-- PUPPY "DECEASED" STATUS + EXPENSE-AWARE DASHBOARD
-- Migration: 20260530000000_puppy_deceased_status_and_expenses.sql
-- ============================================================================
-- Adds a first-class 'Deceased' puppy status and makes the admin dashboard
-- expense-aware so a puppy that dies (a) drops out of every income / inventory
-- / projection metric and (b) carries its associated cost as a business
-- expense, surfaced alongside a net (revenue − expenses) figure.
--
-- A deceased puppy is recorded as:
--   puppies.status      = 'Deceased'
--   puppies.is_deceased = true
--   puppies.is_publicly_visible = false   (already enforced by the form)
-- and any death-related cost is a normal puppy_expenses row with
-- category = 'death'. The puppy_expenses table already exists with full
-- admin-only RLS (admin_insert/read/update/delete) — no new table or policy.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Allow 'Deceased' in the status CHECK constraint, then backfill.
--    Order matters: widen the constraint before the UPDATE can write the new
--    value. Existing data has 1 puppy with is_deceased=true still sitting at
--    status='Available' (it was inflating available-inventory metrics).
-- ---------------------------------------------------------------------------
ALTER TABLE public.puppies
  DROP CONSTRAINT IF EXISTS puppies_status_check;

ALTER TABLE public.puppies
  ADD CONSTRAINT puppies_status_check
  CHECK (status IN ('Available', 'Pending', 'Sold', 'Reserved', 'Deceased'));

-- Bring already-flagged-deceased rows in line with the new status value.
UPDATE public.puppies
   SET status = 'Deceased'
 WHERE is_deceased = true
   AND status <> 'Deceased';

COMMENT ON COLUMN public.puppies.status IS
  'Available | Pending | Sold | Reserved | Deceased. Deceased rows are kept for accounting, hidden from public, and excluded from all income/inventory/projection metrics. Always paired with is_deceased=true.';


-- ---------------------------------------------------------------------------
-- 2. v_admin_forward_projection — exclude deceased puppies.
--    Column list is unchanged, so CREATE OR REPLACE keeps the dependent
--    v_admin_kpi_summary view intact. The only change is the is_deceased guard
--    in puppy_ready (status IN ('Available','Reserved') already excludes
--    'Deceased', but the explicit guard is defensive + self-documenting).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_admin_forward_projection
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
     AND pp.is_deceased = false
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
  'Forward revenue projection by month (next 18 months). Excludes deceased puppies. from_reserved = locked-in balances; from_available = listed inventory; from_upcoming = expected future litters. Admin-only.';


-- ---------------------------------------------------------------------------
-- 3. v_admin_kpi_summary — exclude deceased from inventory, add expenses + net.
--    Column set changes (new expense/net columns) so DROP + CREATE. Nothing
--    depends on this view. Expenses sum puppy_expenses + parent_dog_expenses
--    by expense_date; net_ytd = revenue_ytd − expenses_ytd.
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
-- Expenses: puppy_expenses + parent_dog_expenses, bucketed by expense_date.
exp_all AS (
  SELECT expense_date, cost FROM public.puppy_expenses
  UNION ALL
  SELECT expense_date, cost FROM public.parent_dog_expenses
),
ytd_expenses AS (
  SELECT coalesce(sum(cost), 0) AS amt FROM exp_all
   WHERE expense_date >= date_trunc('year', now())::date
),
last30_expenses AS (
  SELECT coalesce(sum(cost), 0) AS amt FROM exp_all
   WHERE expense_date >= (now() - interval '30 days')::date
),
total_expenses AS (
  SELECT coalesce(sum(cost), 0) AS amt FROM exp_all
),
pipeline AS (
  SELECT coalesce(sum(purchase_price), 0) AS amt
    FROM public.deposit_agreements
   WHERE agreement_status IN ('sent', 'admin_approved')
     AND deposit_status IN ('pending', 'admin_confirmed')
),
inv AS (
  SELECT count(*) FILTER (WHERE status = 'Reserved' AND is_deceased = false)                      AS reserved_cnt,
         count(*) FILTER (WHERE status = 'Available' AND is_deceased = false)                     AS available_cnt,
         coalesce(sum(base_price) FILTER (WHERE status = 'Available' AND is_deceased = false), 0) AS available_val
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
       ytd_expenses.amt::numeric(10,2)                              AS expenses_ytd,
       last30_expenses.amt::numeric(10,2)                           AS expenses_last_30d,
       total_expenses.amt::numeric(10,2)                            AS expenses_total,
       (ytd_deposits.amt + ytd_balances.amt - ytd_expenses.amt)::numeric(10,2) AS net_ytd,
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
       ytd_expenses, last30_expenses, total_expenses,
       pipeline, inv, proj_90, proj_12, conv;

COMMENT ON VIEW public.v_admin_kpi_summary IS
  'One-row headline numbers for /admin dashboard tiles. Inventory excludes deceased puppies; adds expenses_ytd/last_30d/total and net_ytd (revenue_ytd − expenses_ytd). Admin-only via base-table RLS.';
