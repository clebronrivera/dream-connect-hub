/**
 * Remove sample puppies (Max, Luna, Bella) from Supabase
 * Run this script with: node scripts/remove-sample-puppies.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🗑️  Removing sample puppies (Max, Luna, Bella)...\n');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - VITE_SUPABASE_URL');
  if (!serviceRoleKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease add these to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function removeSamplePuppies() {
  try {
    const namesToRemove = ['Max', 'Luna', 'Bella'];

    // Find puppies with these names
    const { data: puppies, error: fetchError } = await supabase
      .from('puppies')
      .select('id, name, breed')
      .in('name', namesToRemove);

    if (fetchError) {
      console.error('❌ Error fetching puppies:', fetchError.message);
      process.exit(1);
    }

    if (!puppies || puppies.length === 0) {
      console.log('ℹ️  No sample puppies found (Max, Luna, Bella)');
      return;
    }

    console.log(`📋 Found ${puppies.length} sample puppy/puppies to remove:`);
    puppies.forEach((p) => {
      console.log(`   - ${p.name} (${p.breed})`);
    });
    console.log('');

    // Delete the puppies
    const idsToDelete = puppies.map((p) => p.id);
    const { error: deleteError } = await supabase
      .from('puppies')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('❌ Error deleting puppies:', deleteError.message);
      process.exit(1);
    }

    console.log(`✅ Successfully removed ${puppies.length} sample puppy/puppies`);
    console.log('   Removed:', puppies.map((p) => p.name).join(', '));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeSamplePuppies();
