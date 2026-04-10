-- ============================================================================
-- DEPOSIT & SALES WORKFLOW
-- Migration: 20260410000000_deposit_workflow.sql
-- Creates: deposit_agreements, final_sales, payment_methods_config
-- ============================================================================

-- 1.1 — Helper function: agreement number generator
-- Format: DP-YYYY-XXXX (random alphanumeric, no ambiguous chars)
CREATE OR REPLACE FUNCTION generate_agreement_number()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN 'DP-' || to_char(now(), 'YYYY') || '-' || result;
END;
$$ LANGUAGE plpgsql;


-- 1.2 — deposit_agreements table
CREATE TABLE deposit_agreements (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number              text UNIQUE NOT NULL DEFAULT generate_agreement_number(),

  -- Buyer info
  buyer_name                    text NOT NULL,
  buyer_email                   text NOT NULL,
  buyer_phone                   text,
  buyer_address                 text,

  -- Puppy / litter linkage
  puppy_id                      uuid REFERENCES puppies(id) ON DELETE SET NULL,
  litter_id                     uuid REFERENCES upcoming_litters(id) ON DELETE SET NULL,
  puppy_name                    text NOT NULL DEFAULT 'Undecided',
  breed                         text,
  puppy_dob                     date,  -- nullable if litter not yet born

  -- Pricing
  purchase_price                numeric(10,2) NOT NULL CHECK (purchase_price > 0),
  deposit_tier                  text NOT NULL CHECK (deposit_tier IN ('pre_8_weeks','post_8_weeks')),
  deposit_amount                numeric(10,2) NOT NULL CHECK (deposit_amount > 0),
  balance_due                   numeric(10,2) GENERATED ALWAYS AS (purchase_price - deposit_amount) STORED,

  -- Payment
  deposit_payment_method        text NOT NULL CHECK (deposit_payment_method IN
                                  ('zelle','venmo','cashapp','apple_pay','square','cash','split')),
  deposit_payment_detail        jsonb,      -- [{method, amount}] for split; null otherwise
  final_payment_method_intended text CHECK (final_payment_method_intended IN
                                  ('zelle','venmo','cashapp','apple_pay','square','cash','split')),
  payment_memo                  text GENERATED ALWAYS AS (buyer_name || ' - ' || puppy_name) STORED,

  -- Status
  deposit_status                text NOT NULL DEFAULT 'pending'
                                  CHECK (deposit_status IN ('pending','admin_confirmed','rejected','refunded')),
  agreement_status              text NOT NULL DEFAULT 'sent'
                                  CHECK (agreement_status IN ('sent','buyer_signed','admin_approved','complete','cancelled')),

  -- Pickup date logic
  -- RULE: proposed_pickup_date must be >= puppy_dob + 56 days (enforced in app + DB constraint)
  -- RULE: if deposit made before puppy reaches 8 weeks, the 14-day completion clock
  --       starts on puppy_dob + 56 days, NOT on deposit created_at
  proposed_pickup_date          date NOT NULL,
  confirmed_pickup_date         date,
  pickup_clock_start            date,   -- computed by trigger
  pickup_deadline               date,   -- computed by trigger

  -- Seller & workflow
  authorized_seller             text NOT NULL CHECK (authorized_seller IN
                                  ('carlos_lebron_rivera','yolanda_labran_rivera')),
  full_pay_flow                 boolean NOT NULL DEFAULT false,

  -- Signatures
  -- Buyer e-signature: typed full name, stored as text. Rendered in cursive font in UI.
  buyer_signature_text          text,        -- typed name used as e-sig
  buyer_signature_font          text DEFAULT 'Dancing Script',
  buyer_signed_at               timestamptz,

  -- Admin signature: base64 PNG captured from signature pad on dashboard
  admin_signature_svg           text,        -- base64 PNG of admin signature
  admin_signature_name          text,        -- authorized seller printed name at time of signing
  admin_signed_at               timestamptz,

  -- Finalization: ALL THREE required for sale to be final
  -- (buyer_signed_at IS NOT NULL) AND (admin_signed_at IS NOT NULL) AND (deposit_status = 'admin_confirmed')
  admin_approved_at             timestamptz,
  payment_confirmed_at          timestamptz,

  -- Reminders
  reminder_last_sent_at         timestamptz,
  reminder_count                int NOT NULL DEFAULT 0,
  requires_manual_review        boolean NOT NULL DEFAULT false,

  -- Rejection / refund
  rejection_reason              text,
  rejection_is_within_window    boolean,  -- true if rejected within 48hr window

  notes                         text,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at (reuses existing function from products_kits_inventory migration)
CREATE TRIGGER set_updated_at_deposit_agreements
  BEFORE UPDATE ON deposit_agreements
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Compute pickup_clock_start and pickup_deadline on INSERT/UPDATE
CREATE OR REPLACE FUNCTION compute_pickup_dates()
RETURNS trigger AS $$
BEGIN
  IF NEW.puppy_dob IS NOT NULL AND NEW.created_at::date < (NEW.puppy_dob + INTERVAL '56 days')::date THEN
    NEW.pickup_clock_start := (NEW.puppy_dob + INTERVAL '56 days')::date;
  ELSE
    NEW.pickup_clock_start := NEW.created_at::date;
  END IF;
  NEW.pickup_deadline := NEW.pickup_clock_start + INTERVAL '14 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_pickup_dates
  BEFORE INSERT OR UPDATE ON deposit_agreements
  FOR EACH ROW EXECUTE PROCEDURE compute_pickup_dates();


-- 1.3 — Pickup date constraint (enforced at DB level)
-- Enforce: proposed_pickup_date must be >= puppy_dob + 56 days when dob is known
ALTER TABLE deposit_agreements
  ADD CONSTRAINT chk_pickup_after_8_weeks
  CHECK (
    puppy_dob IS NULL
    OR proposed_pickup_date >= (puppy_dob + INTERVAL '56 days')::date
  );


-- 1.4 — final_sales table
CREATE TABLE final_sales (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_agreement_id        uuid REFERENCES deposit_agreements(id) ON DELETE SET NULL,
  puppy_final_name            text,      -- Collected at final payment step; required before guide gen
  full_pay_flow               boolean NOT NULL DEFAULT false,

  final_payment_method        text NOT NULL CHECK (final_payment_method IN
                                ('zelle','venmo','cashapp','apple_pay','square','cash','split')),
  final_payment_detail        jsonb,
  final_payment_status        text NOT NULL DEFAULT 'pending'
                                CHECK (final_payment_status IN ('pending','admin_confirmed')),
  final_payment_confirmed_at  timestamptz,

  pet_guide_generated_at      timestamptz,
  pet_guide_sent_at           timestamptz,
  pet_guide_storage_path      text,       -- Supabase Storage: pet-guides/[agreement_number].pdf

  sale_complete               boolean NOT NULL DEFAULT false,
  completed_at                timestamptz,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_final_sales
  BEFORE UPDATE ON final_sales
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 1.5 — payment_methods_config table
CREATE TABLE payment_methods_config (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_key              text UNIQUE NOT NULL,
  display_name            text NOT NULL,
  is_enabled              boolean NOT NULL DEFAULT true,
  qr_code_storage_path    text,       -- Supabase Storage: payment-qr-codes/[method_key].png
  qr_code_public_url      text,       -- Cached public URL
  handle_or_recipient     text,       -- e.g. '@DreamPuppies' or phone number
  payment_note            text,       -- Custom instructions shown to buyer
  requires_manual_confirm boolean NOT NULL DEFAULT false,
  display_order           int NOT NULL DEFAULT 0,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_payment_methods_config
  BEFORE UPDATE ON payment_methods_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Seed default payment methods
INSERT INTO payment_methods_config (method_key, display_name, requires_manual_confirm, display_order) VALUES
  ('zelle',     'Zelle',       false, 1),
  ('venmo',     'Venmo',       false, 2),
  ('cashapp',   'Cash App',    false, 3),
  ('apple_pay', 'Apple Pay',   false, 4),
  ('square',    'Square',      true,  5),
  ('cash',      'Cash',        true,  6);


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE deposit_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods_config ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD on deposit_agreements
CREATE POLICY admin_all_deposit_agreements ON deposit_agreements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin full CRUD on final_sales
CREATE POLICY admin_all_final_sales ON final_sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin full CRUD on payment_methods_config
CREATE POLICY admin_all_payment_methods_config ON payment_methods_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Public can read enabled payment methods
CREATE POLICY public_read_enabled_payment_methods ON payment_methods_config
  FOR SELECT USING (is_enabled = true);


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_deposit_agreements_deposit_status ON deposit_agreements (deposit_status);
CREATE INDEX idx_deposit_agreements_agreement_status ON deposit_agreements (agreement_status);
CREATE INDEX idx_deposit_agreements_puppy_id ON deposit_agreements (puppy_id);
CREATE INDEX idx_deposit_agreements_created_at ON deposit_agreements (created_at DESC);
CREATE INDEX idx_final_sales_deposit_agreement_id ON final_sales (deposit_agreement_id);
CREATE INDEX idx_payment_methods_config_enabled ON payment_methods_config (is_enabled);


-- ============================================================================
-- pg_cron for pending deposit reminders (optional — requires pg_cron extension)
-- If pg_cron is not available on your plan, trigger this via external scheduler.
-- ============================================================================
-- Uncomment if pg_cron is enabled:
--
-- SELECT cron.schedule(
--   'pending-deposit-reminders',
--   '0 * * * *',   -- every hour
--   $$
--   SELECT net.http_post(
--     url := current_setting('app.edge_function_url') || '/send-pending-reminders',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer ' ||
--                current_setting('app.service_role_key') || '"}',
--     body := '{}'
--   );
--   $$
-- );
