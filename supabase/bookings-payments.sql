-- Adds payment tracking fields to public.bookings
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Unpaid',
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON public.bookings (payment_status);

