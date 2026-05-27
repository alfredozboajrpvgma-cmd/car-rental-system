-- Run AFTER bookings-schema.sql and related migrations.
-- Requires Firebase ↔ Supabase third-party auth AND Cloud Function syncUserClaims
-- (sets JWT custom claims: role, staffType, driverId).

-- Ensure driver columns exist (from bookings-driver-columns.sql)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_name text;

-- Helpers
CREATE OR REPLACE FUNCTION public.firebase_uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(TRIM(auth.jwt() ->> 'sub'), '');
$$;

CREATE OR REPLACE FUNCTION public.jwt_claim(claim text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(TRIM(auth.jwt() ->> claim), '');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_claim('role') = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_staff_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_claim('role') IN ('admin', 'staff');
$$;

DROP FUNCTION IF EXISTS public.is_assigned_driver();

-- booking_driver_id must be passed from the policy row (driver_id column).
CREATE OR REPLACE FUNCTION public.is_assigned_driver(booking_driver_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_claim('role') = 'staff'
    AND public.jwt_claim('staffType') = 'driver'
    AND public.jwt_claim('driverId') IS NOT NULL
    AND booking_driver_id IS NOT NULL
    AND booking_driver_id = public.jwt_claim('driverId');
$$;

-- Drop permissive dev policies from bookings-schema.sql
DROP POLICY IF EXISTS "bookings_select" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete" ON public.bookings;

-- Customers: own rows only
CREATE POLICY "bookings_select_own_or_staff"
ON public.bookings FOR SELECT
TO authenticated
USING (
  public.is_staff_jwt()
  OR (public.firebase_uid() IS NOT NULL AND firebase_user_id = public.firebase_uid())
);

CREATE POLICY "bookings_insert_customer"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
  public.firebase_uid() IS NOT NULL
  AND firebase_user_id = public.firebase_uid()
  AND status = 'Pending'
);

-- Customers: cancel or reschedule approved (limited columns); staff/admin/drivers: full ops
CREATE POLICY "bookings_update"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  public.is_staff_jwt()
  OR public.is_assigned_driver(driver_id)
  OR (
    public.firebase_uid() IS NOT NULL
    AND firebase_user_id = public.firebase_uid()
  )
)
WITH CHECK (
  public.is_admin_jwt()
  OR public.is_staff_jwt()
  OR public.is_assigned_driver(driver_id)
  OR (
    public.firebase_uid() IS NOT NULL
    AND firebase_user_id = public.firebase_uid()
    AND (
      status = 'Cancelled'
      OR status IN ('Pending', 'Approved')
    )
  )
);

CREATE POLICY "bookings_delete_admin"
ON public.bookings FOR DELETE
TO authenticated
USING (public.is_admin_jwt());
