/**
 * Database Setup Script
 * Uses Supabase service role key to create tables if they don't exist
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
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// SQL statements from schema file
const sqlStatements = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Puppy Inquiries Table
CREATE TABLE IF NOT EXISTS puppy_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  puppy_id TEXT,
  puppy_name TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultation Requests Table
CREATE TABLE IF NOT EXISTS consultation_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL,
  breed TEXT,
  age TEXT,
  behavioral_concerns TEXT[],
  goals TEXT,
  preferred_contact TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Inquiries Table
CREATE TABLE IF NOT EXISTS product_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_name TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Messages Table
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE puppy_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies: Allow public INSERT (form submissions)
CREATE POLICY IF NOT EXISTS "Allow public insert on puppy_inquiries"
  ON puppy_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public insert on consultation_requests"
  ON consultation_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public insert on product_inquiries"
  ON product_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public insert on contact_messages"
  ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_status ON puppy_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_puppy_inquiries_created_at ON puppy_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_created_at ON consultation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_status ON product_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_product_inquiries_created_at ON product_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
`.trim();

async function setupDatabase() {
  console.log('🔧 Setting up Supabase database tables...\n');
  
  // Read the SQL file
  let sql;
  try {
    const sqlPath = join(__dirname, '..', 'supabase-schema.sql');
    sql = readFileSync(sqlPath, 'utf-8');
  } catch (error) {
    console.log('⚠️  Could not read supabase-schema.sql, using embedded SQL');
    sql = sqlStatements;
  }

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Note: Supabase doesn't allow executing arbitrary SQL via the client
  // We need to use the SQL Editor in the dashboard
  console.log('⚠️  Supabase requires SQL to be executed via the SQL Editor');
  console.log('\n📋 Please follow these steps:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/xwudsqswlfpoljuhbphr/sql/new');
  console.log('2. Copy the SQL from: supabase-schema.sql');
  console.log('3. Paste it into the SQL Editor');
  console.log('4. Click "Run" to execute');
  console.log('\nAlternatively, you can copy this SQL:\n');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('\n');

  // Verify tables after manual setup
  console.log('💡 After running the SQL, verify with: npm run test:integrations\n');
}

setupDatabase().catch(console.error);
