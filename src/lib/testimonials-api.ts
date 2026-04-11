import { supabase } from './supabase-client';

export type Testimonial = {
  id: string;
  customer_name: string;
  puppy_name: string | null;
  breed: string | null;
  message: string;
  photo_path: string | null;
  city: string | null;
  state: string | null;
  is_approved: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
};

export async function fetchApprovedTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_approved', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type SubmitTestimonialInput = {
  customer_name: string;
  puppy_name?: string;
  breed?: string;
  message: string;
  city?: string;
  state?: string;
  photo?: File;
};

export async function submitTestimonial(input: SubmitTestimonialInput): Promise<void> {
  let photoPath: string | null = null;

  if (input.photo) {
    const ext = input.photo.name.split('.').pop() ?? 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('testimonial-photos')
      .upload(fileName, input.photo, { cacheControl: '3600' });

    if (uploadError) throw uploadError;
    photoPath = fileName;
  }

  const { error } = await supabase.from('testimonials').insert({
    customer_name: input.customer_name,
    puppy_name: input.puppy_name || null,
    breed: input.breed || null,
    message: input.message,
    city: input.city || null,
    state: input.state || null,
    photo_path: photoPath,
  });

  if (error) throw error;
}

export function getTestimonialPhotoUrl(photoPath: string): string {
  const { data } = supabase.storage.from('testimonial-photos').getPublicUrl(photoPath);
  return data.publicUrl;
}
