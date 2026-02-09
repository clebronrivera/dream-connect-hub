import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xwudsqswlfpoljuhbphr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dWRzcXN3bGZwb2xqdWhicGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODg4MDAsImV4cCI6MjA4NjE2NDgwMH0.2buIbr5YHMw1dAJREDJYw8le0ww8P2KKWNPtOGVW_og';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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

// Products & Kits inventory
export type ProductCategory =
  | 'food_nutrition'
  | 'bedding_comfort'
  | 'toys_play'
  | 'training_supplies'
  | 'grooming_care'
  | 'feeding_accessories';

export type ProductStatus = 'available' | 'sold_out' | 'inactive';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  price: number;
  status: ProductStatus;
  photo: string | null;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Kit {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: ProductStatus;
  photo: string | null;
  badge: string | null;
  featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface KitItem {
  id: string;
  kit_id: string;
  item_text: string;
  product_id: string | null;
  display_order: number;
  created_at: string;
}

export interface KitWithItems extends Kit {
  kit_items: KitItem[];
}

export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
  food_nutrition: 'Food & Nutrition',
  bedding_comfort: 'Bedding & Comfort',
  toys_play: 'Toys & Play',
  training_supplies: 'Training Supplies',
  grooming_care: 'Grooming & Care',
  feeding_accessories: 'Feeding Accessories',
};

export const PRODUCT_STATUS: Record<ProductStatus, string> = {
  available: 'Available',
  sold_out: 'Sold Out',
  inactive: 'Inactive',
};
