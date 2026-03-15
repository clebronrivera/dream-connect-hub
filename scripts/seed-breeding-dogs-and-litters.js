/**
 * Seed breeding_dogs and upcoming_litters with verified initial data.
 * Run after applying migration 20250315000000_breeding_dogs_and_litter_relations.sql.
 *
 * Usage: node scripts/seed-breeding-dogs-and-litters.js
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

const DAMS = [
  { name: 'Star', breed: 'F1B Goldendoodle', composition: '75% Poodle, 25% Golden Retriever', color: 'Apricot' },
  { name: 'Trixie', breed: 'F1B Mini Goldendoodle', composition: '75% Poodle, 25% Golden Retriever', color: 'Apricot' },
  { name: 'Luna', breed: 'F1 Labradoodle', composition: '50% Poodle, 50% Labrador', color: 'White' },
  { name: 'Puerto', breed: 'AKC Toy Poodle', composition: '100% Poodle', color: 'Red' },
];

const SIRES = [
  { name: 'Bruno', breed: 'F1B Goldendoodle', composition: '75% Poodle, 25% Golden Retriever', color: 'Chocolate' },
  { name: 'Coco', breed: 'Miniature Poodle', composition: '100% Poodle', color: 'Red' },
  { name: 'Rico', breed: 'Toy Poodle', composition: '100% Poodle', color: 'Merle' },
];

const LITTERS = [
  { damName: 'Star', sireName: 'Bruno', breedingDate: '2026-02-27', expectedWhelpingDate: '2026-05-01', minPuppies: 8, maxPuppies: 9 },
  { damName: 'Trixie', sireName: 'Coco', breedingDate: '2026-03-01', expectedWhelpingDate: '2026-05-03', minPuppies: 6, maxPuppies: 7 },
  { damName: 'Luna', sireName: 'Bruno', breedingDate: '2026-03-05', expectedWhelpingDate: '2026-05-07', minPuppies: 8, maxPuppies: 9 },
  { damName: 'Puerto', sireName: 'Rico', breedingDate: '2026-03-12', expectedWhelpingDate: '2026-05-14', minPuppies: 6, maxPuppies: 6 },
];

async function main() {
  const dogIdsByName = {};

  // Load existing breeding dogs by name (name is unique per role in our seed set)
  const { data: existingDogs } = await supabase.from('breeding_dogs').select('id, name, role');
  for (const row of existingDogs ?? []) {
    dogIdsByName[row.name] = row.id;
  }

  // Insert missing dams
  console.log('Upserting dams...');
  for (const d of DAMS) {
    if (dogIdsByName[d.name]) continue;
    const { data, error } = await supabase
      .from('breeding_dogs')
      .insert({ name: d.name, role: 'Dam', breed: d.breed, composition: d.composition, color: d.color })
      .select('id, name')
      .single();
    if (error) {
      console.error('Failed to insert dam', d.name, error);
      process.exit(1);
    }
    dogIdsByName[d.name] = data.id;
  }

  // Insert missing sires
  console.log('Upserting sires...');
  for (const s of SIRES) {
    if (dogIdsByName[s.name]) continue;
    const { data, error } = await supabase
      .from('breeding_dogs')
      .insert({ name: s.name, role: 'Sire', breed: s.breed, composition: s.composition, color: s.color })
      .select('id, name')
      .single();
    if (error) {
      console.error('Failed to insert sire', s.name, error);
      process.exit(1);
    }
    dogIdsByName[s.name] = data.id;
  }

  // Build breed/due labels for litters (display_breed can be derived from dam/sire breeds)
  const damBreedByName = Object.fromEntries(DAMS.map((d) => [d.name, d.breed]));
  const sireBreedByName = Object.fromEntries(SIRES.map((s) => [s.name, s.breed]));
  const displayBreed = (damName, sireName) => {
    const d = damBreedByName[damName] || '';
    const s = sireBreedByName[sireName] || '';
    if (!d && !s) return 'Goldendoodle';
    if (d === s) return d;
    return `${d} x ${s}`.replace(/ x $|^ x /, '').trim() || 'Goldendoodle';
  };

  // Load existing litters (dam_id + sire_id + breeding_date) to avoid duplicates
  const { data: existingLitters } = await supabase
    .from('upcoming_litters')
    .select('dam_id, sire_id, breeding_date');
  const existingLitterKey = (damId, sireId, date) => `${damId}|${sireId}|${date}`;
  const existingKeys = new Set(
    (existingLitters ?? []).map((r) => existingLitterKey(r.dam_id, r.sire_id, r.breeding_date))
  );

  // Insert missing upcoming litters
  console.log('Upserting upcoming litters...');
  for (const l of LITTERS) {
    const damId = dogIdsByName[l.damName];
    const sireId = dogIdsByName[l.sireName];
    if (!damId || !sireId) {
      console.warn('Skipping litter (missing dam/sire):', l.damName, '/', l.sireName);
      continue;
    }
    if (existingKeys.has(existingLitterKey(damId, sireId, l.breedingDate))) continue;
    const breed = displayBreed(l.damName, l.sireName);
    const dueLabel = `Due approx. ${formatDueLabel(l.expectedWhelpingDate)}`;
    const { error } = await supabase.from('upcoming_litters').insert({
      dam_id: damId,
      sire_id: sireId,
      dam_name: l.damName,
      sire_name: l.sireName,
      dam_breed: damBreedByName[l.damName],
      sire_breed: sireBreedByName[l.sireName],
      breed,
      display_breed: breed,
      due_label: dueLabel,
      breeding_date: l.breedingDate,
      expected_whelping_date: l.expectedWhelpingDate,
      min_expected_puppies: l.minPuppies,
      max_expected_puppies: l.maxPuppies,
      deposit_amount: 0,
      is_active: true,
      sort_order: 0,
    });
    if (error) {
      console.error('Failed to insert litter', l.damName, '/', l.sireName, error);
      process.exit(1);
    }
    existingKeys.add(existingLitterKey(damId, sireId, l.breedingDate));
  }

  console.log('✅ Breeding dogs and upcoming litters seeded (missing only).');
}

function formatDueLabel(isoDate) {
  const [y, m, d] = isoDate.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  return `${months[mi]} ${day} – ${months[mi]} ${Math.min(day + 6, 31)}, ${y}`;
}

main();
