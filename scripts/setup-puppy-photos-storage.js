/**
 * Setup script for puppy photos Storage bucket and policies.
 * Run with: node scripts/setup-puppy-photos-storage.js
 *
 * Requires in .env.local:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * If your project has an exec_sql RPC, the migration runs automatically.
 * Otherwise, the script creates the bucket via the Storage API and prints
 * the policy SQL for you to run once in the Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing .env.local: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const projectRef = supabaseUrl.split('//')[1].split('.')[0];
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

async function main() {
  console.log('📷 Puppy photos storage setup\n');

  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250208100000_puppy_photos_storage.sql');
  const fullSql = readFileSync(migrationPath, 'utf8');

  // 1) Try running the full migration via exec_sql RPC (if you have it)
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: fullSql });

  if (!rpcError) {
    console.log('✅ Storage bucket and policies applied via exec_sql.\n');
    console.log('Next: use the bucket "puppy-photos" for uploads and set puppies.primary_photo to the public URL.');
    return;
  }

  // 2) No exec_sql: create bucket via Storage API, then give SQL for policies
  console.log('⚠️  exec_sql RPC not available. Creating bucket via Storage API...\n');

  const { error: bucketError } = await supabase.storage.createBucket('puppy-photos', {
    public: true,
  });

  if (bucketError) {
    if (bucketError.message?.includes('already exists') || bucketError.message?.includes('Bucket already exists')) {
      console.log('✅ Bucket "puppy-photos" already exists.');
    } else {
      console.error('❌ Failed to create bucket:', bucketError.message);
      console.log('\nRun the full migration manually in the SQL Editor:\n');
      console.log(fullSql);
      console.log('\n' + '='.repeat(60));
      console.log('👉', sqlEditorUrl);
      process.exit(1);
    }
  } else {
    console.log('✅ Bucket "puppy-photos" created (public).');
  }

  console.log('\n📋 Run the following SQL once in Supabase SQL Editor to set access policies:\n');
  console.log('='.repeat(60));
  // Only the policy statements (skip the INSERT which we did via API)
  const policiesSql = fullSql
    .replace(/INSERT INTO storage\.buckets[\s\S]*?ON CONFLICT[\s\S]*?;\s*/i, '')
    .trim();
  console.log(policiesSql);
  console.log('='.repeat(60));
  console.log('\n👉', sqlEditorUrl);
  console.log('\nAfter that, use bucket "puppy-photos" for uploads and set puppies.primary_photo to the public URL.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
