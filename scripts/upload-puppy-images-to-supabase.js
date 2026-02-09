/**
 * Upload downloaded puppy images to Supabase Storage and update puppies table.
 * Run after: node scripts/download-puppy-images.js
 *
 * Prerequisite: Puppies must already exist in Supabase with matching puppy_id
 * Puppies and puppy_id should already exist in Supabase (puppies table).
 *
 * 1. Reads puppy-images/manifest.json
 * 2. Uploads each photo to storage bucket puppy-photos/{puppy_id}/photo_N.jpg
 * 3. Updates Supabase puppies: primary_photo and photos to the new Supabase URLs
 *
 * Requires .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_DIR = join(__dirname, '..', 'puppy-images');
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const BUCKET = 'puppy-photos';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error('❌ No manifest found. Run first: node scripts/download-puppy-images.js');
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const puppies = manifest.puppies || [];
  if (puppies.length === 0) {
    console.log('No puppies in manifest.');
    return;
  }

  console.log('📤 Uploading puppy images to Supabase Storage and updating DB...\n');

  for (const entry of puppies) {
    const { puppy_id, name, folder, files } = entry;
    if (files.length === 0) {
      console.log('⏭️ ', name, '(no photos)');
      continue;
    }

    const storagePrefix = `${puppy_id}/`;
    const uploadedUrls = [];

    for (const f of files) {
      const localPath = join(OUT_DIR, f.localPath);
      if (!existsSync(localPath)) {
        console.warn('   ⚠️  Missing file:', f.localPath);
        continue;
      }

      const storagePath = storagePrefix + f.filename;
      const buf = readFileSync(localPath);
      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
        contentType: f.filename.endsWith('.png') ? 'image/png' : f.filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
        upsert: true,
      });

      if (error) {
        console.error('   ❌ Upload failed', f.filename, error.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      uploadedUrls.push(publicUrl);
    }

    if (uploadedUrls.length === 0) {
      console.log('⏭️ ', name, '(no files uploaded)');
      continue;
    }

    const primary_photo = uploadedUrls[0];
    const photos = uploadedUrls;

    const { error } = await supabase
      .from('puppies')
      .update({ primary_photo, photos })
      .eq('puppy_id', puppy_id);

    if (error) {
      console.error('   ❌ DB update failed for', puppy_id, error.message);
      continue;
    }

    console.log('✅', name, '-', uploadedUrls.length, 'photo(s) → Supabase');
  }

  console.log('\n🎉 Done. Puppies now use Supabase Storage for images.');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
