import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchBookingsForUser as fetchBookingsForUserFromSupabase } from './supabaseBookings';

/** Stored on Firestore vehicles — only these two values. */
export const FLEET_VEHICLE_STATUSES = ['Available', 'Maintenance'];

/** Booking end states that release the vehicle back to Available in Firestore. */
const VEHICLE_STATUS_BY_BOOKING = {
  Completed: 'Available',
  Cancelled: 'Available',
  'No-Show': 'Available',
};

/** Booking statuses that hold a vehicle off the market (tracked in Supabase, not vehicle.status). */
export const RESERVATION_BOOKING_STATUSES = ['Pending', 'Approved', 'Active'];

export const normalizeFleetVehicleStatus = (status) => {
  if (status === 'Maintenance') return 'Maintenance';
  return 'Available';
};

export const isVehicleHeldByReservation = (vehicleId, reservedIds) =>
  Boolean(vehicleId && reservedIds?.has(vehicleId));

/** Fleet row locked while an active reservation exists (not by a "Rented" status). */
export const isVehicleStatusLockedByRental = (vehicle, reservedIds) => {
  const id = vehicle?.docId || vehicle?.id;
  return isVehicleHeldByReservation(id, reservedIds);
};

export const syncVehicleStatusForBooking = async (vehicleId, bookingStatus) => {
  if (!vehicleId) return;
  const vehicleStatus = VEHICLE_STATUS_BY_BOOKING[bookingStatus];
  if (!vehicleStatus) return;
  await updateDoc(doc(db, 'vehicles', vehicleId), { status: vehicleStatus });
};

/** Best-effort vehicle sync — customers cannot write Firestore vehicles; do not fail the main action. */
export const trySyncVehicleStatusForBooking = async (vehicleId, bookingStatus) => {
  try {
    await syncVehicleStatusForBooking(vehicleId, bookingStatus);
  } catch (err) {
    console.warn('Vehicle status sync skipped:', err);
  }
};

/** Persist legacy Firestore values (e.g. "Rented") as Available or Maintenance. */
export const persistFleetVehicleStatusIfLegacy = async (vehicleId, firestoreStatus) => {
  if (!vehicleId) return normalizeFleetVehicleStatus(firestoreStatus);
  const normalized = normalizeFleetVehicleStatus(firestoreStatus);
  if (firestoreStatus === normalized) return normalized;
  try {
    await updateDoc(doc(db, 'vehicles', vehicleId), { status: normalized });
  } catch (err) {
    console.warn('Legacy vehicle status cleanup skipped:', err);
  }
  return normalized;
};

/** Fleet UI: only Available or Maintenance; legacy "Rented" in DB is normalized. */
export const resolveFleetVehicleStatus = (vehicleId, firestoreStatus, reservedIds) => {
  void reservedIds;
  const normalized = normalizeFleetVehicleStatus(firestoreStatus);
  if (vehicleId && firestoreStatus !== normalized) {
    persistFleetVehicleStatusIfLegacy(vehicleId, firestoreStatus).catch(() => {});
  }
  return normalized;
};

export const TERMINAL_BOOKING_STATUSES = ['Completed', 'Cancelled', 'No-Show'];

/** Label for dropdowns (never shows "Rented" as fleet status). */
export const formatVehicleFleetStatusLabel = (vehicle, reservedIds) => {
  const id = vehicle?.id || vehicle?.docId;
  const status = resolveFleetVehicleStatus(id, vehicle?.status, reservedIds);
  if (id && reservedIds?.has(id)) {
    return `${status} · on reservation`;
  }
  return status;
};

/** After trip return — booking Completed + vehicle Available in Firestore. */
export const releaseVehicleForCompletedBooking = async (vehicleId) => {
  if (!vehicleId) return;
  await syncVehicleStatusForBooking(vehicleId, 'Completed');
};

export const formatBookingDate = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp.toDate());
};

export const formatBookingDateRange = (start, end) =>
  `${formatBookingDate(start)} – ${formatBookingDate(end)}`;

export const canCustomerCancel = (status) => status === 'Pending' || status === 'Approved';

/** Statuses that count toward customer spend on the dashboard. */
export const BOOKING_SPENT_STATUSES = ['Approved', 'Active', 'Completed'];

export const calculateCustomerTotalSpent = (bookings) =>
  bookings
    .filter((b) => BOOKING_SPENT_STATUSES.includes(b.status))
    .reduce((sum, b) => sum + (b.total || 0), 0);

const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

/** Nearest upcoming pickup from approved/pending/active bookings. */
export const getNextPickup = (bookings) => {
  const now = new Date();
  const candidates = bookings
    .filter((b) => ['Approved', 'Pending', 'Active'].includes(b.status) && b.status !== 'No-Show' && b.startDate?.toDate)
    .map((b) => ({ booking: b, pickupAt: b.startDate.toDate() }))
    .filter(({ pickupAt }) => pickupAt >= now || isSameCalendarDay(pickupAt, now))
    .sort((a, b) => a.pickupAt - b.pickupAt);

  if (candidates.length === 0) return null;

  const { pickupAt } = candidates[0];
  const isToday = isSameCalendarDay(pickupAt, now);

  return {
    display: `${pickupAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${pickupAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    isToday,
    todayLabel: isToday ? 'Today' : null,
  };
};

/** Fetches all bookings for a user from Supabase. */
export const fetchBookingsForUser = fetchBookingsForUserFromSupabase;

export const mapBookingForCustomerList = (booking) => ({
  docId: booking.docId,
  id: booking.docId.slice(0, 8).toUpperCase(),
  vehicle: booking.vehicleName,
  vehicleId: booking.vehicleId,
  vehicleName: booking.vehicleName,
  plate: booking.plate,
  location: booking.location,
  date: formatBookingDateRange(booking.startDate, booking.endDate),
  startDate: booking.startDate,
  endDate: booking.endDate,
  days: booking.days,
  daysLabel: `${booking.days} Day${booking.days > 1 ? 's' : ''}`,
  total: booking.total,
  status: booking.status,
  customerName: booking.customerName,
  rentalMode: booking.rentalMode,
  driverId: booking.driverId,
  driverName: booking.driverName,
  pickupLat: booking.pickupLat,
  pickupLng: booking.pickupLng,
  hubName: booking.hubName,
  hubLat: booking.hubLat,
  hubLng: booking.hubLng,
  estimatedArrivalMinutes: booking.estimatedArrivalMinutes,
  estimatedArrivalAt: booking.estimatedArrivalAt,
  pickupWindowStart: booking.pickupWindowStart,
  pickupWindowEnd: booking.pickupWindowEnd,
  gracePeriodEndsAt: booking.gracePeriodEndsAt,
});
