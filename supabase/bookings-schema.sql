-- Run in Supabase Dashboard → SQL Editor (safe to re-run)
-- Stores rental bookings (replaces Firestore `bookings` collection)

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_user_id text NOT NULL,
  customer_name text,
  customer_email text,
  vehicle_id text NOT NULL,
  vehicle_name text,
  plate text,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  days integer NOT NULL DEFAULT 1,
  total numeric NOT NULL DEFAULT 0,
  location text,
  status text NOT NULL DEFAULT 'Pending',
  pickup_window_start timestamptz,
  pickup_window_end timestamptz,
  grace_period_ends_at timestamptz,
  no_show_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.bookings (firebase_user_id);
CREATE INDEX IF NOT EXISTS bookings_vehicle_idx ON public.bookings (vehicle_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON public.bookings (created_at DESC);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

-- App uses Firebase Auth + Supabase anon key (see supabase.js)
CREATE POLICY "bookings_select"
ON public.bookings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "bookings_insert"
ON public.bookings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "bookings_update"
ON public.bookings FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "bookings_delete"
ON public.bookings FOR DELETE
TO anon, authenticated
USING (true);
