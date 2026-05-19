// src/types/pickup-handover.ts
// Wave H phase 2 (H4). Mirrors public.pickup_handovers.

export type PickupHandoverStatus = 'scheduled' | 'in_person_verified';

export type PickupBuyerIdType =
  | 'drivers_license'
  | 'passport'
  | 'state_id'
  | 'other';

export interface PickupHandover {
  id: string;
  agreement_id: string;
  handover_status: PickupHandoverStatus;
  pickup_date: string; // ISO date
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  buyer_signature_canvas?: string | null; // base64 PNG
  buyer_signature_at?: string | null;
  buyer_id_type?: PickupBuyerIdType | null;
  buyer_id_last_four?: string | null; // 4 digits
  buyer_id_state_or_country?: string | null;
  buyer_id_expiration_verified?: boolean | null;
  staff_member_initials?: string | null;
  staff_signature_at?: string | null;
  photo_buyer_with_puppy_path?: string | null;
  photo_buyer_with_id_path?: string | null;
  photo_pickup_location_path?: string | null;
  health_acknowledgment_signed_at?: string | null;
  vet_certificate_handed_over: boolean;
  vet_certificate_acknowledged_at?: string | null;
  // PR 5 simplified flow timestamps
  visual_inspection_acknowledged_at?: string | null;
  bill_of_sale_signed_at?: string | null;
  created_at: string;
  updated_at: string;
}
