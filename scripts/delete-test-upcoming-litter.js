/**
 * Delete the "Golden Doodle test" (or similar test) upcoming litter.
 * Run after applying migration 20250317000000 (ON DELETE SET NULL) so the delete succeeds.
 *
 * Usage: node scripts/delete-test-upcoming-litter.js
 * Requires: .env.local with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: rows, error } = await supabase
    .from('upcoming_litters')
    .select('id, breed, display_breed, due_label')
    .or('breed.ilike.%test%,display_breed.ilike.%test%');

  if (error) {
    console.error('Failed to find test litters:', error);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No upcoming litter with "test" in breed or display_breed found.');
    return;
  }

  for (const row of rows) {
    const { error: delError } = await supabase.from('upcoming_litters').delete().eq('id', row.id);
    if (delError) {
      console.error('Delete failed for', row.display_breed || row.breed, delError);
      console.error('Apply migration 20250317000000_contact_messages_upcoming_litter_set_null_on_delete.sql so contact_messages no longer block the delete.');
      process.exit(1);
    }
    console.log('Deleted:', row.display_breed || row.breed, row.due_label || '');
  }
  console.log('✅ Test litter(s) removed.');
}

main();
