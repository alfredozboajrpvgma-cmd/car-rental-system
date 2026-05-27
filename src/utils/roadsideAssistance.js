import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchBookingById } from './supabaseBookings';
import { notifyStaff } from './notifications';
import { getRoadsideSlaDue } from './sla';

export const ROADSIDE_ISSUE_TYPES = [
  'Flat tire',
  'Battery / won\'t start',
  'Engine trouble',
  'Accident',
  'Locked out',
  'Fuel delivery',
  'Other emergency',
];

const DEFAULT_HOTLINE = import.meta.env.VITE_ROADSIDE_HOTLINE || '+63 2 8888 0000';

export const formatTelLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('63') ? `tel:+${digits}` : `tel:+${digits}`;
};

export const fetchRoadsideHotline = async () => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    if (snap.exists()) {
      const data = snap.data();
      return data.roadsideHotline || data.hotline || DEFAULT_HOTLINE;
    }
  } catch (err) {
    console.warn('Could not load roadside hotline from settings', err);
  }
  return DEFAULT_HOTLINE;
};

/**
 * Customer may report only while actually on rent:
 * - Active rental, or
 * - Approved booking whose pickup time has started (not Pending / pre-pickup).
 */
export const isBookingEligibleForRoadside = (booking) => {
  if (!['Approved', 'Active'].includes(booking.status)) return false;

  const end = booking.endDate?.toDate?.();
  if (!end) return false;

  const now = new Date();
  if (now > end) return false;

  if (booking.status === 'Active') return true;

  const start = booking.startDate?.toDate?.();
  if (!start) return false;

  return now >= start;
};

export const ROADSIDE_INELIGIBLE_MESSAGE =
  'Roadside assistance is only available during an approved rental that has started. '
  + 'Pending or upcoming bookings cannot submit a report yet.';

export const getEligibleRoadsideBookings = (bookings) =>
  bookings.filter(isBookingEligibleForRoadside);

export const captureGeolocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });

export const submitRoadsideRequest = async ({
  userId,
  userName,
  userPhone,
  bookingId,
  vehicleName,
  issueType,
  description,
  location,
}) => {
  const booking = await fetchBookingById(bookingId);
  if (!booking || booking.userId !== userId || !isBookingEligibleForRoadside(booking)) {
    throw new Error(ROADSIDE_INELIGIBLE_MESSAGE);
  }

  const created = new Date();
  const sla = getRoadsideSlaDue(created);

  const ref = await addDoc(collection(db, 'roadsideAssistance'), {
    userId,
    userName: userName || '',
    userPhone: userPhone || '',
    bookingId,
    vehicleName: vehicleName || booking.vehicleName || '',
    issueType,
    description: description.trim(),
    location: location || null,
    status: 'Open',
    priority: issueType === 'Accident' ? 'urgent' : 'normal',
    slaRespondBy: Timestamp.fromDate(sla.respondBy),
    slaResolveBy: Timestamp.fromDate(sla.resolveBy),
    createdAt: Timestamp.fromDate(created),
  });

  const shortId = ref.id.slice(0, 8).toUpperCase();
  await notifyStaff({
    title: 'Roadside assistance request',
    message: `${userName || 'Customer'} — ${issueType} (${vehicleName}). Request #${shortId}`,
    link: '/support/incidents',
    type: 'roadside',
  });

  return ref.id;
};
