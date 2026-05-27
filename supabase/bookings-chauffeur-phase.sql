-- Chauffeur trip phases and handover timestamps (run in Supabase SQL editor)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS trip_phase text,
  ADD COLUMN IF NOT EXISTS driver_check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_check_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_notes text;

COMMENT ON COLUMN public.bookings.trip_phase IS 'en_route | arrived | onboard | completed';
COMMENT ON COLUMN public.bookings.driver_check_in_at IS 'Passenger picked up / trip started at customer';
COMMENT ON COLUMN public.bookings.driver_check_out_at IS 'Trip ended / vehicle returned';
