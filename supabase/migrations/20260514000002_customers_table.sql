-- Wave 5: dedicated `customers` table with dedup-on-insert.
--
-- Same person submitting twice (an inquiry then a deposit request, or two
-- inquiries about different puppies) now resolves to one customer row keyed
-- on normalized email OR normalized phone digits. The breeder can attach a
-- customer to a specific puppy via puppies.reserved_for_customer_id (set
-- from the puppy form in Wave 5 UI).
--
-- Public intake (puppy_inquiries, deposit_requests) flows through a BEFORE
-- INSERT trigger that fills customer_id automatically. The trigger calls
-- the SECURITY DEFINER function upsert_customer_for_intake so anon writers
-- don't need direct write access to customers.

-- 1) Table
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  email_normalized text GENERATED ALWAYS AS (
    NULLIF(lower(trim(email)), '')
  ) STORED,
  phone_digits text GENERATED ALWAYS AS (
    NULLIF(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
  ) STORED,
  first_name text,
  last_name text,
  city text,
  state text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One customer per normalized email; same for normalized phone digits.
CREATE UNIQUE INDEX idx_customers_email_normalized
  ON customers(email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX idx_customers_phone_digits
  ON customers(phone_digits)
  WHERE phone_digits IS NOT NULL;

-- 2) FKs from intake tables and from puppies for the "reserved for" link.
ALTER TABLE puppy_inquiries
  ADD COLUMN customer_id uuid REFERENCES customers(id);
CREATE INDEX idx_puppy_inquiries_customer_id
  ON puppy_inquiries(customer_id)
  WHERE customer_id IS NOT NULL;

ALTER TABLE deposit_requests
  ADD COLUMN customer_id uuid REFERENCES customers(id);
CREATE INDEX idx_deposit_requests_customer_id
  ON deposit_requests(customer_id)
  WHERE customer_id IS NOT NULL;

ALTER TABLE puppies
  ADD COLUMN reserved_for_customer_id uuid REFERENCES customers(id);
CREATE INDEX idx_puppies_reserved_for_customer
  ON puppies(reserved_for_customer_id)
  WHERE reserved_for_customer_id IS NOT NULL;

-- 3) RLS — admin only (via existing is_admin() helper).
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_admin_all ON customers
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) Upsert function used by intake triggers (and the edge function for
--    documentation/perf). Resolves a customer by email-or-phone, updating
--    blank fields and merging preferences shallowly.
CREATE OR REPLACE FUNCTION public.upsert_customer_for_intake(
  p_email text,
  p_phone text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_preferences jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_norm text := NULLIF(lower(trim(coalesce(p_email, ''))), '');
  v_phone_digits text := NULLIF(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  v_by_email uuid;
  v_by_phone uuid;
  v_id uuid;
BEGIN
  IF v_email_norm IS NULL AND v_phone_digits IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_email_norm IS NOT NULL THEN
    SELECT id INTO v_by_email FROM customers WHERE email_normalized = v_email_norm;
  END IF;
  IF v_phone_digits IS NOT NULL THEN
    SELECT id INTO v_by_phone FROM customers WHERE phone_digits = v_phone_digits;
  END IF;

  IF v_by_email IS NOT NULL AND v_by_phone IS NOT NULL AND v_by_email <> v_by_phone THEN
    RAISE EXCEPTION
      'Email and phone belong to different existing customers (% vs %); manual reconciliation needed',
      v_by_email, v_by_phone;
  END IF;

  v_id := COALESCE(v_by_email, v_by_phone);

  IF v_id IS NULL THEN
    INSERT INTO customers (email, phone, first_name, last_name, city, state, preferences)
    VALUES (
      p_email,
      p_phone,
      p_first_name,
      p_last_name,
      p_city,
      p_state,
      coalesce(p_preferences, '{}'::jsonb)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE customers SET
      email = COALESCE(NULLIF(trim(coalesce(p_email, '')), ''), email),
      phone = COALESCE(NULLIF(trim(coalesce(p_phone, '')), ''), phone),
      first_name = COALESCE(NULLIF(trim(coalesce(p_first_name, '')), ''), first_name),
      last_name = COALESCE(NULLIF(trim(coalesce(p_last_name, '')), ''), last_name),
      city = COALESCE(NULLIF(trim(coalesce(p_city, '')), ''), city),
      state = COALESCE(NULLIF(trim(coalesce(p_state, '')), ''), state),
      preferences = preferences || coalesce(p_preferences, '{}'::jsonb),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_customer_for_intake(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_customer_for_intake(text, text, text, text, text, text, jsonb)
  TO anon, authenticated, service_role;

-- 5) BEFORE INSERT triggers that auto-fill customer_id if missing.
CREATE OR REPLACE FUNCTION public.attach_customer_to_puppy_inquiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last text;
  v_space int;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN RETURN NEW; END IF;
  v_space := position(' ' in coalesce(NEW.name, ''));
  IF v_space > 0 THEN
    v_first := substring(NEW.name from 1 for v_space - 1);
    v_last := substring(NEW.name from v_space + 1);
  ELSE
    v_first := NEW.name;
    v_last := NULL;
  END IF;
  BEGIN
    NEW.customer_id := public.upsert_customer_for_intake(
      NEW.email, NEW.phone, v_first, v_last, NEW.city, NEW.state, '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't block the inquiry insert on a customer conflict; leave the
    -- customer_id null and let the breeder reconcile in admin.
    RAISE WARNING 'attach_customer_to_puppy_inquiry: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attach_customer_to_puppy_inquiry
  BEFORE INSERT ON puppy_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.attach_customer_to_puppy_inquiry();

CREATE OR REPLACE FUNCTION public.attach_customer_to_deposit_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first text;
  v_last text;
  v_space int;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN RETURN NEW; END IF;
  v_space := position(' ' in coalesce(NEW.customer_name, ''));
  IF v_space > 0 THEN
    v_first := substring(NEW.customer_name from 1 for v_space - 1);
    v_last := substring(NEW.customer_name from v_space + 1);
  ELSE
    v_first := NEW.customer_name;
    v_last := NULL;
  END IF;
  BEGIN
    NEW.customer_id := public.upsert_customer_for_intake(
      NEW.customer_email, NEW.customer_phone, v_first, v_last, NEW.city, NEW.state, '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'attach_customer_to_deposit_request: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attach_customer_to_deposit_request
  BEFORE INSERT ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.attach_customer_to_deposit_request();

-- 6) Backfill: take a single deterministic snapshot of (email_norm,
--    phone_digits) and create one customer row per dedup key, then link.
DO $$
DECLARE v_count integer;
BEGIN
  WITH all_intake AS (
    SELECT
      lower(trim(email)) AS email_norm,
      regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') AS phone_d,
      NULLIF(trim(email), '') AS email,
      NULLIF(trim(phone), '') AS phone,
      NULLIF(split_part(coalesce(name, ''), ' ', 1), '') AS first_name,
      NULLIF(substring(name from position(' ' in name) + 1), '') AS last_name,
      city,
      state,
      created_at
    FROM puppy_inquiries
    WHERE email IS NOT NULL OR phone IS NOT NULL
    UNION ALL
    SELECT
      lower(trim(customer_email)),
      regexp_replace(coalesce(customer_phone, ''), '[^0-9]', '', 'g'),
      NULLIF(trim(customer_email), ''),
      NULLIF(trim(customer_phone), ''),
      NULLIF(split_part(coalesce(customer_name, ''), ' ', 1), ''),
      NULLIF(substring(customer_name from position(' ' in customer_name) + 1), ''),
      city, state, created_at
    FROM deposit_requests
    WHERE customer_email IS NOT NULL OR customer_phone IS NOT NULL
  ),
  ranked AS (
    SELECT
      *,
      row_number() OVER (
        PARTITION BY coalesce(email_norm, phone_d)
        ORDER BY created_at ASC
      ) AS rn
    FROM all_intake
  )
  INSERT INTO customers (email, phone, first_name, last_name, city, state)
  SELECT email, phone, first_name, last_name, city, state
  FROM ranked
  WHERE rn = 1
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'customers backfilled (new rows): %', v_count;

  -- Link puppy_inquiries
  UPDATE puppy_inquiries pi
  SET customer_id = c.id
  FROM customers c
  WHERE pi.customer_id IS NULL
    AND (
      c.email_normalized = lower(trim(pi.email))
      OR c.phone_digits = regexp_replace(coalesce(pi.phone, ''), '[^0-9]', '', 'g')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'puppy_inquiries linked: %', v_count;

  -- Link deposit_requests
  UPDATE deposit_requests dr
  SET customer_id = c.id
  FROM customers c
  WHERE dr.customer_id IS NULL
    AND (
      c.email_normalized = lower(trim(dr.customer_email))
      OR c.phone_digits = regexp_replace(coalesce(dr.customer_phone, ''), '[^0-9]', '', 'g')
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'deposit_requests linked: %', v_count;
END $$;
