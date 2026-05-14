export interface BreederSession {
  token: string;
  expiresAt: string;
}

export interface BreederSessionRow {
  id: string;
  token: string;
  device_label: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string;
  revoked_at: string | null;
}

// Row shape from the `breeder_litter_summary` Postgres view.
export interface BreederLitterSummary {
  upcoming_litter_id: string;
  breed: string | null;
  lifecycle_status: "pre_birth" | "post_birth" | "previous";
  expected_whelping_date: string | null;
  upcoming_date_of_birth: string | null;
  male_puppy_count: number | null;
  female_puppy_count: number | null;
  total_puppy_count: number | null;
  dam_name: string | null;
  dam_photo_path: string | null;
  sire_name: string | null;
  sire_photo_path: string | null;
  litter_id: string | null;
  litter_date_of_birth: string | null;
  ready_date: string | null;
  litter_base_price: number | null;
  total_puppies: number;
  puppies_missing_photos: number;
  last_puppy_update: string | null;
}
