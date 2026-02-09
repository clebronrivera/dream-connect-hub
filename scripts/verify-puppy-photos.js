/**
 * Verify that puppy photos in Supabase are linked to the correct puppy records.
 * Run: node scripts/verify-puppy-photos.js
 *
 * Uses puppy_id as the link:
 *   - puppies.puppy_id is the stable identifier for each puppy
 *   - Download manifest stores the same puppy_id per puppy
 *   - Upload updates the row WHERE puppy_id = X and stores files at puppy-photos/{puppy_id}/
 *
 * This script fetches all puppies from Supabase and checks that primary_photo
 * URLs contain the row's puppy_id (so the image is in the right folder).
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function col(str, w) {
  return String(str).slice(0, w).padEnd(w);
}

async function main() {
  console.log('🔗 Verifying puppy records and photo links (by puppy_id)...\n');

  const { data: rows, error } = await supabase
    .from('puppies')
    .select('id, puppy_id, name, breed, primary_photo, photos')
    .order('name');

  if (error) {
    console.error('❌ Failed to fetch puppies:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No puppies in Supabase.');
    return;
  }

  const manifestPath = join(__dirname, '..', 'puppy-images', 'manifest.json');
  let manifest = null;
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  const byPuppyId = manifest ? new Map(manifest.puppies?.map((p) => [p.puppy_id, p]) || []) : null;

  const wName = Math.max(4, ...rows.map((r) => (r.name || '').length));
  const wId = Math.max(8, ...rows.map((r) => (r.puppy_id || '').length));
  const wStatus = 6;

  console.log(col('Name', wName), col('puppy_id', wId), col('Link', wStatus), 'primary_photo');
  console.log('-'.repeat(80));

  let ok = 0;
  let missing = 0;
  let mismatch = 0;

  for (const row of rows) {
    const pid = row.puppy_id || '';
    const url = row.primary_photo || '';
    // Supabase Storage URLs contain /puppy-photos/ and typically the path includes puppy_id
    const urlContainsId = url && (url.includes(`/${encodeURIComponent(pid)}/`) || url.includes(`/${pid}/`));
    const hasPhoto = url && url.length > 0;

    let status;
    if (!hasPhoto) {
      status = 'none';
      missing++;
    } else if (url.includes('supabase') && !urlContainsId) {
      status = 'other';
      mismatch++;
    } else {
      status = 'OK';
      ok++;
    }

    const expectedFromManifest = byPuppyId?.get(pid);
    const manifestNote = expectedFromManifest ? ` (manifest: ${expectedFromManifest.name})` : '';
    const urlShort = url ? (url.length > 48 ? url.slice(0, 45) + '...' : url) : '—';

    console.log(col(row.name || '—', wName), col(pid, wId), col(status, wStatus), urlShort + manifestNote);
  }

  console.log('\n' + '-'.repeat(80));
  console.log('Summary: OK = photo URL matches puppy_id path; none = no primary_photo; other = Supabase URL but path not under this puppy_id');
  console.log(`  Linked (OK): ${ok}  |  No photo: ${missing}  |  Other path: ${mismatch}`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
