// src/lib/admin/communications-service.ts
// Wave H phase 3 (H5). Admin client-side helpers for the
// agreement_communications table.
//
// All access goes through RLS — admin role gets ALL operations via
// admin_all_agreement_communications. Buyers never see this table.

import { supabase } from '@/lib/supabase-client';

export type CommunicationDirection = 'inbound' | 'outbound';
export type CommunicationChannel = 'email' | 'sms' | 'phone' | 'in_person_note';

/** Channels the operator can pick in the manual-log form. Email is
 * intentionally excluded — outbound emails are auto-logged by the
 * shared send.ts. Adding a manual "email" entry would create
 * duplicates and confuse the audit trail. */
export const MANUAL_LOG_CHANNELS: ReadonlyArray<Exclude<CommunicationChannel, 'email'>> = [
  'phone',
  'sms',
  'in_person_note',
];

export interface AgreementCommunication {
  id: string;
  agreement_id: string;
  direction: CommunicationDirection;
  channel: CommunicationChannel;
  occurred_at: string;
  summary: string;
  attachment_paths: string[] | null;
  recorded_by_user_id: string | null;
  created_at: string;
}

/** Fetch the timeline for an agreement, newest first. */
export async function fetchAgreementCommunications(
  agreementId: string
): Promise<AgreementCommunication[]> {
  const { data, error } = await supabase
    .from('agreement_communications')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AgreementCommunication[];
}

export interface ManualLogPayload {
  agreementId: string;
  direction: CommunicationDirection;
  channel: Exclude<CommunicationChannel, 'email'>;
  summary: string;
}

/** Insert a manual communication entry. recorded_by_user_id is taken
 * from the current Supabase session so attempts to log without auth
 * fail loudly. Email is rejected here on purpose — manual email entries
 * would duplicate the auto-log path in send.ts. */
export async function insertManualCommunication(
  payload: ManualLogPayload
): Promise<AgreementCommunication> {
  const trimmed = payload.summary.trim();
  if (!trimmed) {
    throw new Error('Summary is required.');
  }
  if (trimmed.length > 500) {
    throw new Error('Summary must be 500 characters or fewer.');
  }
  // Defensive — type system already excludes 'email'.
  if ((payload.channel as CommunicationChannel) === 'email') {
    throw new Error('Email entries are auto-logged. Pick another channel.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;
  if (!userId) {
    throw new Error('You must be signed in to log a communication.');
  }

  const { data, error } = await supabase
    .from('agreement_communications')
    .insert({
      agreement_id: payload.agreementId,
      direction: payload.direction,
      channel: payload.channel,
      summary: trimmed,
      recorded_by_user_id: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as AgreementCommunication;
}
