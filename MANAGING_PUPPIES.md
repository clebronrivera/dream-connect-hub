# Managing Puppies with Supabase

This guide shows you how to manage your puppies using Supabase instead of Airtable.

## ✅ What's Changed

- **Before**: Puppies were stored in Airtable (external service)
- **After**: Puppies are now stored in Supabase (your own database)

### Benefits
- ✅ All data in one place (Supabase)
- ✅ No need for Airtable API keys
- ✅ Direct database access for management
- ✅ Better control and security
- ✅ Easier to add admin features later

---

## 🚀 Setup Instructions

### Step 1: Run the SQL to Create the Puppies Table

You have two options:

#### Option A: Automatic Setup (Recommended)
```bash
npm run setup:puppies
```

This will attempt to create the table automatically. If it doesn't work, use Option B.

#### Option B: Manual Setup
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xwudsqswlfpoljuhbphr/sql/new
2. Open the file `supabase-puppies-table.sql` in this project
3. Copy all the SQL code
4. Paste it into the Supabase SQL Editor
5. Click **"Run"** to execute

### Step 2: Verify the Table Was Created

1. Go to **Table Editor** in Supabase
2. You should see a new table called `puppies`
3. It should have 3 sample puppies (Bella, Max, Luna)

### Step 3: Test the Website

1. Make sure your dev server is running: `npm run dev`
2. Go to http://localhost:8080/puppies
3. You should see the 3 sample puppies

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

### Option 1: Use External Image URLs

If you have images hosted elsewhere (like Unsplash, Imgur, or your own server):

1. Get the direct image URL
2. Add it to the `primary_photo` field
3. For multiple photos, use the `photos` array field

### Option 2: Supabase Storage (Recommended)

1. Go to Supabase Dashboard → **Storage**
2. Create a bucket called `puppy-photos`
3. Make it public (Settings → Public bucket: ON)
4. Upload your puppy photos
5. Get the public URL for each photo
6. Add the URL to the puppy's `primary_photo` field

Example URL format:
```
https://xwudsqswlfpoljuhbphr.supabase.co/storage/v1/object/public/puppy-photos/bella-1.jpg
```

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

1. **Remove Airtable integration** (if you want):
   - You can remove the Airtable API key from `.env.local`
   - The site now uses Supabase exclusively

2. **Add your real puppies**:
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
