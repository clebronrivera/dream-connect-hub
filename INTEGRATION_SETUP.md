# Integration Setup Guide

This guide will help you gather all the credentials and information needed to complete the integrations for your Puppy Heaven website.

---

## 📋 What You Need to Provide

### 1. Supabase Credentials (Required)

**What it's for:** Storing form submissions (contact, consultation, product inquiries, puppy inquiries) and admin authentication.

**Where to find it:**
1. Go to [https://supabase.com](https://supabase.com) and log in
2. Select your project: `xwudsqswlfpoljuhbphr`
3. Go to **Settings** → **API** (in the left sidebar)
4. You'll see two important values:

**What to provide:**
- ✅ **Project URL**: Found under "Project URL" (e.g., `https://xwudsqswlfpoljuhbphr.supabase.co`)
- ✅ **Anon/Public Key**: Found under "Project API keys" → "anon" or "public" key (starts with `eyJ...`)

**Example format:**
```
Supabase URL: https://xwudsqswlfpoljuhbphr.supabase.co
Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Optional (for admin panel):**
- Service Role Key: Same page, under "service_role" key (keep this secret!)

---

### 2. Airtable Credentials (Required)

**What it's for:** Fetching live puppy data to display on the Available Puppies page.

**Where to find it:**

#### Step 1: Get Your API Key
1. Go to [https://airtable.com](https://airtable.com) and log in
2. Click your profile picture (top right) → **Account**
3. Scroll down to **API** section
4. Click **Generate API key** (if you don't have one)
5. Copy the API key (starts with `pat...`)

#### Step 2: Get Your Base ID
1. Go to your Airtable workspace
2. Open the base that contains your puppy data
3. Go to [https://airtable.com/api](https://airtable.com/api)
4. Select your base from the list
5. The Base ID is shown at the top (starts with `app...`)

#### Step 3: Get Your Table Name
1. In your Airtable base, look at the table tabs at the top
2. Note the exact name of the table containing puppy data (e.g., "Puppies", "Available Puppies", "Inventory")

#### Step 4: Identify Field Names
Look at your Airtable table columns and note the exact field names for:
- Puppy name (e.g., "Name", "Puppy Name")
- Breed (e.g., "Breed", "Dog Breed")
- Gender (e.g., "Gender", "Sex")
- Photo/Image (e.g., "Photo", "Image", "Pictures")
- Price (e.g., "Price", "Cost", "Adoption Fee")
- Status/Availability (e.g., "Status", "Available", "Availability")

**What to provide:**
- ✅ **Airtable API Key**: Your personal access token
- ✅ **Base ID**: The ID of your Airtable base
- ✅ **Table Name**: Exact name of the table
- ✅ **Field Mapping**: List of field names (see example below)

**Example format:**
```
Airtable API Key: patxxxxxxxxxxxxx
Airtable Base ID: appxxxxxxxxxxxxx
Airtable Table Name: Puppies
Field Mapping:
  - Name: "Name"
  - Breed: "Breed"
  - Gender: "Gender"
  - Photo: "Photo"
  - Price: "Price"
  - Status: "Status"
```

---

### 3. Database Tables Status (Required)

**What it's for:** We need to know if Supabase tables already exist or if we need to create them.

**Where to check:**
1. Go to your Supabase project dashboard
2. Click **Table Editor** in the left sidebar
3. Check if these tables exist:
   - `puppy_inquiries`
   - `consultation_requests`
   - `product_inquiries`
   - `contact_messages`
   - `user_roles`

**What to provide:**
- ✅ **Tables Status**: Tell me if tables exist or need to be created
- ✅ **If tables exist**: Let me know if they have the correct columns (I'll provide the schema)

---

### 4. Admin Account (Optional - for later)

**What it's for:** Admin panel access to view and manage inquiries.

**What to provide (when ready):**
- ✅ **Admin Email**: Email address for admin login
- ✅ **Admin Password**: Initial password (can be changed later)

---

## 📝 Quick Checklist

Copy this checklist and fill it out:

```
[ ] Supabase Project URL: _________________________
[ ] Supabase Anon Key: _________________________
[ ] Airtable API Key: _________________________
[ ] Airtable Base ID: _________________________
[ ] Airtable Table Name: _________________________
[ ] Airtable Field Names:
    - Name: _________________________
    - Breed: _________________________
    - Gender: _________________________
    - Photo: _________________________
    - Price: _________________________
    - Status: _________________________
[ ] Supabase Tables: [ ] Exist  [ ] Need to create
[ ] Admin Email (optional): _________________________
```

---

## 🔒 Security Notes

- ⚠️ **Never commit** `.env.local` file to git (it's already in `.gitignore`)
- ⚠️ **Never share** your Service Role Key publicly
- ⚠️ **Keep** your Airtable API key private
- ✅ These credentials will be stored in `.env.local` file (local only)

---

## 🚀 After You Provide Credentials

Once you provide the information above, I will:
1. ✅ Install required packages (`@supabase/supabase-js`)
2. ✅ Create `.env.local` file with your credentials
3. ✅ Set up Supabase client configuration
4. ✅ Create database tables (if needed)
5. ✅ Connect Contact form to Supabase
6. ✅ Connect Consultation form to Supabase
7. ✅ Connect Airtable for puppy listings
8. ✅ Add product inquiry forms
9. ✅ Build admin panel (Phase 7)

---

## ❓ Need Help?

If you're stuck finding any of these:
- **Supabase**: Check their docs at [supabase.com/docs](https://supabase.com/docs)
- **Airtable**: Check their API docs at [airtable.com/api](https://airtable.com/api)
- **Can't find something?** Let me know which one and I'll provide more specific guidance!

---

## 📤 How to Provide

You can provide this information in any format:
- Copy/paste the checklist above with values filled in
- List them in a message
- Or just tell me each value one at a time

I'll set everything up once I have the credentials! 🎉
