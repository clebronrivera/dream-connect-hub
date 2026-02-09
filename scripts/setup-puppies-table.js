/**
 * Setup script to create the puppies table in Supabase
 * Run this script with: npm run setup:puppies
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

console.log('🐶 Setting up Puppies table in Supabase...\n');

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

async function setupPuppiesTable() {
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'supabase-puppies-table.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📝 Reading SQL file...');
    console.log('📊 Executing SQL to create puppies table...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).select();

    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, please run the SQL manually');
      console.log('\n📋 SQL to run in Supabase SQL Editor:');
      console.log('=' .repeat(60));
      console.log(sql);
      console.log('=' .repeat(60));
      console.log('\n📍 Go to: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new');
      console.log('\nCopy the SQL above and run it in the SQL Editor\n');
      return;
    }

    console.log('✅ Puppies table created successfully!');
    console.log('✅ Sample puppies added');
    console.log('\n📊 Verifying table...');

    // Verify the table was created
    const { data: puppies, error: verifyError } = await supabase
      .from('puppies')
      .select('*')
      .limit(5);

    if (verifyError) {
      console.error('⚠️  Could not verify table:', verifyError.message);
    } else {
      console.log(`✅ Table verified! Found ${puppies?.length || 0} puppies`);
      if (puppies && puppies.length > 0) {
        console.log('\n🐶 Sample puppies:');
        puppies.forEach(p => {
          console.log(`   - ${p.name} (${p.breed}) - ${p.status} - $${p.final_price}`);
        });
      }
    }

    console.log('\n🎉 Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit http://localhost:8080/puppies to see the puppies');
    console.log('   2. Puppies are now managed in Supabase');
    console.log('   3. You can add/edit puppies directly in Supabase Table Editor');

  } catch (error) {
    console.error('❌ Error setting up puppies table:', error);
    process.exit(1);
  }
}

setupPuppiesTable();
