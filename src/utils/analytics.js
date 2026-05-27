import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchAllBookings as fetchAllBookingsFromSupabase } from './supabaseBookings';

export const fetchAllBookings = fetchAllBookingsFromSupabase;

export const fetchAllUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'));
  const users = [];
  snapshot.forEach((d) => users.push({ id: d.id, ...d.data() }));
  return users;
};

export const aggregateCustomerStats = (users, bookings) =>
  users
    .filter((u) => u.role === 'customer' || !u.role)
    .map((user) => {
      const userBookings = bookings.filter((b) => b.userId === user.id);
      const totalSpent = userBookings
        .filter((b) => b.status === 'Completed' || b.status === 'Active')
        .reduce((sum, b) => sum + (b.total || 0), 0);
      const name = user.name || user.email?.split('@')[0] || 'Customer';
      return {
        id: user.id,
        name,
        email: user.email,
        phone: user.phone || '—',
        location: user.address || '—',
        totalBookings: userBookings.length,
        totalSpent,
        verified: Boolean(user.verified),
        licenseUrl: user.licenseUrl || null,
        licenseName: user.licenseName || '',
        joinDate: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—',
        avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      };
    });

export const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const buildRevenueByMonth = (bookings, months = 6) => {
  const now = new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  const map = Object.fromEntries(keys.map((k) => [k, 0]));
  bookings
    .filter((b) => ['Completed', 'Active', 'Approved'].includes(b.status))
    .forEach((b) => {
      const d = b.createdAt?.toDate?.() || new Date();
      const key = monthKey(d);
      if (map[key] !== undefined) map[key] += b.total || 0;
    });
  return keys.map((k) => ({
    name: new Date(k + '-01').toLocaleString('en-US', { month: 'short' }),
    revenue: map[k],
  }));
};

export const buildVehicleTypeBreakdown = (vehicles) => {
  const counts = {};
  vehicles.forEach((v) => {
    counts[v.type] = (counts[v.type] || 0) + 1;
  });
  const colors = { Sedan: '#0033FF', SUV: '#FF6B2C', MPV: '#00C48C', Van: '#FFB800' };
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: colors[name] || '#888',
  }));
};

export const buildTopVehicles = (bookings, limit = 5) => {
  const stats = {};
  bookings.forEach((b) => {
    if (!b.vehicleName) return;
    if (!stats[b.vehicleName]) stats[b.vehicleName] = { bookings: 0, revenue: 0 };
    stats[b.vehicleName].bookings += 1;
    stats[b.vehicleName].revenue += b.total || 0;
  });
  return Object.entries(stats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit);
};

const toDayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d, n) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

const clampStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const clampEndOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

const bookingOverlapsDay = (booking, dayStart, dayEnd) => {
  const start = booking.startDate?.toDate?.() || (booking.startDate ? new Date(booking.startDate) : null);
  const end = booking.endDate?.toDate?.() || (booking.endDate ? new Date(booking.endDate) : null);
  if (!start || !end) return false;
  return start <= dayEnd && end >= dayStart;
};

/** Daily utilization from real bookings (Pending/Approved/Active). */
export const buildUtilizationByDay = ({ bookings, fleetSize, days = 7 }) => {
  const size = Math.max(0, Number(fleetSize) || 0);
  const end = clampEndOfDay(new Date());
  const start = clampStartOfDay(addDays(end, -(Math.max(1, Number(days) || 7) - 1)));

  const active = bookings.filter((b) => ['Pending', 'Approved', 'Active'].includes(b.status));
  const data = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const dayStart = clampStartOfDay(d);
    const dayEnd = clampEndOfDay(d);
    const vehicleIds = new Set(
      active
        .filter((b) => b.vehicleId && bookingOverlapsDay(b, dayStart, dayEnd))
        .map((b) => b.vehicleId)
    );
    const reserved = vehicleIds.size;
    const pct = size > 0 ? Math.round((reserved / size) * 100) : 0;
    data.push({
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: toDayKey(d),
      utilization: Math.min(100, Math.max(0, pct)),
      reserved,
    });
  }
  return data;
};
