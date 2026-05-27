import React, { useState, useEffect } from 'react';
import { CalendarCheck, Car, CreditCard, Clock, ArrowUpRight, ShieldCheck, Navigation, PhoneCall, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import {
  formatBookingDateRange,
  fetchBookingsForUser,
  calculateCustomerTotalSpent,
  getNextPickup,
} from '../../utils/bookings';
import { getEligibleRoadsideBookings } from '../../utils/roadsideAssistance';
import { getLicenseVerificationStatus } from '../../utils/userProfile';
import { isCustomerContactComplete } from '../../utils/customerContact';

const CustomerDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const userId = auth.currentUser?.uid ?? currentUser?.id;
      if (!userId) return;
      try {
        const list = await fetchBookingsForUser(userId);
        setBookings(list.map((b) => ({ id: b.docId, ...b })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  const activeCount = bookings.filter((b) => b.status === 'Active').length;
  const totalSpent = calculateCustomerTotalSpent(bookings);
  const nextPickupInfo = getNextPickup(bookings);

  const stats = [
    { label: 'Active Rentals', value: String(activeCount), icon: <Car size={20} />, color: '#0033FF', bg: '#E3F2FD' },
    { label: 'Total Bookings', value: String(bookings.length), icon: <CalendarCheck size={20} />, color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Total Spent', value: `₱${totalSpent.toLocaleString()}`, icon: <CreditCard size={20} />, color: '#F57F17', bg: '#FFF8E1' },
    {
      label: 'Next Pickup',
      value: nextPickupInfo?.display ?? '—',
      tag: nextPickupInfo?.todayLabel,
      icon: <Clock size={20} />,
      color: '#6A1B9A',
      bg: '#F3E5F5',
    },
  ];

  const recentBookings = bookings.slice(0, 5).map((b) => ({
    docId: b.id,
    id: `#${b.id.slice(0, 8).toUpperCase()}`,
    vehicle: b.vehicleName,
    date: formatBookingDateRange(b.startDate, b.endDate),
    status: b.status,
    total: b.total,
  }));

  const roadsideEligible = getEligibleRoadsideBookings(bookings);

  const licenseVerification = getLicenseVerificationStatus(currentUser);
  const verificationIconColor =
    licenseVerification === 'verified' ? '#2E7D32' : '#F57F17';
  const verificationBadgeStyle =
    licenseVerification === 'verified' ? styles.verifiedBadge : styles.pendingBadge;
  const verificationBadgeLabel =
    licenseVerification === 'verified'
      ? '✓ Verified'
      : licenseVerification === 'pending'
        ? 'Pending review'
        : 'Upload license';
  const verificationDesc =
    licenseVerification === 'verified'
      ? 'Your driver\'s license has been verified. You\'re cleared for pickup.'
      : licenseVerification === 'pending'
        ? 'Your license is uploaded. An admin will verify it before pickup.'
        : 'Upload your driver\'s license on your profile to speed up approvals.';

  const contactComplete = isCustomerContactComplete(currentUser);

  const bannerBooking = bookings.find((b) => {
    if (b.status !== 'Approved' || !b.startDate?.toDate) return false;
    const pickup = b.startDate.toDate();
    const now = new Date();
    return pickup >= now || (
      pickup.getDate() === now.getDate()
      && pickup.getMonth() === now.getMonth()
      && pickup.getFullYear() === now.getFullYear()
    );
  });

  const handleRowClick = (booking) => {
    navigate('/customer/bookings', { state: { openBookingId: booking.docId } });
  };

  return (
    <div className="page-enter">
      <div style={styles.welcomeSection}>
        <div>
          <h1 style={styles.welcomeTitle}>Welcome back, {currentUser?.name?.split(' ')[0] || 'Customer'}!</h1>
          <p style={styles.welcomeSubtitle}>Here's a summary of your rental activity.</p>
        </div>
        <Link to="/customer/fleet" style={styles.browseBtn} className="btn-hover">
          <Car size={18} />
          <span>Browse Fleet</span>
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {!contactComplete && (
        <div style={styles.contactBanner}>
          <p style={styles.contactBannerText}>
            <strong>Contact information required.</strong> Add your name, phone number, and address on{' '}
            <Link to="/customer/profile" style={styles.contactBannerLink}>My Profile</Link>{' '}
            before you can book a vehicle.
          </p>
        </div>
      )}

      {showBanner && bannerBooking && (
        <div style={styles.banner}>
          <div style={styles.bannerContent}>
            <span style={{ fontSize: '1.25rem' }}>🚗</span>
            <p style={styles.bannerText}>
              <strong>Upcoming trip:</strong> {bannerBooking.vehicleName} — pickup{' '}
              {bannerBooking.startDate.toDate().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}.
              <Link to="/customer/bookings" style={styles.bannerLink}>View details →</Link>
            </p>
          </div>
          <button type="button" style={styles.bannerCloseBtn} onClick={() => setShowBanner(false)}>
            <X size={18} />
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888' }}>Loading...</p>
      ) : (
        <>
          <div style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{ ...styles.statIcon, backgroundColor: stat.bg, color: stat.color }}>{stat.icon}</div>
                <div style={styles.statContent}>
                  <div style={styles.statValueRow}>
                    <div style={styles.statValue}>{stat.value}</div>
                    {stat.tag && <span style={styles.statTag}>{stat.tag}</span>}
                  </div>
                  <div style={styles.statLabel}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Bookings</h2>
              <Link to="/customer/bookings" style={styles.viewAllLink}>View All →</Link>
            </div>
            <div style={styles.tableContainer}>
              {recentBookings.length === 0 ? (
                <p style={{ padding: '2rem', color: '#888', textAlign: 'center' }}>No bookings yet. Browse the fleet to get started.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Booking ID</th>
                      <th style={styles.th}>Vehicle</th>
                      <th style={styles.th}>Dates</th>
                      <th style={styles.thNumeric}>Total</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr
                        key={b.docId}
                        className="booking-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleRowClick(b)}
                      >
                        <td style={styles.monoText}>{b.id}</td>
                        <td style={styles.primaryText}>{b.vehicle}</td>
                        <td style={styles.secondaryText}>{b.date}</td>
                        <td style={styles.totalCell}>₱{b.total.toLocaleString()}</td>
                        <td style={styles.statusCell}>
                          <span style={{
                            ...styles.badge,
                            ...(b.status === 'Approved' || b.status === 'Pending' ? styles.badgeInfo :
                                b.status === 'Active' ? styles.badgeSuccess : styles.badgeNeutral),
                          }}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.actionsGrid}>
              <Link to="/customer/profile" style={styles.actionCard}>
                <div style={styles.actionHeader}>
                  <ShieldCheck size={24} color={verificationIconColor} />
                  <span style={verificationBadgeStyle}>{verificationBadgeLabel}</span>
                </div>
                <div>
                  <h3 style={styles.actionTitle}>Account Verification</h3>
                  <p style={styles.actionDesc}>{verificationDesc}</p>
                </div>
              </Link>
              <Link to="/customer/bookings" style={styles.actionCard}>
                <Navigation size={24} color="#0033FF" />
                <div>
                  <h3 style={styles.actionTitle}>My Bookings</h3>
                  <p style={styles.actionDesc}>View reservation details, cancel pending trips, or download receipts.</p>
                </div>
              </Link>
              <Link
                to="/customer/incidents"
                style={styles.actionCard}
                className={`roadside-action-card${roadsideEligible.length > 0 ? ' roadside-action-card--eligible' : ''}`}
              >
                <PhoneCall size={24} color="#C62828" />
                <div style={{ flex: 1 }}>
                  <h3 style={styles.actionTitle}>Roadside Assistance</h3>
                  <p style={styles.actionDesc}>
                    {roadsideEligible.length > 0
                      ? '24/7 support — request help or call the hotline during your trip.'
                      : 'Requires an approved rental that has already started (not pending or pre-pickup).'}
                  </p>
                  <span style={styles.actionCta}>
                    {roadsideEligible.length > 0 ? 'Get help →' : 'Learn more →'}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  welcomeSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  welcomeTitle: { fontSize: '1.75rem', fontWeight: 600, color: '#111' },
  welcomeSubtitle: { color: '#888', fontSize: '0.95rem', marginTop: '0.25rem' },
  browseBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' },
  statCard: { backgroundColor: '#FFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' },
  statIcon: { width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statContent: { minWidth: 0 },
  statValueRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  statValue: { fontSize: '1.35rem', fontWeight: 700, color: '#111', lineHeight: 1.2 },
  statTag: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  statLabel: { fontSize: '0.8rem', color: '#888', marginTop: '0.15rem' },
  section: { marginBottom: '2.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sectionTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#111' },
  viewAllLink: { fontSize: '0.85rem', color: '#0033FF', fontWeight: 600, textDecoration: 'none' },
  tableContainer: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1rem 1.5rem', borderBottom: '1px solid #E0E0E0' },
  thNumeric: { fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1rem 1.5rem', borderBottom: '1px solid #E0E0E0', textAlign: 'right' },
  monoText: { fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', color: '#333', padding: '1rem 1.5rem' },
  primaryText: { fontWeight: 600, fontSize: '0.95rem', color: '#111', padding: '1rem 1.5rem' },
  secondaryText: { fontSize: '0.85rem', color: '#888', padding: '1rem 1.5rem' },
  totalCell: { textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95rem', color: '#111', padding: '1rem 1.5rem' },
  statusCell: { padding: '1rem 1.5rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' },
  badgeInfo: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeNeutral: { backgroundColor: '#F3F4F6', color: '#374151' },
  actionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' },
  actionCard: { backgroundColor: '#FFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', textDecoration: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', font: 'inherit' },
  actionCta: { display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#0033FF' },
  actionTitle: { fontSize: '1rem', fontWeight: 600, color: '#111', marginBottom: '0.35rem' },
  actionDesc: { fontSize: '0.8rem', color: '#9CA3AF', lineHeight: 1.5, fontWeight: 400 },
  banner: { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  bannerContent: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  bannerText: { color: '#166534', fontSize: '0.9rem' },
  bannerLink: { color: '#166534', fontWeight: 600, textDecoration: 'underline', marginLeft: '0.5rem' },
  contactBanner: {
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFE082',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    marginBottom: '1.5rem',
  },
  contactBannerText: { color: '#5D4037', fontSize: '0.9rem', margin: 0 },
  contactBannerLink: { color: '#0033FF', fontWeight: 600, textDecoration: 'underline' },
  bannerCloseBtn: { background: 'none', border: 'none', color: '#166534', cursor: 'pointer' },
  actionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  verifiedBadge: { backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600 },
  pendingBadge: { backgroundColor: '#FFF8E1', color: '#F57F17', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600 },
};

export default CustomerDashboard;
