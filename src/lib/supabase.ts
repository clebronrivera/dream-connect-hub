import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Submission status (v1): active | inactive only
export type SubmissionStatus = 'active' | 'inactive';

// intake_payload keys per consultation type (Decisions Locked In)
export type StarterIntakePayload = { help_topics: string[]; notes?: string };
export type ReadinessIntakePayload = {
  why_now?: string;
  primary_caregiver?: string;
  weekday_schedule?: string;
  budget_upfront?: string;
  budget_monthly?: string;
  preferred_breed_size?: string;
  other_pets_kids?: string;
};
export type BehaviorIntakePayload = {
  primary_issue?: string;
  secondary_issue?: string;
  issues_checklist?: string[];
  context_notes?: string;
};
export type IntakePayload = StarterIntakePayload | ReadinessIntakePayload | BehaviorIntakePayload;

export type ConsultationType = 'starter' | 'readiness' | 'behavior';
export type SourcePage =
  | 'consultation_pricing_card_starter'
  | 'consultation_pricing_card_readiness'
  | 'consultation_pricing_card_behavior'
  | 'direct';

export interface PuppyInquiry {
  id?: string;
  created_at?: string;
  status?: SubmissionStatus;
  admin_notes?: string;
  assigned_to?: string;
  needs_followup?: boolean;
  name: string;
  email: string;
  phone?: string;
  city: string;
  state: string;
  interested_specific?: boolean;
  puppy_id?: string | null;
  puppy_name?: string;
  timeline?: string;
  experience?: string;
  household_description?: string;
  preferences?: Record<string, unknown>;
  additional_comments?: string;
  puppy_name_at_submit?: string;
  puppy_status_at_submit?: string;
}

export interface ConsultationRequest {
  id?: string;
  created_at?: string;
  status?: SubmissionStatus;
  admin_notes?: string;
  assigned_to?: string;
  consultation_type?: ConsultationType;
  source_page?: SourcePage;
  name: string;
  email: string;
  phone?: string;
  pet_name?: string;
  pet_type?: string;
  breed?: string;
  age?: string;
  preferred_contact?: string;
  purchased_from_puppy_heaven?: boolean;
  purchase_date_approx?: string;
  puppy_name_at_purchase?: string;
  breed_at_purchase?: string;
  phone_at_purchase?: string;
  intake_payload?: IntakePayload;
}

export interface ProductInquiry {
  id?: string;
  product_name?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status?: 'new' | 'reviewed' | 'contacted';
  created_at?: string;
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status?: SubmissionStatus;
  admin_notes?: string;
  created_at?: string;
}

export interface Puppy {
  id?: string;
  puppy_id?: string;
  name: string;
  breed: string;
  gender?: 'Male' | 'Female';
  color?: string;
  date_of_birth?: string;
  age_weeks?: number;
  ready_date?: string;
  base_price?: number;
  discount_active?: boolean;
  discount_amount?: number;
  discount_note?: string;
  final_price?: number;
  status?: 'Available' | 'Pending' | 'Sold' | 'Reserved';
  photos?: string[];
  primary_photo?: string;
  description?: string;
  mom_weight_approx?: number;
  dad_weight_approx?: number;
  vaccinations?: string;
  health_certificate?: boolean;
  microchipped?: boolean;
  featured?: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}
