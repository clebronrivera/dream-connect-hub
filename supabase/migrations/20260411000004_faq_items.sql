-- ============================================================================
-- FAQ ITEMS — Dynamic FAQ managed from admin dashboard
-- ============================================================================

CREATE TABLE faq_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key     text NOT NULL,
  section_label   text NOT NULL,
  question        text NOT NULL,
  answer          text NOT NULL,       -- supports markdown
  display_order   int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_faq_items
  BEFORE UPDATE ON faq_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

-- Public can read active FAQ items
CREATE POLICY public_read_active_faq ON faq_items
  FOR SELECT USING (is_active = true);

-- Admin full CRUD
CREATE POLICY admin_all_faq ON faq_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Indexes
CREATE INDEX idx_faq_items_section ON faq_items (section_key, display_order);
CREATE INDEX idx_faq_items_active ON faq_items (is_active);

-- Seed starter FAQ content across 6 sections
INSERT INTO faq_items (section_key, section_label, question, answer, display_order) VALUES
  -- Deposits
  ('deposits', 'Deposits', 'Are deposits refundable?',
   'Deposits are non-refundable. The only exception is if Dream Puppies cannot fulfill your reservation (e.g., litter loss, no suitable puppy, or breeder emergency) — in that case, you will receive a full refund within 30 days.',
   1),
  ('deposits', 'Deposits', 'How much is the deposit?',
   'The deposit is automatically calculated based on the puppy''s age:\n\n- **Before 8 weeks:** 1/4 of the purchase price\n- **After 8 weeks:** 1/3 of the purchase price\n\nThe deposit is always credited toward the final purchase price.',
   2),
  ('deposits', 'Deposits', 'Can I transfer my deposit to a different puppy?',
   'Deposit transfers are not guaranteed and are at the breeder''s sole discretion. Any transfer must be agreed upon in writing.',
   3),

  -- The Process
  ('process', 'The Process', 'What payment methods do you accept?',
   'We accept Zelle, Venmo, Cash App, Apple Pay, Square (the only option that accepts credit cards), and cash in person. Split payments between methods are also allowed — all amounts must be documented.',
   1),
  ('process', 'The Process', 'How does the purchase process work?',
   'After you express interest and availability is confirmed:\n\n1. You complete the deposit agreement\n2. We review and confirm within 48 hours\n3. You make the deposit payment\n4. We confirm the pickup date\n5. You pay the remaining balance before pickup\n6. The seller signs to finalize the sale\n\nAll payments require manual admin confirmation.',
   2),

  -- Pickup & Timing
  ('pickup', 'Pickup & Timing', 'When can I pick up my puppy?',
   'Puppies must be at least 8 weeks old (56 days) before going to their new home. Once your puppy reaches 8 weeks, you have 14 days to complete the pickup. If the deadline passes without a written extension, boarding charges may apply.',
   1),
  ('pickup', 'Pickup & Timing', 'Where can I pick up my puppy?',
   'Dream Puppies has homes in **Orlando, Florida** and **Raeford, North Carolina**. We offer free delivery within approximately 30 miles of either location. Delivery between our two locations or further distances may be arranged — contact us at (321) 697-8864 to discuss.',
   2),

  -- Food & Care
  ('food_care', 'Food & Care', 'What food should I feed my puppy?',
   'We recommend **Science Diet** or **Purina Pro Plan** puppy formulas (upper-tier lines). Your personalized Pet Guide will include a detailed feeding plan by age.',
   1),

  -- Health & Vets
  ('health', 'Health & Vets', 'Do I need to take my puppy to the vet right away?',
   'Yes. You are required to have your puppy examined by a licensed veterinarian within **72 hours** of pickup. This is part of our health warranty and protects both you and the puppy.',
   1),
  ('health', 'Health & Vets', 'What health warranty do you provide?',
   'Our Purchase Agreement includes a health warranty covering:\n\n- **Illness:** 72 hours from transfer date\n- **Genetic conditions:** 1 year from transfer date\n\nFull details are provided in the Purchase Agreement.',
   2),

  -- First Days Home
  ('first_days', 'First Days Home', 'What should I prepare before bringing my puppy home?',
   'Prepare a crate, food and water bowls, the recommended puppy food, puppy pads, a collar and leash, and age-appropriate toys. Your personalized Pet Guide will include a complete checklist tailored to your puppy''s breed.',
   1);
