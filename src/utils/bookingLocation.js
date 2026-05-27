/** Parse "Address label (14.59950, 120.98420)" saved on with-driver bookings. */
export const parseLocationCoordinates = (location) => {
  if (!location) return null;
  const match = String(location).match(/\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)\s*$/);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

export const hasValidCoordinates = (coords) =>
  Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng);

/** Strip trailing "(lat, lng)" from stored location text. */
export const formatPickupAddressLabel = (location) => {
  if (!location) return '';
  return String(location).replace(/\s*\(-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?\)\s*$/, '').trim();
};

/**
 * Exact customer pickup pin: Supabase pickup_lat/lng first, else coords in location string.
 */
export const resolveCustomerPickupPin = (booking) => {
  if (hasValidCoordinates({ lat: booking?.pickupLat, lng: booking?.pickupLng })) {
    return {
      lat: booking.pickupLat,
      lng: booking.pickupLng,
      label: formatPickupAddressLabel(booking?.location),
    };
  }
  const parsed = parseLocationCoordinates(booking?.location);
  if (parsed) {
    return {
      ...parsed,
      label: formatPickupAddressLabel(booking?.location),
    };
  }
  return null;
};

export const formatPickupCoordinates = (pin) => {
  if (!pin) return '';
  return `${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}`;
};
