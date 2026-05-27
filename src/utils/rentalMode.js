export const RENTAL_MODES = {
  SELF_DRIVE: 'self_drive',
  WITH_DRIVER: 'with_driver',
};

export const RENTAL_MODE_OPTIONS = [
  { value: RENTAL_MODES.SELF_DRIVE, label: 'Self Drive' },
  { value: RENTAL_MODES.WITH_DRIVER, label: 'With Driver' },
];

export const normalizeRentalMode = (mode) => {
  const value = String(mode ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
  if (value === RENTAL_MODES.WITH_DRIVER || value === 'withdriver') {
    return RENTAL_MODES.WITH_DRIVER;
  }
  return RENTAL_MODES.SELF_DRIVE;
};

export const isWithDriverRentalMode = (mode) =>
  normalizeRentalMode(mode) === RENTAL_MODES.WITH_DRIVER;

/** True when the booking or its fleet vehicle is chauffeur / with-driver. */
export const bookingRequiresDriver = (booking, vehicleRentalMode) =>
  isWithDriverRentalMode(booking?.rentalMode) || isWithDriverRentalMode(vehicleRentalMode);

export const getRentalModeLabel = (mode) => {
  const normalized = normalizeRentalMode(mode);
  return normalized === RENTAL_MODES.WITH_DRIVER ? 'With Driver' : 'Self Drive';
};

/** Bookings that can receive a driver assignment from admin. */
export const DRIVER_ASSIGNABLE_BOOKING_STATUSES = ['Pending', 'Approved', 'Active'];
