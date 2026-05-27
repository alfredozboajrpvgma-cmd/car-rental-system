-- Run in Supabase SQL Editor after bookings-driver-columns.sql
-- Live chauffeur position on the booking (customers read via their booking; admin via reservations)

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_lat double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_lng double precision;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_location_updated_at timestamptz;
