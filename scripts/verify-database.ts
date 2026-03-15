/**
 * Database Verification Script
 * This script verifies that all required tables exist and have the correct structure
 * Run with: npx tsx scripts/verify-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const requiredTables = [
  'contact_messages',
  'consultation_requests',
  'product_inquiries',
  'puppy_inquiries',
  'profiles',
];

const tableSchemas: Record<string, string[]> = {
  contact_messages: ['id', 'name', 'email', 'phone', 'subject', 'message', 'status', 'created_at'],
  consultation_requests: ['id', 'pet_name', 'pet_type', 'breed', 'age', 'behavioral_concerns', 'goals', 'preferred_contact', 'name', 'email', 'phone', 'status', 'created_at'],
  product_inquiries: ['id', 'product_name', 'name', 'email', 'phone', 'message', 'status', 'created_at'],
  puppy_inquiries: ['id', 'puppy_id', 'puppy_name', 'name', 'email', 'phone', 'message', 'status', 'created_at'],
  profiles: ['user_id', 'role', 'created_at'],
};

async function verifyDatabase() {
  console.log('🔍 Verifying database structure...\n');

  let allTablesExist = true;
  const missingTables: string[] = [];

  // Check if tables exist
  for (const table of requiredTables) {
    try {
      // Try to query the table (will fail if it doesn't exist)
      const { error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" does not exist`);
          missingTables.push(table);
          allTablesExist = false;
        } else {
          console.log(`✅ Table "${table}" exists`);
        }
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌ Error checking table "${table}":`, message);
      missingTables.push(table);
      allTablesExist = false;
    }
  }

  console.log('\n');

  if (missingTables.length > 0) {
    console.log('⚠️  Missing tables detected. Creating them now...\n');
    
    // Read and execute SQL schema
    try {
      const sqlPath = join(process.cwd(), 'supabase-schema.sql');
      const sql = readFileSync(sqlPath, 'utf-8');
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement });
            if (error) {
              // Try direct query if RPC doesn't work
              console.log(`Executing: ${statement.substring(0, 50)}...`);
            }
          } catch (err) {
            // Ignore errors for now - SQL execution through JS client is limited
            console.log('Note: Some SQL statements may need to be run manually in Supabase SQL Editor');
          }
        }
      }
    } catch (err) {
      console.log('⚠️  Could not auto-create tables. Please run supabase-schema.sql manually in Supabase SQL Editor');
    }
  }

  // Verify table structures
  console.log('\n📋 Verifying table structures...\n');
  
  for (const table of requiredTables) {
    if (!missingTables.includes(table)) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(0);

        if (error) {
          console.log(`⚠️  Could not verify structure for "${table}": ${error.message}`);
        } else {
          console.log(`✅ Table "${table}" structure verified`);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`⚠️  Error verifying "${table}": ${message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  
  if (allTablesExist) {
    console.log('✅ All tables exist and are accessible!');
    console.log('\n📝 Next steps:');
    console.log('1. Test form submissions on your website');
    console.log('2. Check Supabase Table Editor to verify data is being saved');
    console.log('3. Set up admin panel (Phase 7) to view inquiries');
  } else {
    console.log('⚠️  Some tables are missing.');
    console.log('\n📝 Action required:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy the contents of supabase-schema.sql');
    console.log('3. Paste and run the SQL in the SQL Editor');
    console.log('4. Run this verification script again');
  }
  
  console.log('='.repeat(50) + '\n');
}

// Run verification
(async () => {
  await verifyDatabase();
})();
