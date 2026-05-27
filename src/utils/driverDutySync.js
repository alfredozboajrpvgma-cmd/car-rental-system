import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchBookingsByDriverId } from './supabaseBookings';
import {
  saveDriverRecord,
  isActiveDriverBooking,
  getActiveDriverTrip,
} from './driverTrips';
import { clearDriverLiveLocation } from './driverLocationSync';

/** True if this chauffeur still has a Pending / Approved / Active booking. */
export const driverHasActiveBooking = (bookings, assignedBookingId) => {
  if (!bookings?.length) return false;

  if (assignedBookingId) {
    const assigned = bookings.find((b) => b.docId === assignedBookingId);
    if (assigned && isActiveDriverBooking(assigned)) return true;
  }

  return bookings.some(isActiveDriverBooking);
};

/**
 * Set driver Available and clear assignment after a trip ends (unless Off Duty).
 */
export const releaseDriverAfterTrip = async (driver, bookingId, { incrementCompleted = false } = {}) => {
  if (!driver?.id) return driver;

  const released = {
    ...driver,
    status: driver.status === 'Off Duty' ? 'Off Duty' : 'Available',
    assignedBookingId: null,
    completedTrips: incrementCompleted
      ? (driver.completedTrips ?? 0) + 1
      : (driver.completedTrips ?? 0),
  };

  await saveDriverRecord(released);
  if (bookingId) {
    await clearDriverLiveLocation({ driver: released, bookingId });
  }
  return released;
};

export const releaseDriverAfterBookingById = async (
  driverId,
  bookingId,
  options = {}
) => {
  if (!driverId) return null;
  const snap = await getDoc(doc(db, 'drivers', driverId));
  if (!snap.exists()) return null;
  const driver = { id: snap.id, ...snap.data() };
  return releaseDriverAfterTrip(driver, bookingId, options);
};

/**
 * Align Firestore driver status with Supabase bookings (fixes stale On Duty).
 */
export const reconcileDriverDutyStatus = async (driver, bookingsOptional = null) => {
  if (!driver?.id) return driver;
  if (driver.status === 'Off Duty') return driver;

  const bookings = bookingsOptional ?? await fetchBookingsByDriverId(driver.id);
  const hasActive = driverHasActiveBooking(bookings, driver.assignedBookingId);

  if (!hasActive) {
    if (driver.status === 'On Duty' || driver.assignedBookingId) {
      const released = {
        ...driver,
        status: 'Available',
        assignedBookingId: null,
      };
      await saveDriverRecord(released);
      return released;
    }
    return driver;
  }

  const trip = getActiveDriverTrip(bookings, driver.assignedBookingId);
  if (trip && (driver.status !== 'On Duty' || driver.assignedBookingId !== trip.docId)) {
    const synced = {
      ...driver,
      status: 'On Duty',
      assignedBookingId: trip.docId,
    };
    await saveDriverRecord(synced);
    return synced;
  }

  return driver;
};

/** Fix all chauffeurs stuck On Duty without an active booking (admin page). */
export const reconcileStaleOnDutyDrivers = async (drivers) => {
  const candidates = drivers.filter(
    (d) => d.status !== 'Off Duty' && (d.status === 'On Duty' || d.assignedBookingId)
  );
  const results = await Promise.all(
    candidates.map((d) => reconcileDriverDutyStatus(d).catch((err) => {
      console.error(`Duty sync failed for ${d.id}:`, err);
      return d;
    }))
  );
  return results;
};
