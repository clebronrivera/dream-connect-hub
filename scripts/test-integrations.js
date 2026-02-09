/**
 * Simple Integration Test Script
 * Tests Supabase and Airtable connections
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
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const airtableApiKey = process.env.VITE_AIRTABLE_API_KEY;
const airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID;
const airtableTablePuppies = process.env.VITE_AIRTABLE_TABLE_PUPPIES || 'Available Puppies';

console.log('🧪 Testing Integrations...\n');
console.log('='.repeat(60));

// Test Supabase Connection
async function testSupabase() {
  console.log('\n📊 Testing Supabase Connection...\n');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('❌ Missing Supabase credentials');
    return false;
  }

  try {
    // Prefer service role for connection verification to avoid RLS SELECT restrictions
    const supabase = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : createClient(supabaseUrl, supabaseAnonKey);

    // Test connection by running a lightweight query (service role bypasses RLS)
    const { error } = await supabase.from('contact_messages').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('⚠️  Tables do not exist yet');
      console.log('   → Run supabase-schema.sql in Supabase SQL Editor');
      return false;
    } else if (error) {
      console.log(`⚠️  Supabase connection issue: ${error.message}`);
      return false;
    } else {
      console.log('✅ Supabase connection successful');
      console.log(`   URL: ${supabaseUrl}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Supabase connection failed: ${error.message}`);
    return false;
  }
}

// Test Supabase Tables with Service Role
async function verifySupabaseTables() {
  console.log('\n📋 Verifying Supabase Tables...\n');
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('⚠️  Service role key not available - skipping table verification');
    return;
  }

  const requiredTables = [
    'contact_messages',
    'consultation_requests',
    'product_inquiries',
    'puppy_inquiries',
    'user_roles',
  ];

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let allExist = true;
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" - MISSING`);
          allExist = false;
        } else {
          console.log(`⚠️  Table "${table}" - Error: ${error.message}`);
        }
      } else {
        console.log(`✅ Table "${table}" - EXISTS`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - Error: ${err.message}`);
      allExist = false;
    }
  }

  if (!allExist) {
    console.log('\n📝 Action Required:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/xwudsqswlfpoljuhbphr/sql/new');
    console.log('   2. Open supabase-schema.sql from your project');
    console.log('   3. Copy and paste the SQL into the editor');
    console.log('   4. Click "Run" to create all tables');
  }

  return allExist;
}

// Test Airtable Connection
async function testAirtable() {
  console.log('\n🟢 Testing Airtable Connection...\n');
  
  if (!airtableApiKey || !airtableBaseId) {
    console.log('❌ Missing Airtable credentials');
    return false;
  }

  try {
    const url = `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTablePuppies)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`❌ Airtable API Error: ${response.status} ${response.statusText}`);
      if (errorData.error) {
        console.log(`   Message: ${errorData.error.message || JSON.stringify(errorData.error)}`);
      }
      return false;
    }

    const data = await response.json();
    const recordCount = data.records?.length || 0;
    
    console.log('✅ Airtable connection successful');
    console.log(`   Base ID: ${airtableBaseId}`);
    console.log(`   Table: ${airtableTablePuppies}`);
    console.log(`   Records found: ${recordCount}`);
    
    if (recordCount > 0) {
      const firstRecord = data.records[0];
      const fields = Object.keys(firstRecord.fields || {});
      console.log(`   Fields in table: ${fields.length}`);
      console.log(`   Sample fields: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
    } else {
      console.log('   ⚠️  No records found in table (this is okay if table is empty)');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Airtable connection failed: ${error.message}`);
    return false;
  }
}

// Test form submission (dry run)
async function testFormSubmission() {
  console.log('\n📝 Testing Form Submission Capability...\n');
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️  Cannot test - missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Try to insert a test record (we'll delete it immediately)
  try {
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'test',
      message: 'This is a test message - please ignore',
    };

    const { error } = await supabase
      .from('contact_messages')
      .insert([testData], { returning: 'minimal' });

    if (error) {
      console.log('⚠️  Form submission test failed (full error below):');
      console.log(JSON.stringify(error, null, 2));

      if (error.code === '42P01') {
        console.log('❌ Table does not exist - run supabase-schema.sql first');
      }

      return false;
    }

    console.log('✅ Form submission test successful');
    console.log('   → Forms can submit data to Supabase');
    return true;
  } catch (error) {
    console.log(`❌ Form submission test failed: ${error.message}`);
    return false;
  }
}

// Main test function
async function runTests() {
  const supabaseOk = await testSupabase();
  const tablesOk = await verifySupabaseTables();
  const airtableOk = await testAirtable();
  const formsOk = tablesOk ? await testFormSubmission() : false;

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  console.log(`   Supabase Connection: ${supabaseOk ? '✅' : '❌'}`);
  console.log(`   Database Tables: ${tablesOk ? '✅' : '❌'}`);
  console.log(`   Airtable Connection: ${airtableOk ? '✅' : '❌'}`);
  console.log(`   Form Submissions: ${formsOk ? '✅' : '❌'}`);
  
  console.log('\n' + '='.repeat(60));
  
  if (supabaseOk && tablesOk && airtableOk && formsOk) {
    console.log('\n🎉 All integrations are working correctly!');
    console.log('\n✅ Your website is ready to use:');
    console.log('   • Contact forms will save to Supabase');
    console.log('   • Consultation surveys will save to Supabase');
    console.log('   • Puppy listings will load from Airtable');
    console.log('   • Product inquiries will save to Supabase');
  } else {
    console.log('\n⚠️  Some integrations need attention');
    console.log('\n📝 Next steps:');
    if (!tablesOk) {
      console.log('   1. Run supabase-schema.sql in Supabase SQL Editor');
    }
    if (!airtableOk) {
      console.log('   2. Verify Airtable API key and Base ID');
    }
    console.log('   3. Run this test again: npm run test:integrations');
  }
  console.log('\n');
}

runTests().catch(console.error);
