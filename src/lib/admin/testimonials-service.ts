import { supabase } from '../supabase-client';
import type { Testimonial } from '../testimonials-api';

export async function fetchAllTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function approveTestimonial(id: string, approved: boolean): Promise<void> {
  const { error } = await supabase
    .from('testimonials')
    .update({ is_approved: approved })
    .eq('id', id);

  if (error) throw error;
}

export async function featureTestimonial(id: string, featured: boolean): Promise<void> {
  const { error } = await supabase
    .from('testimonials')
    .update({ is_featured: featured })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTestimonial(id: string): Promise<void> {
  // Get photo path first to clean up storage
  const { data } = await supabase
    .from('testimonials')
    .select('photo_path')
    .eq('id', id)
    .single();

  if (data?.photo_path) {
    await supabase.storage.from('testimonial-photos').remove([data.photo_path]);
  }

  const { error } = await supabase
    .from('testimonials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
