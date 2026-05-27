import { hasValidCoordinates } from './bookingLocation';
import { resolveHubForVehicle } from './hubLocations';
import { estimateDrivingMinutes, addMinutes } from './travelTime';
import { isWithDriverRentalMode } from './rentalMode';

/** Build dispatch fields when creating a with-driver booking. */
export const buildWithDriverDispatchFields = async (vehicle, pickupPlace) => {
  if (!isWithDriverRentalMode(vehicle?.rentalMode)) return {};

  const customer = hasValidCoordinates(pickupPlace)
    ? { lat: pickupPlace.lat, lng: pickupPlace.lng }
    : null;
  if (!customer) return {};

  const hub = await resolveHubForVehicle(vehicle.location);
  if (!hub) return {};

  const minutes = await estimateDrivingMinutes(
    { lat: hub.lat, lng: hub.lng },
    customer
  );

  return {
    pickupLat: customer.lat,
    pickupLng: customer.lng,
    hubName: hub.name,
    hubLat: hub.lat,
    hubLng: hub.lng,
    estimatedArrivalMinutes: minutes,
  };
};

/** Set ETA countdown start when admin approves a with-driver booking. */
export const buildWithDriverApprovalFields = (booking) => {
  if (!isWithDriverRentalMode(booking?.rentalMode)) return {};
  const minutes = booking.estimatedArrivalMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) return {};
  const start = new Date();
  return { estimatedArrivalAt: addMinutes(start, minutes) };
};
