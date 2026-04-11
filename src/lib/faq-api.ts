import { supabase } from './supabase-client';

export type FaqItem = {
  id: string;
  section_key: string;
  section_label: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FaqSection = {
  key: string;
  label: string;
  items: FaqItem[];
};

export async function fetchActiveFaqItems(): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .eq('is_active', true)
    .order('section_key')
    .order('display_order');

  if (error) throw error;
  return data ?? [];
}

/** Group flat FAQ items into sections, preserving order. */
export function groupFaqBySection(items: FaqItem[]): FaqSection[] {
  const map = new Map<string, FaqSection>();
  for (const item of items) {
    let section = map.get(item.section_key);
    if (!section) {
      section = { key: item.section_key, label: item.section_label, items: [] };
      map.set(item.section_key, section);
    }
    section.items.push(item);
  }
  return Array.from(map.values());
}
