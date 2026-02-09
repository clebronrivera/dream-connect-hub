/**
 * Fix RLS Policies Script
 * Applies the RLS policy fixes to allow form submissions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Read the SQL fix file
const sqlPath = join(__dirname, '..', 'fix-rls-policies.sql');
let sql;
try {
  sql = readFileSync(sqlPath, 'utf-8');
} catch (error) {
  console.error(`❌ Could not read ${sqlPath}`);
  process.exit(1);
}

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS Policies...\n');
  console.log('='.repeat(60));
  
  // Extract the project ID from the Supabase URL
  const projectId = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectId) {
    console.error('❌ Could not extract project ID from Supabase URL');
    process.exit(1);
  }

  console.log(`\n📋 Project ID: ${projectId}`);
  console.log(`📝 SQL File: ${sqlPath}\n`);

  // Since Supabase doesn't allow executing arbitrary SQL via the client,
  // we need to use the Supabase Management API or SQL Editor
  // Let's try using the Management API to execute SQL
  
  try {
    // Test current state first
    console.log('🧪 Testing if form submissions work...\n');
    
    const testSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    
    const testData = {
      name: 'RLS Test',
      email: 'rls-test@example.com',
      subject: 'test',
      message: 'Testing RLS policies - this should be deleted',
    };

    const { error: testError } = await testSupabase
      .from('contact_messages')
      .insert([testData], { returning: 'minimal' });

    if (testError) {
      if (testError.code === '42501') {
        console.log('❌ RLS policies are blocking inserts');
        console.log('\n📋 To fix this, please follow these steps:\n');
        console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
        console.log('2. Copy the SQL below and paste it into the SQL Editor');
        console.log('3. Click "Run" to execute');
        console.log('\n' + '─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60) + '\n');
      } else {
        console.log(`⚠️  Test insert failed: ${testError.message}`);
        console.log('\n📋 Please run the SQL from fix-rls-policies.sql in Supabase SQL Editor\n');
      }
    } else {
      console.log('✅ RLS policies are working!');
      console.log('   → Form submissions should work now\n');
      
      // Clean up test record
      try {
        await supabaseAdmin
          .from('contact_messages')
          .delete()
          .eq('email', 'rls-test@example.com');
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    console.log('💡 After running the SQL, verify with: npm run test:integrations\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run the SQL manually:\n');
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId}/sql/new`);
    console.log('2. Copy and paste the SQL from fix-rls-policies.sql');
    console.log('3. Click "Run"\n');
  }
}

fixRLSPolicies().catch(console.error);
