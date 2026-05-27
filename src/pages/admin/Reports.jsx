import React, { useState, useEffect } from 'react';
import { Download, Car, Users, DollarSign, CalendarCheck } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  fetchAllBookings,
  fetchAllUsers,
  buildRevenueByMonth,
  buildVehicleTypeBreakdown,
  buildTopVehicles,
  buildUtilizationByDay,
} from '../../utils/analytics';

const Reports = () => {
  const [period, setPeriod] = useState('6months');
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const months = period === '30days' ? 1 : period === 'year' ? 12 : 6;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [allBookings, users, vehicleSnap] = await Promise.all([
          fetchAllBookings(),
          fetchAllUsers(),
          getDocs(collection(db, 'vehicles')),
        ]);
        const fleet = [];
        vehicleSnap.forEach((d) => fleet.push(d.data()));
        setBookings(allBookings);
        setVehicles(fleet);
        setCustomerCount(users.filter((u) => (u.role || 'customer') === 'customer').length);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const revenueData = buildRevenueByMonth(bookings, months);
  const totalRevenue = bookings
    .filter((b) => ['Completed', 'Active', 'Approved'].includes(b.status))
    .reduce((s, b) => s + (b.total || 0), 0);
  const rented = new Set(
    bookings
      .filter((b) => ['Pending', 'Approved', 'Active'].includes(b.status))
      .map((b) => b.vehicleId)
      .filter(Boolean)
  ).size;
  const utilizationPct = vehicles.length ? Math.round((rented / vehicles.length) * 100) : 0;
  const vehicleTypeData = buildVehicleTypeBreakdown(vehicles);
  const topVehicles = buildTopVehicles(bookings);

  const utilizationData = buildUtilizationByDay({
    bookings,
    fleetSize: vehicles.length,
    days: period === '30days' ? 30 : 7,
  });

  const kpis = [
    { label: 'Total Revenue', value: `₱${(totalRevenue / 1000).toFixed(0)}k`, icon: <DollarSign size={20} /> },
    { label: 'Total Bookings', value: String(bookings.length), icon: <CalendarCheck size={20} /> },
    { label: 'Fleet Utilization', value: `${utilizationPct}%`, icon: <Car size={20} /> },
    { label: 'Customers', value: String(customerCount), icon: <Users size={20} /> },
  ];

  const exportCsv = () => {
    const rows = [['Vehicle', 'Bookings', 'Revenue'], ...topVehicles.map((v) => [v.name, v.bookings, v.revenue])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drive-ph-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p style={{ color: '#888' }}>Loading reports...</p>;
  }

  return (
    <div className="fade-in">
      <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Reports & Analytics</h1>
        </div>
        <div style={styles.headerActions}>
          <select style={styles.periodSelect} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30days">Last 30 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">Year to Date</option>
          </select>
          <button type="button" style={styles.exportBtn} onClick={exportCsv}><Download size={18} /> Export CSV</button>
        </div>
      </div>

      <div style={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <div key={i} style={styles.kpiCard}>
            <div style={styles.kpiHeader}>
              <div style={styles.kpiIcon}>{kpi.icon}</div>
            </div>
            <div style={styles.kpiValue}>{kpi.value}</div>
            <div style={styles.kpiLabel}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Revenue Trend</h3>
          <div style={{ width: '100%', height: '300px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0033FF" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0033FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} tickFormatter={(v) => `₱${v / 1000}k`} />
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                <Area type="monotone" dataKey="revenue" stroke="#0033FF" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Fleet Utilization (%)</h3>
          <div style={{ width: '100%', height: '300px', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Utilization']} contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                <Bar dataKey="utilization" fill="#0033FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={styles.bottomRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Fleet Composition</h3>
          <div style={{ width: '100%', height: '280px', marginTop: '1rem' }}>
            {vehicleTypeData.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', paddingTop: '4rem' }}>No vehicles in fleet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={vehicleTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {vehicleTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Top Performing Vehicles</h3>
          <table style={styles.rankTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle</th>
                <th>Bookings</th>
                <th style={{ textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topVehicles.length === 0 ? (
                <tr><td colSpan="4" style={{ color: '#888', padding: '1rem' }}>No booking data yet</td></tr>
              ) : (
                topVehicles.map((v, i) => (
                  <tr key={v.name}>
                    <td style={styles.rankCell}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{v.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{v.bookings}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>₱{v.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  headerActions: { display: 'flex', gap: '1rem', alignItems: 'center' },
  periodSelect: { padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', backgroundColor: '#FFF', cursor: 'pointer' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--text-color)', color: '#FFF', padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' },
  kpiCard: { backgroundColor: '#FFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  kpiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  kpiIcon: { color: '#111' },
  kpiValue: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1, marginBottom: '0.5rem' },
  kpiLabel: { color: '#666', fontSize: '0.85rem' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' },
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' },
  chartCard: { backgroundColor: '#FFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 600 },
  rankTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem' },
  rankCell: { fontWeight: 700, color: '#888', width: '30px' },
};

export default Reports;
