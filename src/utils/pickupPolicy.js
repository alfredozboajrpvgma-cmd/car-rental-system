import { isWithDriverRentalMode } from './rentalMode';

/** Self-drive only: pickup window + grace period. With-driver uses hub→pin ETA instead. */
export const usesPickupGracePeriod = (booking) =>
  !isWithDriverRentalMode(booking?.rentalMode);

/** Pickup window length after scheduled pickup time (hours). */
export const PICKUP_WINDOW_HOURS = 2;

/** Grace period after scheduled pickup before auto no-show (minutes). */
export const GRACE_PERIOD_MINUTES = 60;

export const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000);

export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

/** Build pickup schedule fields from scheduled pickup datetime. */
export const buildPickupSchedule = (pickupAt) => {
  const start = pickupAt instanceof Date ? pickupAt : new Date(pickupAt);
  return {
    pickupWindowStart: start,
    pickupWindowEnd: addHours(start, PICKUP_WINDOW_HOURS),
    gracePeriodEndsAt: addMinutes(start, GRACE_PERIOD_MINUTES),
  };
};

export const getPickupTimestamps = (booking) => {
  const start = booking.pickupWindowStart?.toDate?.()
    || booking.startDate?.toDate?.();
  const windowEnd = booking.pickupWindowEnd?.toDate?.()
    || (start ? addHours(start, PICKUP_WINDOW_HOURS) : null);
  const graceEnd = booking.gracePeriodEndsAt?.toDate?.()
    || (start ? addMinutes(start, GRACE_PERIOD_MINUTES) : null);
  return { start, windowEnd, graceEnd };
};

export const formatPickupWindow = (booking) => {
  const { start, windowEnd } = getPickupTimestamps(booking);
  if (!start || !windowEnd) return '—';
  const fmt = (d) => d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${fmt(start)} – ${fmt(windowEnd)}`;
};

export const getGraceRemainingMs = (booking) => {
  const { graceEnd } = getPickupTimestamps(booking);
  if (!graceEnd) return 0;
  return Math.max(0, graceEnd.getTime() - Date.now());
};

export const isGraceExpired = (booking) => {
  if (!usesPickupGracePeriod(booking)) return false;
  return getGraceRemainingMs(booking) === 0
  && booking.status === 'Approved'
  && getPickupTimestamps(booking).graceEnd
  && Date.now() >= getPickupTimestamps(booking).graceEnd.getTime();
};

export const canReschedulePickup = (booking) => {
  if (!usesPickupGracePeriod(booking)) return false;
  if (booking.status !== 'Approved') return false;
  return getGraceRemainingMs(booking) > 0;
};

export const formatCountdown = (ms) => {
  if (ms <= 0) return 'Grace period ended';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
};
