-- Run in Supabase SQL Editor after bookings-schema.sql
-- Links drivers to bookings for dispatch

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS driver_name text;

CREATE INDEX IF NOT EXISTS bookings_driver_idx ON public.bookings (driver_id);
