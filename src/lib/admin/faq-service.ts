import { supabase } from '../supabase-client';
import type { FaqItem } from '../faq-api';

export async function fetchAllFaqItems(): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('section_key')
    .order('display_order');

  if (error) throw error;
  return data ?? [];
}

export async function createFaqItem(item: Omit<FaqItem, 'id' | 'created_at' | 'updated_at'>): Promise<FaqItem> {
  const { data, error } = await supabase
    .from('faq_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFaqItem(id: string, updates: Partial<Pick<FaqItem, 'question' | 'answer' | 'section_key' | 'section_label' | 'display_order' | 'is_active'>>): Promise<FaqItem> {
  const { data, error } = await supabase
    .from('faq_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFaqItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('faq_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleFaqActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('faq_items')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) throw error;
}
