/** Minimal shape for lead/consultation rows from admin leads tables. */
export interface LeadRow {
  id: string;
  created_at?: string;
  status?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}
