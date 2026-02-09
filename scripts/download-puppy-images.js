/**
 * Download all puppy photos from Airtable into puppy-images/.
 * Run: node scripts/download-puppy-images.js
 *
 * Creates:
 *   puppy-images/
 *   ├── manifest.json
 *   ├── {name}_{recordId}/
 *   │   ├── photo_1.jpg
 *   │   └── photo_2.jpg
 *   └── ...
 *
 * Requires .env.local: VITE_AIRTABLE_API_KEY, VITE_AIRTABLE_BASE_ID, VITE_AIRTABLE_TABLE_PUPPIES
 */

import dotenv from 'dotenv';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const airtableApiKey = process.env.VITE_AIRTABLE_API_KEY;
const airtableBaseId = process.env.VITE_AIRTABLE_BASE_ID;
const airtableTablePuppies = process.env.VITE_AIRTABLE_TABLE_PUPPIES || 'Available Puppies';

const OUT_DIR = join(__dirname, '..', 'puppy-images');

if (!airtableApiKey || !airtableBaseId) {
  console.error('❌ Missing .env.local: VITE_AIRTABLE_API_KEY, VITE_AIRTABLE_BASE_ID');
  process.exit(1);
}

function slug(str) {
  return String(str)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'puppy';
}

async function fetchAllRecords() {
  const allRecords = [];
  let offset = null;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTablePuppies)}`
    );
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${airtableApiKey}`, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    allRecords.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  return allRecords;
}

function photoUrls(fields) {
  const photos = fields?.Photos || [];
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => (typeof p === 'object' && p.url ? p.url : typeof p === 'string' ? p : null))
    .filter(Boolean);
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.(jpe?g|png|gif|webp)/i);
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
  } catch {
    return 'jpg';
  }
}

async function downloadTo(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log('📥 Fetching puppies from Airtable...\n');

  const records = await fetchAllRecords();
  if (records.length === 0) {
    console.log('No puppies found.');
    return;
  }

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
    console.log('📁 Created', OUT_DIR, '\n');
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'Airtable',
    baseId: airtableBaseId,
    table: airtableTablePuppies,
    puppies: [],
  };

  const col = (str, w) => String(str).slice(0, w).padEnd(w);
  const wName = Math.max(4, ...records.map((r) => (r.fields?.Name || '').length));
  const wBreed = Math.max(5, ...records.map((r) => (r.fields?.Breed || '').length));
  const wCount = 5;
  console.log(col('Name', wName), col('Breed', wBreed), col('Photos', wCount), 'Folder');
  console.log('-'.repeat(60));

  for (const rec of records) {
    const fields = rec.fields || {};
    const name = fields['Name'] || 'Unnamed';
    const breed = fields['Breed'] || '';
    const puppyId = fields['Puppy ID'] || rec.id;
    const urls = photoUrls(fields);

    const folderName = `${slug(name)}_${rec.id.replace(/^rec/, '')}`;
    const folderPath = join(OUT_DIR, folderName);

    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });

    const files = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const ext = extFromUrl(url);
      const filename = `photo_${i + 1}.${ext}`;
      const filePath = join(folderPath, filename);
      try {
        const buf = await downloadTo(url);
        writeFileSync(filePath, buf);
        files.push({ index: i + 1, filename, localPath: join(folderName, filename), url });
      } catch (e) {
        console.error(`   ⚠️  Failed to download ${filename}:`, e.message);
      }
    }

    manifest.puppies.push({
      recordId: rec.id,
      puppy_id: puppyId,
      name,
      breed,
      folder: folderName,
      photoCount: files.length,
      files,
    });

    console.log(col(name, wName), col(breed, wBreed), col(String(files.length), wCount), folderName);
  }

  const manifestPath = join(OUT_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const totalPhotos = manifest.puppies.reduce((s, p) => s + p.photoCount, 0);
  console.log('\n✅ Done:', records.length, 'puppies,', totalPhotos, 'photos');
  console.log('📄 Manifest:', manifestPath);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
