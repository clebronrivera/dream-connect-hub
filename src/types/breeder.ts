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
