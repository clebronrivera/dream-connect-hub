import { supabase } from '@/lib/supabase-client';
import type { Kit, KitItem, Product } from '@/lib/supabase';

export async function fetchAdminKit(id: string): Promise<Kit> {
  const { data, error } = await supabase.from('kits').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Kit;
}

export async function fetchKitItems(kitId: string): Promise<KitItem[]> {
  const { data, error } = await supabase
    .from('kit_items')
    .select('*')
    .eq('kit_id', kitId)
    .order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as KitItem[];
}

type KitItemInput = { item_text: string; display_order?: number };

export async function updateKit(
  id: string,
  kitPayload: Record<string, unknown>,
  rawItems: KitItemInput[]
): Promise<Kit> {
  const { data: updated, error } = await supabase
    .from('kits')
    .update(kitPayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  // Replace all kit items atomically
  await supabase.from('kit_items').delete().eq('kit_id', id);

  const itemsToInsert = rawItems
    .filter((i) => i.item_text.trim())
    .map((item, i) => ({
      kit_id: id,
      item_text: item.item_text,
      display_order: item.display_order ?? i,
    }));

  if (itemsToInsert.length > 0) {
    const { error: itemsError } = await supabase.from('kit_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
  }

  return updated as Kit;
}

export async function createKit(
  kitPayload: Record<string, unknown>,
  rawItems: KitItemInput[]
): Promise<Kit> {
  const { data: created, error } = await supabase
    .from('kits')
    .insert([kitPayload])
    .select()
    .single();
  if (error) throw error;

  const newKitId = (created as Kit).id!;

  const itemsToInsert = rawItems
    .filter((i) => i.item_text.trim())
    .map((item, i) => ({
      kit_id: newKitId,
      item_text: item.item_text,
      display_order: item.display_order ?? i,
    }));

  if (itemsToInsert.length > 0) {
    await supabase.from('kit_items').insert(itemsToInsert);
  }

  return created as Kit;
}

export async function deleteKit(id: string): Promise<void> {
  const { error } = await supabase.from('kits').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAdminProduct(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  id: string,
  payload: Record<string, unknown>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function createProduct(payload: Record<string, unknown>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}
