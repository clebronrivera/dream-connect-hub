-- Add listing_date to puppies (day added to website)
ALTER TABLE puppies
  ADD COLUMN IF NOT EXISTS listing_date DATE;

UPDATE puppies SET listing_date = (created_at AT TIME ZONE 'UTC')::date WHERE listing_date IS NULL;

ALTER TABLE puppies
  ALTER COLUMN listing_date SET DEFAULT (CURRENT_DATE);

CREATE INDEX IF NOT EXISTS idx_puppies_listing_date ON puppies(listing_date);

COMMENT ON COLUMN puppies.listing_date IS 'Date the puppy was added to the website (for avg days listed calculation)';

-- Add admin_viewed_at to track unseen submissions
ALTER TABLE puppy_inquiries
  ADD COLUMN IF NOT EXISTS admin_viewed_at TIMESTAMPTZ;

ALTER TABLE consultation_requests
  ADD COLUMN IF NOT EXISTS admin_viewed_at TIMESTAMPTZ;

ALTER TABLE contact_messages
  ADD COLUMN IF NOT EXISTS admin_viewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_admin_viewed ON puppy_inquiries(admin_viewed_at) WHERE admin_viewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consultation_requests_admin_viewed ON consultation_requests(admin_viewed_at) WHERE admin_viewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contact_messages_admin_viewed ON contact_messages(admin_viewed_at) WHERE admin_viewed_at IS NULL;

COMMENT ON COLUMN puppy_inquiries.admin_viewed_at IS 'When admin first viewed this submission; NULL = unseen';
COMMENT ON COLUMN consultation_requests.admin_viewed_at IS 'When admin first viewed this submission; NULL = unseen';
COMMENT ON COLUMN contact_messages.admin_viewed_at IS 'When admin first viewed this submission; NULL = unseen';
