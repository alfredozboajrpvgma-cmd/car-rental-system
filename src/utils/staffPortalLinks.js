import { STAFF_TYPES } from './roles';

/** In-app notification / deep link for a staff user doc. */
export const getNotificationLinkForUser = (userData, fallback = '/admin') => {
  if (!userData) return fallback;
  const role = userData.role;
  const staffType = userData.staffType;

  if (role === 'admin') return '/admin';
  if (role === 'staff' && staffType === STAFF_TYPES.SUPPORT) return '/support';
  if (role === 'staff' && staffType === STAFF_TYPES.MAINTENANCE) return '/workshop';
  if (role === 'staff' && staffType === STAFF_TYPES.DRIVER) return '/driver';
  if (role === 'driver') return '/driver';
  return fallback;
};

export const getReservationsLinkForUser = (userData) => {
  const base = getNotificationLinkForUser(userData, '/admin');
  if (base === '/support') return '/support/reservations';
  if (base === '/admin') return '/admin/reservations';
  return base;
};

export const getFleetLinkForUser = (userData) => {
  if (userData?.role === 'admin') return '/admin/fleet';
  if (userData?.staffType === STAFF_TYPES.MAINTENANCE) return '/workshop/fleet';
  return '/admin/fleet';
};

export const getIncidentsLinkForUser = (userData) => {
  if (userData?.role === 'admin') return '/admin/incidents';
  if (userData?.staffType === STAFF_TYPES.SUPPORT) return '/support/incidents';
  if (userData?.staffType === STAFF_TYPES.MAINTENANCE) return '/workshop/incidents';
  return '/admin/incidents';
};

export const getMaintenanceLinkForUser = (userData) => {
  if (userData?.role === 'admin') return '/admin/maintenance';
  if (userData?.staffType === STAFF_TYPES.MAINTENANCE) return '/workshop/tasks';
  return '/admin/maintenance';
};
