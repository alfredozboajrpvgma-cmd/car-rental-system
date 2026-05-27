/** Platform roles */
export const ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
  BETA_TESTER: 'beta_tester',
};

/** Staff sub-types (all use role `staff` in Firestore). */
export const STAFF_TYPES = {
  DRIVER: 'driver',
  SUPPORT: 'support',
  MAINTENANCE: 'maintenance',
};

export const STAFF_TYPE_OPTIONS = [
  { value: STAFF_TYPES.DRIVER, label: 'Drivers' },
  { value: STAFF_TYPES.SUPPORT, label: 'Contact and Support' },
  { value: STAFF_TYPES.MAINTENANCE, label: 'Maintenance staff' },
];

export const getStaffTypeLabel = (staffType) =>
  STAFF_TYPE_OPTIONS.find((o) => o.value === staffType)?.label || staffType || 'Staff';

/** Normalize legacy `role: driver` into staff + driver type. */
export const normalizeUser = (user) => {
  if (!user) return user;
  if (user.role === 'driver') {
    return {
      ...user,
      role: ROLES.STAFF,
      staffType: STAFF_TYPES.DRIVER,
    };
  }
  return user;
};

export const getStaffType = (user) => normalizeUser(user)?.staffType || null;

export const isAdminUser = (user) => {
  const u = normalizeUser(user);
  return u?.role === ROLES.ADMIN || u?.role === ROLES.BETA_TESTER;
};

export const isStaffUser = (user) => {
  const u = normalizeUser(user);
  return u?.role === ROLES.STAFF || u?.role === ROLES.ADMIN || u?.role === ROLES.BETA_TESTER;
};

export const isCustomerUser = (user) => {
  const u = normalizeUser(user);
  return u?.role === ROLES.CUSTOMER || u?.role === ROLES.BETA_TESTER;
};

/** Chauffeur portal — trips, GPS, assignments. */
export const canAccessDriverPortal = (user) => {
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  if (u?.role === 'driver') return Boolean(u.driverId);
  return u?.role === ROLES.STAFF && u?.staffType === STAFF_TYPES.DRIVER && Boolean(u.driverId);
};

/** Contact & Support portal. */
export const canAccessSupportPortal = (user) => {
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  return u?.role === ROLES.STAFF && u?.staffType === STAFF_TYPES.SUPPORT;
};

/** Maintenance / workshop portal. */
export const canAccessWorkshopPortal = (user) => {
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  return u?.role === ROLES.STAFF && u?.staffType === STAFF_TYPES.MAINTENANCE;
};

/** Admin dashboard only (full operations). */
export const canAccessAdminPanel = (user) => {
  const u = normalizeUser(user);
  return u?.role === ROLES.ADMIN || u?.role === ROLES.BETA_TESTER;
};

export const userHasRole = (user, allowedRoles) => {
  if (!allowedRoles?.length) return true;
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  if (allowedRoles.includes(u?.role)) return true;
  if (allowedRoles.includes('driver') && canAccessDriverPortal(user)) return true;
  return false;
};

const SUPPORT_PATH_PREFIX = '/support';
const WORKSHOP_PATH_PREFIX = '/workshop';

const SUPPORT_PATHS = [
  SUPPORT_PATH_PREFIX,
  `${SUPPORT_PATH_PREFIX}/reservations`,
  `${SUPPORT_PATH_PREFIX}/customers`,
  `${SUPPORT_PATH_PREFIX}/incidents`,
  `${SUPPORT_PATH_PREFIX}/locations`,
  `${SUPPORT_PATH_PREFIX}/faq`,
  `${SUPPORT_PATH_PREFIX}/profile`,
];

const WORKSHOP_PATHS = [
  WORKSHOP_PATH_PREFIX,
  `${WORKSHOP_PATH_PREFIX}/fleet`,
  `${WORKSHOP_PATH_PREFIX}/tasks`,
  `${WORKSHOP_PATH_PREFIX}/incidents`,
  `${WORKSHOP_PATH_PREFIX}/locations`,
  `${WORKSHOP_PATH_PREFIX}/profile`,
];

export const canSupportAccessPath = (user, pathname) => {
  if (!canAccessSupportPortal(user)) return false;
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  return SUPPORT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

export const canWorkshopAccessPath = (user, pathname) => {
  if (!canAccessWorkshopPortal(user)) return false;
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return true;
  return WORKSHOP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
};

/** @deprecated Use portal-specific checks; kept for AdminLayout if needed. */
export const canStaffAccessPath = (user, pathname) => {
  const u = normalizeUser(user);
  if (u?.role === ROLES.ADMIN) return true;
  if (canAccessSupportPortal(u)) return canSupportAccessPath(u, pathname);
  if (canAccessWorkshopPortal(u)) return canWorkshopAccessPath(u, pathname);
  return false;
};

export const getDashboardPathForUser = (user) => {
  const u = normalizeUser(user);
  if (u?.role === ROLES.BETA_TESTER) return '/customer'; // Default routing for beta testers
  if (u?.role === ROLES.CUSTOMER) return '/customer';
  if (canAccessDriverPortal(u)) return '/driver';
  if (canAccessSupportPortal(u)) return '/support';
  if (canAccessWorkshopPortal(u)) return '/workshop';
  if (canAccessAdminPanel(u)) return '/admin';
  return '/login';
};
