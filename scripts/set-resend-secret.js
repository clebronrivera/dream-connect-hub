#!/usr/bin/env node
/**
 * Reads RESEND_API_KEY from .env.local and sets it as a Supabase Edge Function secret.
 * Run from project root. Requires: supabase CLI, supabase login, and RESEND_API_KEY in .env.local
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Prefer env var so you can run: RESEND_API_KEY=re_xxx node scripts/set-resend-secret.js
let key = process.env.RESEND_API_KEY?.trim() || null;
if (!key) {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found. Add RESEND_API_KEY=re_xxxxxxxxxxxx to .env.local (and save the file), or run: RESEND_API_KEY=re_xxx node scripts/set-resend-secret.js');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/RESEND_API_KEY\s*=\s*([^\r\n]+)/);
  key = match ? match[1].replace(/^["'\s]+|["'\s]+$/g, '').trim() : null;
}

if (!key || !key.startsWith('re_')) {
  console.error('Add your Resend API key to .env.local:');
  console.error('  RESEND_API_KEY=re_xxxxxxxxxxxx');
  process.exit(1);
}

try {
  execSync(`supabase secrets set RESEND_API_KEY=${key}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  console.log('\n✅ RESEND_API_KEY is set. Puppy inquiry notifications will use it.');
} catch (e) {
  process.exit(e.status || 1);
}
