import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { addHours, buildPickupSchedule } from './pickupPolicy';
import { fetchActiveBookingsForVehicle, fetchAllBookings } from './supabaseBookings';

const overlaps = (start, end, bStart, bEnd) =>
  (start >= bStart && start <= bEnd)
  || (end >= bStart && end <= bEnd)
  || (start <= bStart && end >= bEnd);

export const findNextAvailableSlot = async (vehicleId, fromDate = new Date(), durationDays = 1) => {
  const bookings = await fetchActiveBookingsForVehicle(vehicleId);

  const blocked = bookings
    .map((b) => ({
      start: b.startDate?.toDate?.(),
      end: b.endDate?.toDate?.(),
    }))
    .filter((b) => b.start && b.end);

  let candidate = new Date(fromDate);
  candidate.setMinutes(0, 0, 0);
  if (candidate < new Date()) {
    candidate = new Date();
    candidate.setHours(candidate.getHours() + 2, 0, 0, 0);
  }

  for (let i = 0; i < 48; i += 1) {
    const end = addHours(candidate, durationDays * 24);
    const clash = blocked.some((b) => overlaps(candidate, end, b.start, b.end));
    if (!clash) {
      return {
        start: candidate,
        end,
        schedule: buildPickupSchedule(candidate),
      };
    }
    candidate = addHours(candidate, 2);
  }

  return null;
};

export const findAlternativeVehicles = async (location, excludeVehicleId, limit = 3) => {
  const [vehicleSnap, allBookings] = await Promise.all([
    getDocs(collection(db, 'vehicles')),
    fetchAllBookings(),
  ]);

  const busyIds = new Set(
    allBookings
      .filter((b) => ['Pending', 'Approved', 'Active'].includes(b.status))
      .map((b) => b.vehicleId)
      .filter(Boolean)
  );

  const alternatives = [];
  vehicleSnap.forEach((d) => {
    const v = { id: d.id, ...d.data() };
    if (v.id === excludeVehicleId) return;
    if (v.status !== 'Available' && !v.availableNow) return;
    if (location && v.location && v.location !== location) return;
    if (busyIds.has(v.id)) return;
    alternatives.push(v);
  });

  return alternatives
    .sort((a, b) => (b.availableNow ? 1 : 0) - (a.availableNow ? 1 : 0) || (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);
};
