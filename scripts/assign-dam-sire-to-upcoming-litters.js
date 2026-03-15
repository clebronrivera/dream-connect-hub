/**
 * Assign dam/sire pairings to existing upcoming litters (by order).
 * Use when you have upcoming litters that don't yet have dam_id/sire_id set.
 *
 * Pairings (1st litter → 1st pair, 2nd → 2nd, etc.):
 *   1. Star (Dam) and Bruno (Sire)
 *   2. Trixie (Dam) and Coco (Sire)
 *   3. Luna (Dam) and Bruno (Sire)
 *   4. Puerto (Dam) and Rico (Sire)
 *
 * Usage: node scripts/assign-dam-sire-to-upcoming-litters.js
 * Requires: .env.local with VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
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
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAIRINGS = [
  { damName: 'Star', sireName: 'Bruno' },
  { damName: 'Trixie', sireName: 'Coco' },
  { damName: 'Luna', sireName: 'Bruno' },
  { damName: 'Puerto', sireName: 'Rico' },
];

async function main() {
  const { data: dogs, error: dogsError } = await supabase
    .from('breeding_dogs')
    .select('id, name, role, breed');
  if (dogsError) {
    console.error('❌ Failed to fetch breeding_dogs:', dogsError.message);
    process.exit(1);
  }

  const byName = {};
  for (const d of dogs ?? []) {
    byName[d.name] = { id: d.id, breed: d.breed };
  }

  for (const p of PAIRINGS) {
    if (!byName[p.damName] || !byName[p.sireName]) {
      console.error(`❌ Missing breeding dog: ${p.damName} (Dam) or ${p.sireName} (Sire). Run scripts/seed-breeding-dogs-and-litters.js first.`);
      process.exit(1);
    }
  }

  const { data: litters, error: littersError } = await supabase
    .from('upcoming_litters')
    .select('id, display_breed, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (littersError) {
    console.error('❌ Failed to fetch upcoming_litters:', littersError.message);
    process.exit(1);
  }

  const toAssign = (litters ?? []).slice(0, PAIRINGS.length);
  if (toAssign.length === 0) {
    console.log('No upcoming litters found. Add litters in Admin → Upcoming Litters, then run this script again.');
    return;
  }

  console.log(`Assigning ${toAssign.length} litter(s) to dam/sire pairings...`);
  for (let i = 0; i < toAssign.length; i++) {
    const litter = toAssign[i];
    const p = PAIRINGS[i];
    const dam = byName[p.damName];
    const sire = byName[p.sireName];
    const { error } = await supabase
      .from('upcoming_litters')
      .update({
        dam_id: dam.id,
        sire_id: sire.id,
        dam_name: p.damName,
        sire_name: p.sireName,
        dam_breed: dam.breed ?? null,
        sire_breed: sire.breed ?? null,
      })
      .eq('id', litter.id);
    if (error) {
      console.error(`❌ Failed to update litter ${litter.id} (${litter.display_breed}):`, error.message);
      process.exit(1);
    }
    console.log(`  ${i + 1}. ${litter.display_breed || litter.id} → ${p.damName} (Dam) + ${p.sireName} (Sire)`);
  }
  console.log('✅ Dam/sire assignments updated.');
}

main();
