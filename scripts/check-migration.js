import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking puppies table for upcoming_litter_id...');
  const { error: puppiesError } = await supabase
    .from('puppies')
    .select('upcoming_litter_id')
    .limit(1);
    
  if (puppiesError) {
    console.error('❌ Puppies table check failed:', puppiesError.message);
  } else {
    console.log('✅ Puppies table has upcoming_litter_id column.');
  }

  console.log('\nChecking upcoming_litters table for lifecycle_status...');
  const { error: littersError } = await supabase
    .from('upcoming_litters')
    .select('lifecycle_status, date_of_birth, total_puppy_count')
    .limit(1);

  if (littersError) {
    console.error('❌ Upcoming litters check failed:', littersError.message);
  } else {
    console.log('✅ Upcoming litters table has the new lifecycle columns.');
  }

  console.log('\nChecking site_settings table...');
  const { error: settingsError } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1);

  if (settingsError) {
    console.error('❌ Site settings check failed:', settingsError.message);
  } else {
    console.log('✅ Site settings table exists.');
  }
}

check();
