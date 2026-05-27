import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addMinutes, buildPickupSchedule, GRACE_PERIOD_MINUTES, usesPickupGracePeriod } from './pickupPolicy';
import { createNotification, notifyStaff } from './notifications';
import { fetchBookingsByStatus, updateBooking } from './supabaseBookings';

const scheduleToUpdates = (pickupAt) => {
  const schedule = buildPickupSchedule(pickupAt);
  return {
    pickupWindowStart: schedule.pickupWindowStart,
    pickupWindowEnd: schedule.pickupWindowEnd,
    gracePeriodEndsAt: schedule.gracePeriodEndsAt,
  };
};

/** Call when admin approves a self-drive booking — sets pickup window + grace period. */
export const applyPickupScheduleOnApprove = (bookingOrPickupAt, pickupAtMaybe) => {
  const booking = pickupAtMaybe !== undefined ? bookingOrPickupAt : null;
  const pickupAt = pickupAtMaybe !== undefined ? pickupAtMaybe : bookingOrPickupAt;
  if (booking && !usesPickupGracePeriod(booking)) return {};
  return scheduleToUpdates(pickupAt);
};

export const shouldAutoNoShow = (booking, now = new Date()) => {
  if (!usesPickupGracePeriod(booking)) return false;
  if (booking.status !== 'Approved') return false;
  let graceEnd = booking.gracePeriodEndsAt?.toDate?.();
  if (!graceEnd && booking.startDate?.toDate) {
    graceEnd = addMinutes(booking.startDate.toDate(), GRACE_PERIOD_MINUTES);
  }
  if (!graceEnd) return false;
  return now.getTime() >= graceEnd.getTime();
};

export const markBookingNoShow = async (booking) => {
  const now = new Date();
  await updateBooking(booking.docId || booking.id, {
    status: 'No-Show',
    noShowAt: now,
  });

  if (booking.vehicleId) {
    await updateDoc(doc(db, 'vehicles', booking.vehicleId), {
      status: 'Available',
      availableNow: true,
      lastMinuteAvailableAt: Timestamp.fromDate(now),
    });
  }

  if (booking.userId) {
    await createNotification({
      userId: booking.userId,
      title: 'Pickup window missed',
      message: `Your reservation for ${booking.vehicleName} was marked as no-show. You can reschedule or book another vehicle.`,
      link: '/customer/bookings',
      type: 'no_show',
      channels: ['in_app', 'email'],
    });
  }

  await notifyStaff({
    title: 'Renter did not arrive',
    message: `${booking.customerName || 'Customer'} did not claim ${booking.vehicleName} (${booking.plate || '—'}) within the grace period.`,
    type: 'no_show',
  });

  await notifyStaff({
    title: 'Car re-opened for booking',
    message: `${booking.vehicleName} is available again and flagged as last-minute / available now.`,
    link: '/admin/fleet',
    type: 'vehicle_relisted',
  });
};

/** Scan approved bookings past grace period and process no-shows. */
export const processAutoNoShows = async () => {
  const approved = await fetchBookingsByStatus('Approved');
  const now = new Date();
  let processed = 0;

  for (const booking of approved) {
    if (!shouldAutoNoShow(booking, now)) continue;
    await markBookingNoShow(booking);
    processed += 1;
  }

  return processed;
};
