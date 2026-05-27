import { updateBooking } from './supabaseBookings';
import { releaseVehicleForCompletedBooking } from './bookings';
import { isWithDriverRentalMode } from './rentalMode';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { createNotification } from './notifications';
import { releaseDriverAfterTrip } from './driverDutySync';

export const DRIVER_ACTIVE_STATUSES = ['Pending', 'Approved', 'Active'];
export const DRIVER_HISTORY_STATUSES = ['Completed', 'Cancelled', 'No-Show'];

export const isActiveDriverBooking = (booking) =>
  DRIVER_ACTIVE_STATUSES.includes(booking?.status);

export const getActiveDriverTrip = (bookings, assignedBookingId) => {
  if (assignedBookingId) {
    const assigned = bookings.find((b) => b.docId === assignedBookingId);
    if (assigned && isActiveDriverBooking(assigned)) return assigned;
  }
  return bookings.find((b) => b.status === 'Active')
    || bookings.find((b) => b.status === 'Approved')
    || null;
};

export const saveDriverRecord = async (driver) => {
  if (!driver?.id) return;
  await setDoc(doc(db, 'drivers', driver.id), { ...driver, id: driver.id }, { merge: true });
};

export const setDriverAvailability = async (driver, status) => {
  const updated = {
    ...driver,
    status,
    ...(status === 'Available' ? { assignedBookingId: null } : {}),
  };
  await saveDriverRecord(updated);
  return updated;
};

export const TRIP_PHASES = {
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  ONBOARD: 'onboard',
  COMPLETED: 'completed',
};

export const TRIP_PHASE_LABELS = {
  en_route: 'En route',
  arrived: 'Arrived at pickup',
  onboard: 'Passenger onboard',
  completed: 'Completed',
};

export const updateTripPhase = async ({
  booking,
  phase,
  customerUserId,
  driverName,
}) => {
  if (!booking?.docId) throw new Error('Invalid booking.');
  const updates = { tripPhase: phase };
  const now = new Date();
  if (phase === TRIP_PHASES.ONBOARD) {
    updates.driverCheckInAt = now;
  }
  if (phase === TRIP_PHASES.COMPLETED) {
    updates.driverCheckOutAt = now;
  }
  await updateBooking(booking.docId, updates);

  if (customerUserId && phase === TRIP_PHASES.ARRIVED) {
    await createNotification({
      userId: customerUserId,
      title: 'Chauffeur arrived',
      message: `${driverName || 'Your chauffeur'} has arrived at the pickup point.`,
      link: '/customer/bookings',
      type: 'trip_phase',
    });
  }
  return updates;
};

export const saveHandoverNotes = async (bookingId, handoverNotes) => {
  await updateBooking(bookingId, { handoverNotes: (handoverNotes || '').trim() });
};

export const startDriverTrip = async ({ booking, driver, customerUserId }) => {
  if (!isWithDriverRentalMode(booking?.rentalMode)) {
    throw new Error('This booking is not a chauffeur trip.');
  }
  if (booking.status !== 'Approved') {
    throw new Error('Trip can only start when the booking is approved.');
  }

  await updateBooking(booking.docId, {
    status: 'Active',
    tripPhase: TRIP_PHASES.EN_ROUTE,
  });

  const updatedDriver = {
    ...driver,
    status: 'On Duty',
    assignedBookingId: booking.docId,
  };
  await saveDriverRecord(updatedDriver);

  if (customerUserId) {
    await createNotification({
      userId: customerUserId,
      title: 'Chauffeur en route',
      message: `${driver.name} has started your trip for ${booking.vehicleName}.`,
      link: '/customer/bookings',
      type: 'trip_started',
    });
  }

  return { driver: updatedDriver, status: 'Active' };
};

export const completeDriverTrip = async ({ booking, driver, customerUserId }) => {
  if (!['Active', 'Approved'].includes(booking?.status)) {
    throw new Error('Only active or approved trips can be completed.');
  }

  await updateBooking(booking.docId, {
    status: 'Completed',
    tripPhase: TRIP_PHASES.COMPLETED,
    driverCheckOutAt: new Date(),
  });
  if (booking.vehicleId) {
    try {
      await releaseVehicleForCompletedBooking(booking.vehicleId);
    } catch (syncErr) {
      console.error('Vehicle release failed:', syncErr);
      throw new Error(
        'Trip was marked completed, but the vehicle could not be set Available in the fleet. '
        + 'Ask dispatch to mark the reservation returned, or try again.'
      );
    }
  }

  const updatedDriver = await releaseDriverAfterTrip(driver, booking.docId, {
    incrementCompleted: true,
  });

  if (customerUserId) {
    await createNotification({
      userId: customerUserId,
      title: 'Trip completed',
      message: `Your chauffeur trip for ${booking.vehicleName} has been completed.`,
      link: '/customer/bookings',
      type: 'trip_completed',
    });
  }

  return { driver: updatedDriver, status: 'Completed' };
};

export const buildMapsDirectionsUrl = (lat, lng, label = '') => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const dest = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&destination_place_id=&travelmode=driving`;
};
