/**
 * Inspect database structure by querying known tables
 * Uses service role key to bypass RLS for inspection
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey);

const tablesToInspect = [
  'puppies',
  'puppy_inquiries',
  'consultation_requests',
  'product_inquiries',
  'contact_messages',
  'profiles',
  'products',
  'kits',
  'kit_items',
];

async function inspectDatabase() {
  console.log('🔍 Inspecting Database Structure...\n');

  for (const table of tablesToInspect) {
    try {
      console.log(`📊 ${table}:`);
      
      // Get sample row to infer columns
      const { data: sample, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ⚠️  Error: ${error.message}`);
        continue;
      }
      
      if (sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`  Columns (${columns.length}):`, columns.join(', '));
        console.log(`  Sample row keys:`, columns);
      } else {
        console.log(`  ℹ️  Table exists but has no rows`);
        
        // Try to get count
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`  Count: ${count || 0} rows`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error inspecting ${table}:`, error.message);
    }
    
    console.log('');
  }

  console.log('✅ Inspection complete');
}

inspectDatabase().catch(console.error);
