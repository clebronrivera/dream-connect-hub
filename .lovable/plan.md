

# Puppy Heaven → Multi-Service Pet Website

## Project Overview
Transform the current Puppy Heaven puppy-only website into a comprehensive pet services platform with three core sections: **Available Puppies**, **Pet Consultation**, and **Pet Essentials Shop** — all under the Puppy Heaven brand (legally owned by Dream Enterprises LLC).

**Backend:** Supabase (your existing project — set `VITE_SUPABASE_URL` in .env.local)

---

## Phase 1: Foundation & Navigation

### Site-Wide Navigation
- Responsive header with logo and navigation links:
  - Home | Available Puppies | Pet Consultation | Pet Essentials | Contact
- Mobile hamburger menu
- Consistent footer with:
  - Contact info (321-697-8864, Dreampuppies22@gmail.com)
  - Service areas (Florida & North Carolina)
  - Legal text: "© Dream Enterprises LLC. All rights reserved."

---

## Phase 2: Homepage Redesign

**Transform from puppy-only to multi-service landing page**

- **Hero Section** with welcoming headline and three prominent CTAs:
  - "Browse Puppies" → /puppies
  - "Pet Consultation" → /consultation
  - "Shop Essentials" → /essentials

- **Service Preview Cards** — visual snapshots of each offering:
  - Puppies: "Find your perfect companion"
  - Consultation: "Expert behavior guidance"
  - Essentials: "Everything your puppy needs"

- **Trust Section** — Family-operated, locations served, contact info

---

## Phase 3: Available Puppies Page

**Puppy data from Supabase**

- Dynamic puppy cards fetched from Supabase `puppies` table
- Each card displays: name, breed, gender, photo, price, availability status
- Optional breed filter for easy browsing
- "Inquire" button on each card opens inquiry form
- Inquiry submissions stored in Supabase for admin review

**Technical:** Supabase client fetches from `puppies` table (public read for Available status)

---

## Phase 4: Pet Consultation Page

**New service page for virtual behavior consultations**

- **Hero:** "Virtual Pet Behavior Consultation"
- **How It Works:** 3-step visual process
  1. Complete consultation survey
  2. Schedule 30-minute virtual session
  3. Receive personalized recommendation plan

- **Pricing Cards:**
  - Intro Offer: $25 (first session, limit one per household)
  - Regular Session: $50 per 30 minutes

- **Consultation Survey Form:**
  - Pet name, type, breed, age
  - Behavioral concerns (multi-select)
  - Goals for consultation
  - Preferred contact method
  - Form submissions saved to Supabase

- **Disclaimers:** Educational service only, not veterinary care

---

## Phase 5: Pet Essentials Page

**Catalog-style product showcase (no checkout)**

- **Hero:** "Everything Your New Puppy Needs"

- **Category Grid:**
  - Food & Nutrition
  - Bedding & Comfort
  - Toys & Play
  - Training Supplies
  - Grooming & Care
  - Feeding Accessories

- **Product Cards:**
  - Product name, description, price
  - Status badge (Available / Coming Soon / Sold Out)
  - "Contact to Order" button

- **Starter Kits Section:**
  - Essential Kit — $79.99
  - Complete Kit — $149.99
  - Premium Deluxe Kit — $229.99

- **FAQ Accordion:** Ordering process, shipping, customization, payments

- **Product Inquiries:** Form to express interest, saved to Supabase

---

## Phase 6: Contact Page

- Contact form (name, email, phone, message, subject)
- Business contact info displayed
- Service areas: Florida & North Carolina
- Form submissions stored in Supabase

---

## Phase 7: Admin Panel

**Protected dashboard for business management**

### Authentication
- Admin login with email/password via Supabase Auth
- Role-based access control (admin role stored in separate user_roles table)
- Protected routes — only authenticated admins can access

### Dashboard Sections
1. **Puppy Inquiries** — View/manage inquiries about specific puppies
2. **Consultation Requests** — View submitted survey forms with pet details
3. **Product Inquiries** — Track interest in pet essentials
4. **Contact Messages** — General contact form submissions

### Features
- Sortable/filterable tables
- Status indicators (New / Reviewed / Contacted)
- Basic stats overview (total inquiries, pending reviews)

---

## Database Schema (Supabase)

| Table | Purpose |
|-------|---------|
| `puppy_inquiries` | Store inquiries about specific puppies |
| `consultation_requests` | Store consultation survey submissions |
| `product_inquiries` | Store pet essentials interest forms |
| `contact_messages` | Store general contact submissions |
| `user_roles` | Store admin roles (security best practice) |

All tables with Row Level Security (RLS) — admins only for read access.

---

## Technical Summary

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Routing | React Router |
| Puppy Data | Supabase `puppies` table |
| Forms & Inquiries | Supabase Database |
| Authentication | Supabase Auth |
| Admin Panel | Protected routes + role-based access |

---

## Deliverables

✅ Modern, responsive multi-service homepage  
✅ Puppy listing from Supabase  
✅ New Pet Consultation page with intake survey  
✅ New Pet Essentials catalog page  
✅ Contact page with form  
✅ Secure admin panel for managing all inquiries  
✅ Mobile-responsive design throughout  
✅ Proper branding: "Puppy Heaven" (no LLC), © Dream Enterprises LLC

