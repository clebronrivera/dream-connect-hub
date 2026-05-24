-- Add editable business info columns to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '(321) 697-8864',
  ADD COLUMN IF NOT EXISTS phone_raw text DEFAULT '3216978864',
  ADD COLUMN IF NOT EXISTS email text DEFAULT 'Dreampuppies22@gmail.com',
  ADD COLUMN IF NOT EXISTS locations jsonb DEFAULT '[
    {"city": "Orlando", "state": "Florida", "isPrimary": true},
    {"city": "Raeford", "state": "North Carolina", "isPrimary": false}
  ]';

COMMENT ON COLUMN public.site_settings.phone IS 'Formatted phone number (e.g., "(321) 697-8864") — editable by admin';
COMMENT ON COLUMN public.site_settings.phone_raw IS 'Unformatted phone number for tel: links (e.g., "3216978864") — editable by admin';
COMMENT ON COLUMN public.site_settings.email IS 'Primary business email — editable by admin';
COMMENT ON COLUMN public.site_settings.locations IS 'Array of locations with city, state, isPrimary — editable by admin. Schema: [{"city": "string", "state": "string", "isPrimary": boolean}, ...]';
