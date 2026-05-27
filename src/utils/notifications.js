import { collection, addDoc, getDocs, getDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getReservationsLinkForUser,
  getFleetLinkForUser,
  getIncidentsLinkForUser,
  getMaintenanceLinkForUser,
} from './staffPortalLinks';

const PREF_BY_TYPE = {
  new_booking: 'notifyNewBooking',
  payment: 'notifyPaymentReceived',
  return_reminder: 'notifyReturnReminder',
  maintenance_due: 'notifyMaintenanceDue',
  low_fleet: 'notifyLowFleetAvailability',
};

const staffNotificationsEnabled = async (prefKey) => {
  if (!prefKey) return true;
  try {
    const snap = await getDoc(doc(db, 'settings', 'app'));
    const data = snap.data();
    if (!data || data[prefKey] === undefined) return true;
    return Boolean(data[prefKey]);
  } catch (err) {
    console.error('Could not load notification preferences:', err);
    return true;
  }
};

const linkForStaffByType = (userData, type, explicitLink) => {
  if (explicitLink) return explicitLink;
  if (type === 'maintenance_due') return getMaintenanceLinkForUser(userData);
  if (type === 'roadside' || type === 'urgent' || type === 'no_show') {
    return getIncidentsLinkForUser(userData);
  }
  if (type === 'vehicle_relisted') return getFleetLinkForUser(userData);
  return getReservationsLinkForUser(userData);
};

export const createNotification = async ({
  userId,
  title,
  message,
  link = '/customer/bookings',
  type = 'general',
  channels = ['in_app'],
}) => {
  if (!userId) return;
  await addDoc(collection(db, 'notifications'), {
    userId,
    title,
    message,
    link,
    type,
    channels,
    read: false,
    createdAt: Timestamp.fromDate(new Date()),
  });
};

/** Notify a chauffeur by Firebase user id (users collection). */
export const notifyDriverUser = async ({
  userId,
  title,
  message,
  link = '/driver/trips',
  type = 'assignment',
}) => {
  if (!userId) return;
  await createNotification({
    userId,
    title,
    message,
    link,
    type,
    channels: ['in_app'],
  });
};

/** Find Firebase uid for a driver record email (first match). */
export const findUserIdByEmail = async (email) => {
  if (!email) return null;
  const snap = await getDocs(collection(db, 'users'));
  const normalized = email.trim().toLowerCase();
  let found = null;
  snap.forEach((d) => {
    if (found) return;
    const data = d.data();
    if ((data.email || '').trim().toLowerCase() === normalized) {
      found = d.id;
    }
  });
  return found;
};

/** Find Firebase uid linked to a drivers/{driverId} record. */
export const findUserIdByDriverId = async (driverId) => {
  if (!driverId) return null;
  const snap = await getDocs(collection(db, 'users'));
  let found = null;
  snap.forEach((d) => {
    if (found) return;
    if (d.data().driverId === driverId) found = d.id;
  });
  return found;
};

export const notifyStaff = async ({
  title,
  message,
  link,
  type = 'ops',
  prefKey,
}) => {
  const preferenceKey = prefKey || PREF_BY_TYPE[type];
  if (!(await staffNotificationsEnabled(preferenceKey))) return;

  const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'staff']));
  const snap = await getDocs(q);

  const tasks = [];
  snap.forEach((d) => {
    const userData = { ...d.data(), id: d.id };
    tasks.push(
      createNotification({
        userId: d.id,
        title,
        message,
        link: linkForStaffByType(userData, type, link),
        type,
        channels: ['in_app', 'email'],
      })
    );
  });

  await Promise.all(tasks);
};

export const notifyAdmins = async ({
  title,
  message,
  link,
  type = 'urgent',
}) => {
  const q = query(collection(db, 'users'), where('role', '==', 'admin'));
  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((d) => {
      const userData = { ...d.data(), id: d.id };
      return createNotification({
        userId: d.id,
        title,
        message,
        link: link || getIncidentsLinkForUser(userData),
        type,
        channels: ['in_app', 'email'],
      });
    })
  );
};
