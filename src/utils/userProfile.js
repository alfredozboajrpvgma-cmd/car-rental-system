import { getDashboardPathForUser, normalizeUser } from './roles';

export const buildUserFromFirestore = (firebaseUser, userData = {}) => {
  const name = userData.name || firebaseUser.email?.split('@')[0] || 'User';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const role = userData.role || 'customer';
  const staffType = userData.staffType || (role === 'driver' ? 'driver' : null);

  return normalizeUser({
    id: firebaseUser.uid,
    email: firebaseUser.email,
    name,
    role: role === 'driver' ? 'staff' : role,
    staffType,
    driverId: userData.driverId || null,
    avatar: initials || 'U',
    phone: userData.phone || '',
    address: userData.address || '',
    licenseUrl: userData.licenseUrl || null,
    licenseName: userData.licenseName || '',
    verified: userData.verified ?? false,
    createdAt: userData.createdAt || null,
  });
};

export const getLicenseVerificationStatus = (user) => {
  if (!user?.licenseUrl) return 'missing';
  if (user?.verified) return 'verified';
  return 'pending';
};

export const getDashboardPath = (roleOrUser) => {
  if (typeof roleOrUser === 'object' && roleOrUser !== null) {
    return getDashboardPathForUser(roleOrUser);
  }
  if (roleOrUser === 'customer') return '/customer';
  if (roleOrUser === 'driver') return '/driver';
  if (roleOrUser === 'support') return '/support';
  if (roleOrUser === 'maintenance') return '/workshop';
  return '/admin';
};

export const isDriverRole = (roleOrUser) => {
  if (typeof roleOrUser === 'object' && roleOrUser !== null) {
    const u = normalizeUser(roleOrUser);
    return u?.staffType === 'driver' || roleOrUser.role === 'driver';
  }
  return roleOrUser === 'driver';
};
