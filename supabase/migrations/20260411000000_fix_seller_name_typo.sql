-- Fix seller name typo: yolanda_labran_rivera → yolanda_lebron_rivera
-- Safe: deposit_agreements table currently has 0 rows.

ALTER TABLE deposit_agreements
  DROP CONSTRAINT IF EXISTS deposit_agreements_authorized_seller_check;

ALTER TABLE deposit_agreements
  ADD CONSTRAINT deposit_agreements_authorized_seller_check
  CHECK (authorized_seller IN ('carlos_lebron_rivera', 'yolanda_lebron_rivera'));
