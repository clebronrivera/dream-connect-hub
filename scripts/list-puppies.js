/**
 * List all puppies from Supabase (no downloads).
 * Run: npm run list:puppies
 *
 * Requires .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('📋 Fetching puppies from Supabase...\n');

  const { data: rows, error } = await supabase
    .from('puppies')
    .select('id, puppy_id, name, breed, status, final_price, primary_photo, photos')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌', error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('No puppies found.');
    return;
  }

  const col = (str, w) => String(str).slice(0, w).padEnd(w);
  const wName = Math.max(4, ...rows.map((r) => (r.name || '').length));
  const wBreed = Math.max(5, ...rows.map((r) => (r.breed || '').length));
  const wPrice = 8;
  const photoCount = (r) => (Array.isArray(r.photos) ? r.photos.length : r.primary_photo ? 1 : 0);
  const firstUrl = (r) => {
    const url = r.primary_photo || (Array.isArray(r.photos) && r.photos[0]) || '';
    return url.length > 50 ? url.slice(0, 47) + '...' : url || '—';
  };

  console.log(col('Name', wName), col('Breed', wBreed), col('Price', wPrice), col('#Pic', 5), 'First photo URL');
  console.log('-'.repeat(wName + wBreed + wPrice + 5 + 52 + 4));

  rows.forEach((r) => {
    const priceStr = r.final_price != null ? `$${r.final_price}` : '—';
    console.log(col(r.name || '(no name)', wName), col(r.breed || '—', wBreed), col(priceStr, wPrice), col(String(photoCount(r)), 5), firstUrl(r));
  });

  const totalPhotos = rows.reduce((s, r) => s + photoCount(r), 0);
  console.log('\n✅ Total:', rows.length, 'puppies,', totalPhotos, 'photos');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
