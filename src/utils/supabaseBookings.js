import { supabase, isSupabaseConfigured } from '../supabase';

const TABLE = 'bookings';

export const toTimestampLike = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
  };
};

export const mapRowToBooking = (row) => ({
  docId: row.id,
  id: row.id,
  userId: row.firebase_user_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  vehicleId: row.vehicle_id,
  vehicleName: row.vehicle_name,
  plate: row.plate,
  startDate: toTimestampLike(row.start_date),
  endDate: toTimestampLike(row.end_date),
  days: row.days,
  total: Number(row.total) || 0,
  location: row.location,
  status: row.status,
  rentalMode: row.rental_mode || 'self_drive',
  driverId: row.driver_id || null,
  driverName: row.driver_name || '',
  pickupWindowStart: toTimestampLike(row.pickup_window_start),
  pickupWindowEnd: toTimestampLike(row.pickup_window_end),
  gracePeriodEndsAt: toTimestampLike(row.grace_period_ends_at),
  pickupLat: row.pickup_lat != null ? Number(row.pickup_lat) : null,
  pickupLng: row.pickup_lng != null ? Number(row.pickup_lng) : null,
  hubName: row.hub_name || '',
  hubLat: row.hub_lat != null ? Number(row.hub_lat) : null,
  hubLng: row.hub_lng != null ? Number(row.hub_lng) : null,
  estimatedArrivalMinutes: row.estimated_arrival_minutes ?? null,
  estimatedArrivalAt: toTimestampLike(row.estimated_arrival_at),
  driverLat: row.driver_lat != null ? Number(row.driver_lat) : null,
  driverLng: row.driver_lng != null ? Number(row.driver_lng) : null,
  driverLocationUpdatedAt: toTimestampLike(row.driver_location_updated_at),
  noShowAt: toTimestampLike(row.no_show_at),
  paymentStatus: row.payment_status || 'Unpaid',
  paymentMethod: row.payment_method || '',
  paidAt: toTimestampLike(row.paid_at),
  tripPhase: row.trip_phase || null,
  driverCheckInAt: toTimestampLike(row.driver_check_in_at),
  driverCheckOutAt: toTimestampLike(row.driver_check_out_at),
  handoverNotes: row.handover_notes || '',
  createdAt: toTimestampLike(row.created_at),
  updatedAt: toTimestampLike(row.updated_at),
});

const toIso = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (value?.toDate) return value.toDate().toISOString();
  return new Date(value).toISOString();
};

const CAMEL_TO_COLUMN = {
  userId: 'firebase_user_id',
  customerName: 'customer_name',
  customerEmail: 'customer_email',
  vehicleId: 'vehicle_id',
  vehicleName: 'vehicle_name',
  driverId: 'driver_id',
  driverName: 'driver_name',
  rentalMode: 'rental_mode',
  startDate: 'start_date',
  endDate: 'end_date',
  pickupWindowStart: 'pickup_window_start',
  pickupWindowEnd: 'pickup_window_end',
  gracePeriodEndsAt: 'grace_period_ends_at',
  pickupLat: 'pickup_lat',
  pickupLng: 'pickup_lng',
  hubName: 'hub_name',
  hubLat: 'hub_lat',
  hubLng: 'hub_lng',
  estimatedArrivalMinutes: 'estimated_arrival_minutes',
  estimatedArrivalAt: 'estimated_arrival_at',
  driverLat: 'driver_lat',
  driverLng: 'driver_lng',
  driverLocationUpdatedAt: 'driver_location_updated_at',
  noShowAt: 'no_show_at',
  paymentStatus: 'payment_status',
  paymentMethod: 'payment_method',
  paidAt: 'paid_at',
  tripPhase: 'trip_phase',
  driverCheckInAt: 'driver_check_in_at',
  driverCheckOutAt: 'driver_check_out_at',
  handoverNotes: 'handover_notes',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const DATE_FIELDS = new Set([
  'startDate',
  'endDate',
  'pickupWindowStart',
  'pickupWindowEnd',
  'gracePeriodEndsAt',
  'estimatedArrivalAt',
  'driverLocationUpdatedAt',
  'noShowAt',
  'paidAt',
  'driverCheckInAt',
  'driverCheckOutAt',
  'createdAt',
  'updatedAt',
]);

export const mapUpdatesToRow = (updates) => {
  const row = { updated_at: new Date().toISOString() };
  Object.entries(updates).forEach(([key, value]) => {
    const column = CAMEL_TO_COLUMN[key] || key;
    row[column] = DATE_FIELDS.has(key) ? toIso(value) : value;
  });
  return row;
};

const assertSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then run supabase/bookings-schema.sql'
    );
  }
};

