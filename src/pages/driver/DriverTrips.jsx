import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchBookingsByDriverId } from '../../utils/supabaseBookings';
import { formatBookingDateRange } from '../../utils/bookings';
import { PORTAL } from '../../utils/portalTheme';
import {
  DRIVER_ACTIVE_STATUSES,
  DRIVER_HISTORY_STATUSES,
} from '../../utils/driverTrips';

const TABS = ['Active', 'History', 'All'];

const statusBadge = (status) => ({
  padding: '0.2rem 0.55rem',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: 700,
  backgroundColor:
    status === 'Active' ? '#E8F5E9'
      : status === 'Approved' ? '#E3F2FD'
        : status === 'Pending' ? '#FFF8E1'
          : status === 'Completed' ? '#F5F5F5' : '#FFEBEE',
  color:
    status === 'Active' ? '#2E7D32'
      : status === 'Approved' ? '#0033FF'
        : status === 'Pending' ? '#F57F17'
          : status === 'Completed' ? '#666' : '#C62828',
});

const DriverTrips = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const driverId = currentUser?.driverId;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const list = await fetchBookingsByDriverId(driverId);
        setBookings(list);
        const openId = location.state?.openBookingId;
        if (openId) {
          navigate(`/driver/trips/${openId}`, { replace: true, state: null });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [driverId, location.state?.openBookingId, navigate]);

  const filtered = useMemo(() => {
    let list = bookings;
    if (tab === 'Active') {
      list = list.filter((b) => DRIVER_ACTIVE_STATUSES.includes(b.status));
    } else if (tab === 'History') {
      list = list.filter((b) => DRIVER_HISTORY_STATUSES.includes(b.status));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (b) => b.vehicleName?.toLowerCase().includes(q)
          || b.customerName?.toLowerCase().includes(q)
          || b.docId?.toLowerCase().includes(q)
          || b.location?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bookings, tab, search]);

  if (!driverId) {
    return <p style={{ color: '#666' }}>Chauffeur account not linked. Contact your dispatcher.</p>;
  }

  return (
    <div className="page-enter">
      <h1 style={styles.pageTitle}>My trips</h1>
      <p style={styles.subtitle}>With-driver bookings assigned to you</p>

      <div style={styles.toolbar}>
        <div style={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              style={{
                ...styles.tab,
                ...(tab === t ? styles.tabActive : {}),
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={styles.searchWrap}>
          <Search size={18} color="#888" />
          <input
            type="search"
            placeholder="Search vehicle, customer, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <p style={styles.muted}>Loading trips…</p>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <p>No trips in this view. Assignments appear when dispatch links you to a with-driver booking.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map((b) => (
            <button
              key={b.docId}
              type="button"
              style={styles.card}
              onClick={() => navigate(`/driver/trips/${b.docId}`)}
            >
              <div style={styles.cardMain}>
                <div style={styles.cardTop}>
                  <strong>{b.vehicleName}</strong>
                  <span style={statusBadge(b.status)}>{b.status}</span>
                </div>
                <span style={styles.cardSub}>
                  {formatBookingDateRange(b.startDate, b.endDate)}
                </span>
                <span style={styles.cardSub}>
                  {b.customerName || 'Customer'}
                  {' '}
                  ·
                  {' '}
                  {b.location || 'Pickup TBD'}
                </span>
              </div>
              <ChevronRight size={20} color="#888" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  pageTitle: { margin: 0, fontSize: '1.75rem', fontWeight: 700 },
  subtitle: { margin: '0.35rem 0 1.5rem', color: '#666' },
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.25rem',
    alignItems: 'center',
  },
  tabs: { display: 'flex', gap: '0.35rem' },
  tab: {
    padding: '0.5rem 1rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    background: '#FFF',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: PORTAL.primaryBg,
    border: `1px solid ${PORTAL.primaryHex}`,
    color: PORTAL.primaryHex,
    fontWeight: 600,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flex: 1,
    minWidth: 220,
    maxWidth: 360,
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: '0.9rem',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    backgroundColor: '#FFF',
    border: '1px solid #E8E8E8',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  cardMain: { flex: 1 },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.35rem',
  },
  cardSub: { display: 'block', fontSize: '0.8rem', color: '#888' },
  empty: {
    padding: '2rem',
    backgroundColor: '#FFF',
    borderRadius: '12px',
    color: '#666',
    textAlign: 'center',
  },
  muted: { color: '#888' },
};

export default DriverTrips;
