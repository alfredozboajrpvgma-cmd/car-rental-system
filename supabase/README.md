# Supabase Storage (licenses & vehicle photos)

Driver's licenses and **fleet vehicle photos** are stored in **Supabase Storage** (free tier). Firebase is still used for **Auth** and **Firestore**.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

Add to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 2. Create storage buckets

### `licenses` (driver documents)

1. **Storage** → **New bucket**
2. Name: `licenses`
3. **Public bucket**: ON (so admin can open license links from Firestore; files use hard-to-guess paths)

### `vehicle-images` (fleet photos)

1. **Storage** → **New bucket**
2. Name: `vehicle-images`
3. **Public bucket**: ON (customer fleet browse + admin thumbnails use public URLs)

## 4. Bookings table (PostgreSQL)

Bookings are stored in **Supabase**, not Firestore (fixes customer permission errors on overlap checks).

In **SQL Editor**, run in order:

1. **`bookings-schema.sql`**
2. **`bookings-rental-mode.sql`** (rental type columns)
3. **`bookings-driver-columns.sql`** (driver assignment)
4. **`bookings-dispatch.sql`** (with-driver ETA + map coordinates)
5. **`bookings-payments.sql`**, **`bookings-driver-location.sql`**, **`bookings-chauffeur-phase.sql`** as needed
6. **`bookings-rls-secure.sql`** — replaces open RLS policies (required for production)

After SQL, deploy Firebase Functions (`syncUserClaims`) and have users **sign out / sign in** so JWT custom claims refresh.

## 5. Storage policies

In **SQL Editor**, run from this folder:

1. `storage-policies.sql` (licenses)
2. `storage-policies-vehicles.sql` (fleet photos)

If uploads fail with **Upload denied / RLS** errors:

1. Confirm the bucket is named exactly **`vehicle-images`** (with a hyphen, not a space).
2. In **SQL Editor**, run **`storage-policies-vehicles.sql`** again (it is safe to re-run).
3. That script includes **anon** upload rules so it works even before Firebase ↔ Supabase auth is linked.
4. Optional: run `storage-policies-dev.sql` only if **license** uploads still fail.

## 4. Link Firebase Auth (recommended)

So Supabase treats Firebase users as `authenticated`:

1. Supabase Dashboard → **Authentication** → **Third-party auth** → add **Firebase**
2. Project ID: `car-rental-system-70ac7` (your Firebase project ID)
3. Optional but recommended: set Firebase custom claim `role: authenticated` on users  
   See [Supabase + Firebase Auth](https://supabase.com/docs/guides/auth/third-party/firebase-auth)

Without step 4, use `storage-policies-dev.sql` for development uploads.

## Free tier notes

- Supabase free tier includes **1 GB** storage and **2 GB** bandwidth/month.
- No Google Cloud / `gcloud` / CORS setup required for the app.
