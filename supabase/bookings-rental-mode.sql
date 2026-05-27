-- Run in Supabase SQL Editor after bookings-schema.sql
-- Separates self-drive vs chauffeur (with driver) bookings

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rental_mode text NOT NULL DEFAULT 'self_drive';

CREATE INDEX IF NOT EXISTS bookings_rental_mode_idx ON public.bookings (rental_mode);
