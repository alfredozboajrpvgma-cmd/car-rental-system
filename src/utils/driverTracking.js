import { addMinutes } from './travelTime';
import { resolveCustomerPickupPin } from './bookingLocation';

const FRESH_LOCATION_MS = 2 * 60 * 1000;

const toMillis = (value) => {
  if (!value) return NaN;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
};

export const isFreshDriverLocation = (driver) => {
  const ts = toMillis(driver?.locationUpdatedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < FRESH_LOCATION_MS
    && Number.isFinite(driver.currentLat)
    && Number.isFinite(driver.currentLng);
};

/** Live GPS copied onto the Supabase booking (customer-visible). */
export const isFreshBookingDriverLocation = (booking) => {
  const ts = toMillis(booking?.driverLocationUpdatedAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < FRESH_LOCATION_MS
    && Number.isFinite(booking.driverLat)
    && Number.isFinite(booking.driverLng);
};

export const canViewDriverLiveTracking = (role) =>
  role === 'admin' || role === 'staff' || role === 'customer';

/** Linear interpolation along hub → customer for ETA-based display when GPS is stale. */
export const interpolateAlongRoute = (from, to, progress) => {
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
};

/**
 * Position on tracking map: booking GPS (customers), Firestore driver (admin), else ETA route estimate.
 */
export const getDriverDisplayPosition = (booking, driver, now = new Date()) => {
  if (isFreshBookingDriverLocation(booking)) {
    return {
      lat: booking.driverLat,
      lng: booking.driverLng,
      source: 'live',
    };
  }

  if (driver && isFreshDriverLocation(driver)) {
    return {
      lat: driver.currentLat,
      lng: driver.currentLng,
      source: 'live',
    };
  }

  const hub = Number.isFinite(booking?.hubLat) && Number.isFinite(booking?.hubLng)
    ? { lat: booking.hubLat, lng: booking.hubLng }
    : null;
  const customerPickup = resolveCustomerPickupPin(booking);
  const customer = customerPickup
    ? { lat: customerPickup.lat, lng: customerPickup.lng }
    : null;

  if (!hub || !customer) return null;

  const etaMin = booking.estimatedArrivalMinutes || 30;
  const startAt = booking.estimatedArrivalAt?.toDate?.()
    || booking.startDate?.toDate?.()
    || now;
  const endAt = addMinutes(startAt, etaMin);
  const elapsed = now.getTime() - startAt.getTime();
  const total = Math.max(endAt.getTime() - startAt.getTime(), 1);
  const progress = Math.min(1, Math.max(0, elapsed / total));

  return {
    ...interpolateAlongRoute(hub, customer, progress),
    source: 'estimated',
  };
};

export const formatDriverTrackingStatus = (booking, driver, position) => {
  if (!booking?.driverId) return 'Waiting for chauffeur assignment';
  if (!position) return 'Location unavailable';
  if (position.source === 'live') return 'Live GPS location';
  if (booking.status === 'Active') return 'Chauffeur has arrived';
  return 'Estimated position along route';
};
