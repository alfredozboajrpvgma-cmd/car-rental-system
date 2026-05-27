import { updateBooking } from './supabaseBookings';
import { saveDriverRecord } from './driverTrips';
import { isWithDriverRentalMode } from './rentalMode';

/** Bookings where the chauffeur device should stream GPS to the customer/admin map. */
export const DRIVER_GPS_TRACKING_STATUSES = ['Approved', 'Active'];

export const shouldAutoTrackDriverGps = (booking) =>
  Boolean(booking?.driverId)
  && isWithDriverRentalMode(booking?.rentalMode)
  && DRIVER_GPS_TRACKING_STATUSES.includes(booking?.status);

/**
 * Persist live GPS for admin (Firestore drivers) and customers (Supabase booking row).
 */
export const syncDriverLiveLocation = async ({
  driver,
  bookingId,
  lat,
  lng,
}) => {
  if (!driver?.id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const updatedAt = Date.now();
  const updatedDriver = {
    ...driver,
    currentLat: lat,
    currentLng: lng,
    locationUpdatedAt: updatedAt,
  };

  await saveDriverRecord(updatedDriver);

  if (bookingId) {
    await updateBooking(bookingId, {
      driverLat: lat,
      driverLng: lng,
      driverLocationUpdatedAt: new Date(updatedAt),
    });
  }

  return updatedDriver;
};

export const clearDriverLiveLocation = async ({ driver, bookingId }) => {
  if (!driver?.id) return driver;

  const updatedDriver = {
    ...driver,
    currentLat: null,
    currentLng: null,
    locationUpdatedAt: null,
    status: driver.status ?? 'Available',
    assignedBookingId: driver.assignedBookingId ?? null,
    completedTrips: driver.completedTrips,
  };
  await saveDriverRecord(updatedDriver);

  if (bookingId) {
    await updateBooking(bookingId, {
      driverLat: null,
      driverLng: null,
      driverLocationUpdatedAt: null,
    });
  }

  return updatedDriver;
};
