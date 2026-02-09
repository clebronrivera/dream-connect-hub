# Managing Puppies with Supabase

This guide shows you how to manage your puppies using Supabase.

## ✅ Benefits

- ✅ All data in one place (Supabase)
- ✅ Direct database access for management
- ✅ Better control and security
- ✅ Easier to add admin features later

---

## 🚀 Schema and database

The `puppies` table and related schema are created by Supabase migrations. See **`supabase/migrations/README_MIGRATION.md`** for the migration runbook. For a new environment, run migrations from the Supabase dashboard (SQL Editor) or via your deployment pipeline.

---

## 📊 Managing Puppies

### Adding New Puppies

#### Method 1: Using Supabase Table Editor (Easiest)

1. Go to Supabase Dashboard → **Table Editor**
2. Click on the `puppies` table
3. Click **"Insert row"** or **"+"** button
4. Fill in the puppy information:

**Required fields:**
- `name`: Puppy's name (e.g., "Max")
- `breed`: Breed (e.g., "Golden Retriever")

**Optional but recommended:**
- `gender`: "Male" or "Female"
- `color`: Color description
- `age_weeks`: Age in weeks
- `base_price`: Price in dollars (e.g., 1200.00)
- `final_price`: Final price after discounts
- `status`: "Available", "Pending", "Sold", or "Reserved"
- `primary_photo`: URL to main puppy photo
- `description`: Description text
- `featured`: Check this to feature the puppy prominently

5. Click **"Save"**

#### Method 2: Using SQL

```sql
INSERT INTO puppies (
  name, breed, gender, color, age_weeks,
  base_price, final_price, status, description, primary_photo
) VALUES (
  'Buddy',                    -- name
  'Labrador Retriever',       -- breed
  'Male',                     -- gender
  'Yellow',                   -- color
  10,                         -- age_weeks
  1000.00,                    -- base_price
  1000.00,                    -- final_price
  'Available',                -- status
  'Friendly and energetic!',  -- description
  'https://your-image-url.com/buddy.jpg'  -- primary_photo
);
```

### Editing Existing Puppies

1. Go to Supabase Table Editor → `puppies`
2. Click on any row to edit
3. Update the fields you want to change
4. Click **"Save"**

### Marking Puppies as Sold

1. Find the puppy in the Table Editor
2. Change the `status` field to "Sold"
3. Save

The puppy will still appear on the website but won't show as "Available"

### Deleting Puppies

1. Find the puppy in the Table Editor
2. Click the **trash icon** or right-click → Delete
3. Confirm deletion

---

## 📷 Adding Puppy Photos

The site uses whatever URL you put in `primary_photo` or `photos`. You can host images in **Supabase Storage**.

### Step 1: Create the storage bucket (one-time)

Run the puppy photos storage migration so the bucket and permissions exist:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file `supabase/migrations/20250208100000_puppy_photos_storage.sql` in this project
3. Copy the SQL and run it in the SQL Editor

This creates a public bucket `puppy-photos` and allows only admins to upload/delete.

### Option A: Upload via Supabase Dashboard

1. Go to **Storage** in the Supabase Dashboard
2. Open the **puppy-photos** bucket (create it manually with name `puppy-photos` and set to **Public** if you didn’t run the migration)
3. Upload your image(s)
4. Click the file → **Get URL** (or copy the public URL)
5. In **Table Editor** → `puppies`, set the puppy’s `primary_photo` to that URL (and optionally add more URLs to `photos`)

Example URL format:
```
https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/puppy-photos/your-file.jpg
```

### Option B: Upload from your app (admin UI)

Use the helper in code so admins can upload from the site:

```ts
import { uploadPuppyPhoto } from '@/lib/puppy-photos';

// After user selects a file (must be logged in as admin)
const { url } = await uploadPuppyPhoto(file);
// Then update the puppy row: primary_photo = url
await supabase.from('puppies').update({ primary_photo: url }).eq('id', puppyId);
```

The website already uses `primary_photo` (or the first `photos` entry) for the main image—no code changes needed once the URL is in the database.

