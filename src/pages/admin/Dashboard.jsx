import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, DollarSign, Activity, Clock, RotateCcw, AlertTriangle, Plus, CalendarCheck, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAllBookings, fetchAllUsers, buildRevenueByMonth } from '../../utils/analytics';
import { formatBookingDateRange, resolveFleetVehicleStatus } from '../../utils/bookings';
import { fetchVehicleReservationMap } from '../../utils/supabaseBookings';
import { notifyStaff } from '../../utils/notifications';

const Dashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [allBookings, users, vehicleSnap, reservationMap] = await Promise.all([
          fetchAllBookings(),
          fetchAllUsers(),
          getDocs(collection(db, 'vehicles')),
          fetchVehicleReservationMap().catch(() => ({ reserved: new Set(), pending: new Set() })),
        ]);
        const fleet = [];
        vehicleSnap.forEach((d) => {
          const data = d.data();
          fleet.push({
            id: d.id,
            ...data,
            status: resolveFleetVehicleStatus(d.id, data.status, reservationMap.reserved),
          });
        });
        setBookings(allBookings);
        setVehicles(fleet);
        setCustomers(users.filter((u) => (u.role || 'customer') === 'customer').length);
        setChartData(buildRevenueByMonth(allBookings, 7).map((d) => ({ name: d.name, revenue: d.revenue })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (loading || vehicles.length === 0) return undefined;

    const available = vehicles.filter((v) => v.status === 'Available').length;
    if (available >= 3) return undefined;

    const dedupeKey = `lowFleetNotified_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(dedupeKey)) return undefined;

    sessionStorage.setItem(dedupeKey, '1');
    notifyStaff({
      title: 'Low fleet availability',
      message: `Only ${available} vehicle${available === 1 ? ' is' : 's are'} available for rent.`,
      link: '/admin/fleet',
      type: 'low_fleet',
    }).catch((err) => console.error(err));

    return undefined;
  }, [loading, vehicles]);

  const now = new Date();
  const mtdRevenue = bookings
    .filter((b) => {
      const d = b.createdAt?.toDate?.();
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .filter((b) => ['Completed', 'Active', 'Approved'].includes(b.status))
    .reduce((s, b) => s + (b.total || 0), 0);

  const activeRentals = bookings.filter((b) => b.status === 'Active').length;
  const pending = bookings.filter((b) => b.status === 'Pending').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'Maintenance').length;
  const rentedCount = new Set(
    bookings
      .filter((b) => ['Pending', 'Approved', 'Active'].includes(b.status))
      .map((b) => b.vehicleId)
      .filter(Boolean)
  ).size;
  const utilization = vehicles.length
    ? `${Math.round((rentedCount / vehicles.length) * 100)}% utilization`
    : 'No fleet data';

  const returnsDueToday = bookings.filter((b) => {
    if (b.status !== 'Active' || !b.endDate?.toDate) return false;
    const end = b.endDate.toDate();
    return end.toDateString() === now.toDateString();
  }).length;

  const stats = [
    { label: 'Total Fleet', value: String(vehicles.length), icon: <Car size={24} />, trend: `${vehicles.filter((v) => v.status === 'Available').length} available` },
    { label: 'Active Rentals', value: String(activeRentals), icon: <Activity size={24} />, trend: utilization },
    { label: 'Total Customers', value: String(customers), icon: <Users size={24} />, trend: 'Registered users' },
    { label: 'Revenue (MTD)', value: `₱${(mtdRevenue / 1000).toFixed(0)}k`, icon: <DollarSign size={24} />, trend: 'This month' },
    { label: 'Pending Approvals', value: String(pending), icon: <Clock size={24} color="#f59e0b" />, trend: pending ? 'Needs action' : 'All clear' },
    { label: 'Returns Due Today', value: String(returnsDueToday), icon: <RotateCcw size={24} color="#3b82f6" />, trend: 'Active ending today' },
    { label: 'Maintenance Alerts', value: String(maintenanceCount), icon: <AlertTriangle size={24} color="#ef4444" />, trend: maintenanceCount ? 'In shop' : 'None' },
  ];

  const recentBookings = bookings.slice(0, 5).map((b) => ({
    id: b.id.slice(0, 8).toUpperCase(),
    customer: b.customerName,
    car: b.vehicleName,
    dates: formatBookingDateRange(b.startDate, b.endDate),
    status: b.status,
  }));

  return (
    <div className="fade-in">
      <div style={styles.quickActions} className="quick-actions">
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionRow}>
          <Link to="/admin/fleet" style={styles.actionBtn} className="btn-hover"><Plus size={18} /> <span>Add New Vehicle</span></Link>
          <Link to="/admin/reservations" style={styles.actionBtn} className="btn-hover"><CalendarCheck size={18} /> <span>Manage Reservations</span></Link>
          <Link to="/admin/reservations" style={styles.actionBtnSecondary} className="btn-secondary-hover"><CheckCircle size={18} /> <span>Approve Requests</span></Link>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Loading dashboard...</p>
      ) : (
        <>
          <div style={styles.grid} className="kpi-grid">
            {stats.map((stat, i) => (
              <div key={i} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.iconWrapper}>{stat.icon}</div>
                  <div style={styles.trend}>{stat.trend}</div>
                </div>
                <div style={styles.value}>{stat.value}</div>
                <div style={styles.label}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={styles.contentGrid} className="content-grid">
            <div style={styles.chartArea}>
              <h3 style={styles.cardTitle}>Revenue Activity</h3>
              <div style={{ width: '100%', height: '300px', marginTop: '1rem' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0033FF" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0033FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#0033FF" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={styles.recentBookings}>
              <h3 style={styles.cardTitle}>Recent Bookings</h3>
              <div style={styles.tableWrapper}>
                {recentBookings.length === 0 ? (
                  <p style={{ color: '#888', padding: '1rem' }}>No bookings yet.</p>
                ) : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Dates</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            <div style={styles.customerName}>{booking.customer}</div>
                            <div style={styles.bookingId}>{booking.id}</div>
                          </td>
                          <td>{booking.car}</td>
                          <td style={styles.monoCell}>{booking.dates}</td>
                          <td>
                            <span style={{
                              ...styles.badge,
                              ...(booking.status === 'Active' ? styles.badgeSuccess :
                                  booking.status === 'Pending' ? styles.badgeWarning : styles.badgeNeutral),
                            }}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  quickActions: { marginBottom: '2rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111' },
  actionRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  actionBtn: {
    backgroundColor: 'var(--text-color)',
    color: '#FFF',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  actionBtnSecondary: {
    backgroundColor: '#FFF',
    color: 'var(--text-color)',
    border: '1px solid var(--border-color)',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' },
  card: { backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
  iconWrapper: { color: 'var(--text-color)' },
  trend: { fontSize: '0.75rem', color: '#888', fontFamily: 'monospace', textAlign: 'right', maxWidth: '120px' },
  value: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1, marginBottom: '0.5rem' },
  label: { color: '#666', fontSize: '0.85rem' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' },
  chartArea: { backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  recentBookings: { backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '500px' },
  customerName: { fontWeight: 500 },
  bookingId: { fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' },
  monoCell: { fontFamily: 'monospace', fontSize: '0.85rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarning: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  badgeNeutral: { backgroundColor: '#F5F5F7', color: '#666' },
};

export default Dashboard;
