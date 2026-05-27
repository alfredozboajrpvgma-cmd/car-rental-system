-- Run in Supabase SQL Editor after bookings-rental-mode.sql
-- With-driver dispatch: customer pin, hub origin, ETA (no pickup grace window)

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lat double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS pickup_lng double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hub_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hub_lat double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hub_lng double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS estimated_arrival_minutes integer;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS estimated_arrival_at timestamptz;
