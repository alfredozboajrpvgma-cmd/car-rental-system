# Drive PH — Car Rental System

React + Vite frontend with **Firebase** (Auth + Firestore) and **Supabase Storage** (driver license uploads, free tier).

## Setup

1. Copy `.env.example` to `.env.local` and fill in Firebase + Supabase credentials.
2. `npm install`
3. `npm run dev`
4. Deploy Firestore rules (Firebase CLI):
   ```bash
   firebase login
   firebase use car-rental-system-70ac7
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Supabase Storage (license uploads)

File uploads use **Supabase** instead of Firebase Storage (no Blaze / gcloud / CORS setup).

Follow **[supabase/README.md](supabase/README.md)**:

1. Create a free Supabase project
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`
3. Create a public bucket named `licenses`
4. Run `supabase/storage-policies.sql` in the SQL Editor  
   (if uploads fail, also run `storage-policies-dev.sql`)

Optional: link Firebase as third-party auth in Supabase for stricter policies.

## First-time data

1. Register at `/register`.
2. In Firestore, set `users/{uid}.role` to `admin` or `staff`.
3. **Admin → Settings → Business** → **Seed demo data**.

### Chauffeur (driver) accounts

**Add Driver (recommended):** **Admin → Drivers → Add Driver** creates Firebase Auth + links `users/{uid}` automatically. The password is **`{first word of company name}` + 8 random characters** (from **Settings → Business**). View or reset it anytime under **Driver Profile → Portal login** (stored in Firestore `driverAuth`, staff/admin only).

**Seeded drivers (legacy):** Seed only creates Firestore records. Register manually or use Add Driver with the same email.

Deploy rules after updates: `firebase deploy --only firestore:rules`

## Features

- **Customer**: fleet, bookings, profile, license upload (PNG/JPG/PDF via Supabase)
- **Driver**: dashboard, assigned trips, live GPS, trip start/complete, profile
- **Admin/Staff**: dashboard, fleet, reservations, customers, drivers, reports, etc.
- **Security**: customer-only registration; Firestore rules; Supabase storage policies

## Scripts

- `npm run dev` — development
- `npm run build` — production build
- `npm run preview` — preview production build

## Note on payments

Payment integration is not included. Bookings store totals for reporting and receipts only.