const sortByCreatedDesc = (rows) =>
  [...rows].sort(
    (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
  );

export const fetchAllBookings = async () => {
  assertSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return sortByCreatedDesc((data || []).map(mapRowToBooking));
};

export const fetchBookingsForUser = async (userId) => {
  assertSupabase();
  if (!userId) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('firebase_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return sortByCreatedDesc((data || []).map(mapRowToBooking));
};

export const fetchBookingsByDriverId = async (driverId) => {
  assertSupabase();
  if (!driverId) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return sortByCreatedDesc((data || []).map(mapRowToBooking));
};

export const fetchBookingById = async (bookingId) => {
  assertSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRowToBooking(data) : null;
};

export const fetchActiveBookingsForVehicle = async (vehicleId) => {
  assertSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('vehicle_id', vehicleId)
    .in('status', ['Pending', 'Approved', 'Active']);

  if (error) throw error;
  return (data || []).map(mapRowToBooking);
};

export const fetchBookingsByStatus = async (status) => {
  assertSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', status);

  if (error) throw error;
  return (data || []).map(mapRowToBooking);
};

/** Vehicles held by pending, approved, or active bookings. */
export const fetchVehicleReservationMap = async () => {
  assertSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('vehicle_id, status')
    .in('status', ['Pending', 'Approved', 'Active']);

  if (error) throw error;

  const reserved = new Set();
  const pending = new Set();
  (data || []).forEach((row) => {
    if (!row.vehicle_id) return;
    reserved.add(row.vehicle_id);
    if (row.status === 'Pending') pending.add(row.vehicle_id);
  });

  return { reserved, pending };
};

const overlaps = (start, end, bStart, bEnd) =>
  (start >= bStart && start <= bEnd)
  || (end >= bStart && end <= bEnd)
  || (start <= bStart && end >= bEnd);

export const isVehicleAvailable = async (vehicleId, startDate, endDate) => {
  const bookings = await fetchActiveBookingsForVehicle(vehicleId);
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  return !bookings.some((b) => {
    const bStart = b.startDate?.toDate?.();
    const bEnd = b.endDate?.toDate?.();
    if (!bStart || !bEnd) return false;
    return overlaps(start, end, bStart, bEnd);
  });
};

export const createBooking = async ({
  userId,
  customerName,
  customerEmail,
  vehicleId,
  vehicleName,
  plate,
  startDate,
  endDate,
  days,
  total,
  location,
  status = 'Pending',
  rentalMode = 'self_drive',
  pickupLat = null,
  pickupLng = null,
  hubName = null,
  hubLat = null,
  hubLng = null,
  estimatedArrivalMinutes = null,
  estimatedArrivalAt = null,
  paymentStatus = 'Unpaid',
  paymentMethod = null,
  paidAt = null,
}) => {
  assertSupabase();

  const row = {
    firebase_user_id: userId,
    customer_name: customerName,
    customer_email: customerEmail,
    vehicle_id: vehicleId,
    vehicle_name: vehicleName,
    plate,
    start_date: toIso(startDate),
    end_date: toIso(endDate),
    days,
    total,
    location,
    status,
    rental_mode: rentalMode,
    payment_status: paymentStatus,
    created_at: new Date().toISOString(),
  };

  if (pickupLat != null) row.pickup_lat = pickupLat;
  if (pickupLng != null) row.pickup_lng = pickupLng;
  if (hubName) row.hub_name = hubName;
  if (hubLat != null) row.hub_lat = hubLat;
  if (hubLng != null) row.hub_lng = hubLng;
  if (estimatedArrivalMinutes != null) row.estimated_arrival_minutes = estimatedArrivalMinutes;
  if (estimatedArrivalAt) row.estimated_arrival_at = toIso(estimatedArrivalAt);
  if (paymentMethod) row.payment_method = paymentMethod;
  if (paidAt) row.paid_at = toIso(paidAt);

  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) throw error;
  return mapRowToBooking(data);
};

export const updateBooking = async (bookingId, updates) => {
  assertSupabase();
  if (!bookingId) {
    throw new Error('Booking ID is missing.');
  }
  const row = mapUpdatesToRow(updates);

  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq('id', bookingId)
    .select('*');

  if (error) throw error;
  if (!data?.length) {
    throw new Error('Booking not found or could not be updated.');
  }
  return mapRowToBooking(data[0]);
};

export const getBookingErrorMessage = (err) => {
  const msg = err?.message || String(err);
  if (msg.includes('Supabase is not configured')) return msg;
  if (msg.includes('relation') && msg.includes('bookings')) {
    return 'Bookings table missing. Run supabase/bookings-schema.sql in Supabase SQL Editor.';
  }
  if (msg.includes('row-level security') || msg.includes('policy') || err?.code === '42501') {
    return 'Permission denied on bookings. Run supabase/bookings-rls-secure.sql, deploy Cloud Functions (syncUserClaims), then sign out and sign in again.';
  }
  if (msg.includes('rental_mode') || msg.includes('column')) {
    return 'Database is missing rental columns. Run supabase/bookings-rental-mode.sql in Supabase SQL Editor.';
  }
  if (msg.includes('pickup_lat') || msg.includes('estimated_arrival')) {
    return 'Database is missing dispatch columns. Run supabase/bookings-dispatch.sql in Supabase SQL Editor.';
  }
  if (msg.includes('driver_lat') || msg.includes('driver_location_updated')) {
    return 'Database is missing driver location columns. Run supabase/bookings-driver-location.sql in Supabase SQL Editor.';
  }
  if (
    msg.includes('Missing or insufficient permissions')
    || msg.includes('permission-denied')
    || err?.code === 'permission-denied'
  ) {
    return 'Permission denied while finishing your booking. Deploy the latest firestore.rules, then try again.';
  }
  return msg || 'Booking failed. Please try again.';
};