### Option C: External image URLs

You can still use URLs from elsewhere (Unsplash, Imgur, your own server): put the URL in `primary_photo` or in the `photos` array.

### Option D: Upload local images to Supabase

If you have images in a local folder (e.g. `puppy-images/` with one folder per puppy and a `manifest.json`):

1. **List puppies** (from Supabase):
   ```bash
   npm run list:puppies
   ```
   Shows a table of name, breed, price, photo count, and first photo URL.

2. **Upload images to Supabase and update DB**:
   ```bash
   npm run upload:puppy-images
   ```
   Uploads each photo to the `puppy-photos` bucket and sets `primary_photo` and `photos` on the matching Supabase puppy row (matched by `puppy_id` in the manifest).

### How pictures stay connected to the right puppy

Everything is tied together by **`puppy_id`**:

| Step | What happens |
|------|----------------|
| **Supabase** | Each puppy row has a `puppy_id` (optional stable identifier). |
| **Upload** | Files go to Storage as `puppy-photos/{puppy_id}/photo_1.jpg`, and we update the row **where `puppy_id` = that value**. |

Keep `puppy_id` stable so uploads and Storage paths stay correct.

**Verify links:** Run `npm run verify:puppy-photos` to list each puppy, its `puppy_id`, and whether its `primary_photo` URL points to the correct Storage path for that `puppy_id`.

---

## 🎨 Puppy Table Fields Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Auto-generated unique ID |
| `puppy_id` | Text | Optional custom ID (like "PH001") |
| `name` | Text | **Required** - Puppy's name |
| `breed` | Text | **Required** - Breed name |
| `gender` | Text | "Male" or "Female" |
| `color` | Text | Color description |
| `date_of_birth` | Date | Birth date |
| `age_weeks` | Number | Age in weeks |
| `ready_date` | Date | When puppy will be ready |
| `base_price` | Number | Original price |
| `discount_active` | Boolean | Is discount active? |
| `discount_amount` | Number | Discount amount |
| `discount_note` | Text | Discount description |
| `final_price` | Number | Final price shown |
| `status` | Text | "Available", "Pending", "Sold", "Reserved" |
| `photos` | Array | Multiple photo URLs |
| `primary_photo` | Text | Main display photo URL |
| `description` | Text | Puppy description |
| `mom_weight_approx` | Number | Mother's weight (lbs) |
| `dad_weight_approx` | Number | Father's weight (lbs) |
| `vaccinations` | Text | Vaccination info |
| `health_certificate` | Boolean | Has health certificate? |
| `microchipped` | Boolean | Is microchipped? |
| `featured` | Boolean | Feature prominently? |
| `display_order` | Number | Display order (lower = first) |

---

## 🔐 Security

- ✅ Anyone can **view** puppies (public)
- ✅ Anyone can **submit inquiries** (public)
- ❌ Only **admins** can add/edit/delete puppies
- ❌ Regular users cannot modify puppy data

This is enforced by Row Level Security (RLS) policies in Supabase.

---

## 🆘 Troubleshooting

### Puppies not showing on website?

1. Check if the table exists in Supabase
2. Make sure there's at least one puppy with `status = 'Available'`
3. Check browser console for errors
4. Try hard refresh: `Cmd + Shift + R`

### Can't add puppies in Table Editor?

- Make sure you're logged into Supabase
- Check that the puppies table exists
- Try running the setup SQL again

### Images not loading?

- Make sure image URLs are valid and publicly accessible
- Use direct image URLs (ending in .jpg, .png, etc.)
- Consider using Supabase Storage for hosting images

---

## 🎯 Next Steps

1. **Add your real puppies**:
   - Replace the sample puppies with your actual inventory
   - Add real photos and descriptions

3. **Future enhancements**:
   - Admin dashboard for managing puppies (coming soon)
   - Image upload interface
   - Bulk import/export tools

---

## 📞 Need Help?

If you have questions or need help:
- Check the Supabase documentation: https://supabase.com/docs
- Review the SQL file: `supabase-puppies-table.sql`
- Contact support
