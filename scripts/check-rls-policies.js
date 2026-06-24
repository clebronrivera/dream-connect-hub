/**
 * Check RLS Policies Script
 * Checks if RLS policies exist for form submission tables
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS Policies...\n');
  
  const tables = ['contact_messages', 'puppy_inquiries', 'consultation_requests', 'product_inquiries'];

  // These tables are intentionally locked: public submissions go through a
  // captcha-gated edge function (service-role insert), so a BLOCKED direct anon
  // insert is the correct/healthy state. The others still accept a direct anon
  // insert (no edge function yet).
  const EDGE_GATED = new Set(['contact_messages', 'puppy_inquiries', 'testimonials']);

  for (const table of tables) {
    try {
      // Query pg_policies to check if policies exist
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = '${table}' AND cmd = 'INSERT';`
      }).catch(() => {
        // RPC might not exist, try direct query
        return { data: null, error: { message: 'Cannot query policies directly' } };
      });
      
      // Try alternative: attempt insert with anon key to test
      const testSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
      const testData = table === 'contact_messages' 
        ? { name: 'Test', email: 'test@test.com', subject: 'test', message: 'test' }
        : table === 'consultation_requests'
        ? { name: 'Test', email: 'test@test.com', pet_name: 'Test', pet_type: 'dog' }
        : { name: 'Test', email: 'test@test.com', message: 'test' };
      
      const { error: insertError } = await testSupabase
        .from(table)
        .insert([testData], { returning: 'minimal' });
      
      const gated = EDGE_GATED.has(table);
      if (insertError && insertError.code === '42501') {
        console.log(
          gated
            ? `✅ ${table}: direct anon insert correctly blocked (captcha-gated edge function path)`
            : `❌ ${table}: RLS policy missing or blocking inserts`
        );
      } else if (insertError) {
        console.log(`⚠️  ${table}: ${insertError.message}`);
      } else {
        console.log(
          gated
            ? `⚠️  ${table}: anon can insert directly — expected to be gated to the edge function`
            : `✅ ${table}: INSERT policy is working`
        );
        // Clean up
        try {
          await supabaseAdmin.from(table).delete().eq('email', 'test@test.com');
        } catch {}
      }
    } catch (error) {
      console.log(`⚠️  ${table}: Could not check - ${error.message}`);
    }
  }
  
  console.log('\n💡 If any policies are missing, paste supabase-schema.sql into the Supabase SQL Editor or apply migrations via `npm run db:push`.\n');
}

checkRLSPolicies().catch(console.error);
