import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Navigation, CalendarCheck, MapPin, Car, ArrowRight, Radio, ShieldAlert, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { fetchBookingsByDriverId } from '../../utils/supabaseBookings';
import { formatBookingDateRange } from '../../utils/bookings';
import {
  getActiveDriverTrip,
  isActiveDriverBooking,
  DRIVER_ACTIVE_STATUSES,
  buildMapsDirectionsUrl,
} from '../../utils/driverTrips';
import { getDriverGreetingName } from '../../utils/displayName';
import { getDriverDisplayPosition } from '../../utils/driverTracking';
import { isWithDriverRentalMode } from '../../utils/rentalMode';
import DriverTripMap from '../../components/DriverTripMap';
import TripDispatchSummary from '../../components/TripDispatchSummary';
import { useTripDispatchInfo } from '../../hooks/useTripDispatchInfo';
import { reconcileDriverDutyStatus } from '../../utils/driverDutySync';
import { PORTAL, portalBtn } from '../../utils/portalTheme';
import { formatRouteDistance } from '../../utils/routeGeometry';
import { formatEtaLabel } from '../../utils/travelTime';

const statusBadge = (status) => ({
  padding: '0.2rem 0.55rem',
  borderRadius: '4px',
  fontSize: '0.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  backgroundColor:
    status === 'Active' ? '#E8F5E9'
      : status === 'Approved' ? '#E3F2FD'
        : status === 'Pending' ? '#FFF8E1' : '#F5F5F5',
  color:
    status === 'Active' ? '#2E7D32'
      : status === 'Approved' ? '#0033FF'
        : status === 'Pending' ? '#F57F17' : '#666',
});

const DriverDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const driverId = currentUser?.driverId;
  const { driver, loading: driverLoading } = useDriverProfile(driverId);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapTick, setMapTick] = useState(Date.now());
  const [navTarget, setNavTarget] = useState(null);
  const [navRoute, setNavRoute] = useState(null);

  const activeTrip = useMemo(
    () => getActiveDriverTrip(bookings, driver?.assignedBookingId),
    [bookings, driver?.assignedBookingId]
  );

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const list = await fetchBookingsByDriverId(driverId);
        setBookings(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [driverId]);

  useEffect(() => {
    if (!driverId || !driver || loading) return undefined;
    reconcileDriverDutyStatus(driver, bookings).catch(console.error);
    return undefined;
  }, [driverId, driver, bookings, loading]);

  useEffect(() => {
    if (!activeTrip || !['Approved', 'Active'].includes(activeTrip.status)) return undefined;
    const id = setInterval(() => setMapTick(Date.now()), 10000);
    return () => clearInterval(id);
  }, [activeTrip?.docId, activeTrip?.status]);

  const myPosition = useMemo(
    () => (activeTrip ? getDriverDisplayPosition(activeTrip, driver, new Date(mapTick)) : null),
    [activeTrip, driver, mapTick]
  );

  const {
    hubOrigin: activeHubOrigin,
    customerPickup: activeCustomerPickup,
    driveMinutes: activeDriveMinutes,
    driveDistanceKm: activeDriveDistanceKm,
    loading: activeDispatchLoading,
  } = useTripDispatchInfo(activeTrip, driver);

  const greetingName = useMemo(
    () => getDriverGreetingName(driver, currentUser),
    [driver?.name, currentUser?.name, currentUser?.displayName]
  );

  const customerNavUrl = activeCustomerPickup
    ? buildMapsDirectionsUrl(activeCustomerPickup.lat, activeCustomerPickup.lng)
    : null;
  const hubNavUrl = activeHubOrigin
    ? buildMapsDirectionsUrl(activeHubOrigin.lat, activeHubOrigin.lng)
    : null;

  const toggleNavPreview = (target) => {
    setNavTarget((prev) => {
      if (prev === target) {
        setNavRoute(null);
        return null;
      }
      return target;
    });
  };

  const upcoming = bookings.filter(
    (b) => DRIVER_ACTIVE_STATUSES.includes(b.status) && b.docId !== activeTrip?.docId
  );
  const onDutyCount = bookings.filter((b) => b.status === 'Active').length;
  const assignedCount = bookings.filter((b) => isActiveDriverBooking(b)).length;

  if (!driverId) {
    return (
      <div className="page-enter">
        <div style={styles.alertCard}>
          <ShieldAlert size={28} color="#F57F17" />
          <h2 style={styles.alertTitle}>Account not linked</h2>
          <p style={styles.alertText}>
            Your login does not have a chauffeur ID. Ask an admin to set
            {' '}
            <code style={styles.code}>driverId</code>
            {' '}
            on your user profile in Firestore (matching your driver record, e.g. DRV-1001).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div style={styles.welcomeSection}>
        <div>
          <p style={styles.portalLabel}>Chauffeur portal</p>
          <h1 style={styles.welcomeTitle}>
            Hello,
            {' '}
            {greetingName}
          </h1>
          <p style={styles.welcomeSubtitle}>
            Trips, live navigation, and assignment status.
            {' '}
            Hub:
            {' '}
            {driver?.location || '—'}
            {' '}
            · Status:
            {' '}
            <strong>{driver?.status || '—'}</strong>
          </p>
        </div>
        <Link to="/driver/trips" style={styles.primaryBtn}>
          <CalendarCheck size={18} />
          My trips
          <ArrowRight size={16} />
        </Link>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#E8F5E9' }}>
            <Navigation size={20} color={PORTAL.primaryHex} />
          </div>
          <div>
            <div style={styles.statValue}>{driver?.status || '—'}</div>
            <div style={styles.statLabel}>Availability</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#E3F2FD' }}>
            <Car size={20} color={PORTAL.success} />
          </div>
          <div>
            <div style={styles.statValue}>{onDutyCount}</div>
            <div style={styles.statLabel}>Active trips</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#FFF8E1' }}>
            <CalendarCheck size={20} color="#F57F17" />
          </div>
          <div>
            <div style={styles.statValue}>{assignedCount}</div>
            <div style={styles.statLabel}>Assigned jobs</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: '#F3E5F5' }}>
            <MapPin size={20} color="#6A1B9A" />
          </div>
          <div>
            <div style={styles.statValue}>{driver?.completedTrips ?? 0}</div>
            <div style={styles.statLabel}>Completed trips</div>
          </div>
        </div>
      </div>

      {activeTrip && ['Approved', 'Active'].includes(activeTrip.status) && (
        <p style={styles.gpsLive}>
          <Radio size={14} />
          Location sharing is automatic while this trip is approved or active.
        </p>
      )}

      {activeTrip ? (
        <div style={styles.activeCard}>
          <h2 style={styles.sectionTitle}>Current trip</h2>
          <div style={styles.tripHeader}>
            <span style={statusBadge(activeTrip.status)}>{activeTrip.status}</span>
            <span style={styles.tripId}>
              #
              {activeTrip.docId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p style={styles.tripVehicle}>{activeTrip.vehicleName}</p>
          <p style={styles.tripMeta}>
            {formatBookingDateRange(activeTrip.startDate, activeTrip.endDate)}
          </p>
          {isWithDriverRentalMode(activeTrip.rentalMode) && (
            <>
              <div style={styles.dispatchCompact}>
                <TripDispatchSummary
                  booking={activeTrip}
                  hubOrigin={activeHubOrigin}
                  customerPickup={activeCustomerPickup}
                  driveMinutes={activeDriveMinutes}
                  driveDistanceKm={activeDriveDistanceKm}
                  loading={activeDispatchLoading}
                  compact
                  hideNavButtons
                />
              </div>
              <div style={styles.mapActionsBlock}>
                <DriverTripMap
                  booking={activeTrip}
                  hubOrigin={activeHubOrigin}
                  driverPosition={myPosition}
                  height={300}
                  showLegend
                  navigationTarget={navTarget}
                  onNavigationRoute={setNavRoute}
                />
                <div style={styles.tripActions}>
                  {navRoute && (
                    <p style={styles.routeMeta}>
                      Route preview:
                      {' '}
                      {formatEtaLabel(navRoute.durationMinutes)}
                      {' '}
                      ·
                      {' '}
                      {formatRouteDistance(navRoute.distanceKm)}
                    </p>
                  )}
                  {customerNavUrl && (
                    <button
                      type="button"
                      style={navTarget === 'customer' ? styles.navigateActive : styles.navigatePrimary}
                      onClick={() => toggleNavPreview('customer')}
                    >
                      <Navigation size={18} />
                      {navTarget === 'customer' ? 'Hide route preview' : 'Preview route to customer'}
                    </button>
                  )}
                  {navTarget === 'customer' && customerNavUrl && (
                    <a
                      href={customerNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.openMapsLink}
                    >
                      <ExternalLink size={15} />
                      Start turn-by-turn in Google Maps
                    </a>
                  )}
                  {hubNavUrl && (
                    <button
                      type="button"
                      style={navTarget === 'hub' ? styles.navigateActive : styles.navigateSecondary}
                      onClick={() => toggleNavPreview('hub')}
                    >
                      <MapPin size={16} />
                      {navTarget === 'hub' ? 'Hide hub route' : 'Preview route to vehicle hub'}
                    </button>
                  )}
                  {navTarget === 'hub' && hubNavUrl && (
                    <a
                      href={hubNavUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.openMapsLink}
                    >
                      <ExternalLink size={15} />
                      Start turn-by-turn in Google Maps
                    </a>
                  )}
                  <button
                    type="button"
                    style={styles.openTripBtn}
                    onClick={() => navigate(`/driver/trips/${activeTrip.docId}`)}
                  >
                    Open trip
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
          {!isWithDriverRentalMode(activeTrip.rentalMode) && (
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={() => navigate(`/driver/trips/${activeTrip.docId}`)}
            >
              Open trip
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        !loading && !driverLoading && (
          <div style={styles.emptyCard}>
            <p>No active trip. When dispatch assigns you a with-driver booking, it will appear here.</p>
            <Link to="/driver/trips" style={styles.linkBtn}>View all trips</Link>
          </div>
        )
      )}

      {upcoming.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Upcoming</h2>
          {upcoming.slice(0, 3).map((b) => (
            <button
              key={b.docId}
              type="button"
              style={styles.listRow}
              onClick={() => navigate(`/driver/trips/${b.docId}`)}
            >
              <div>
                <strong>{b.vehicleName}</strong>
                <span style={styles.rowSub}>{formatBookingDateRange(b.startDate, b.endDate)}</span>
              </div>
              <span style={statusBadge(b.status)}>{b.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  portalLabel: {
    margin: '0 0 0.35rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: PORTAL.primaryHex,
  },
  welcomeTitle: { margin: 0, fontSize: '1.75rem', fontWeight: 700 },
  welcomeSubtitle: { margin: '0.35rem 0 0', color: '#666', fontSize: '0.95rem' },
  primaryBtn: {
    ...portalBtn.primary,
    gap: '0.5rem',
    border: 'none',
  },
  linkBtn: { color: PORTAL.primaryHex, fontWeight: 600, textDecoration: 'none' },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.25rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    border: '1px solid #E8E8E8',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: '1.1rem', fontWeight: 700 },
  statLabel: { fontSize: '0.8rem', color: '#888' },
  activeCard: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.5rem',
    border: `1px solid ${PORTAL.borderHex}`,
    marginBottom: '1.5rem',
  },
  mapActionsBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '1rem',
  },
  tripActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navigatePrimary: {
    ...portalBtn.primary,
    ...portalBtn.primaryLarge,
    width: '100%',
    cursor: 'pointer',
  },
  navigateActive: {
    ...portalBtn.primary,
    ...portalBtn.primaryLarge,
    width: '100%',
    cursor: 'pointer',
    boxShadow: `0 0 0 3px ${PORTAL.primaryBg}`,
  },
  navigateSecondary: {
    ...portalBtn.outline,
    width: '100%',
    cursor: 'pointer',
  },
  openMapsLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: PORTAL.primaryHex,
    textDecoration: 'none',
    padding: '0.25rem 0',
  },
  routeMeta: {
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#444',
  },
  openTripBtn: {
    ...portalBtn.secondary,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.5rem',
    color: '#666',
    marginBottom: '1.5rem',
  },
  section: { marginTop: '1rem' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700 },
  tripHeader: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' },
  tripId: { fontSize: '0.8rem', color: '#888' },
  tripVehicle: { margin: '0 0 0.25rem', fontWeight: 600, fontSize: '1.05rem' },
  tripMeta: { margin: '0.2rem 0', fontSize: '0.85rem', color: '#555' },
  dispatchCompact: { margin: '1rem 0' },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '1rem',
    marginBottom: '0.5rem',
    backgroundColor: '#FFF',
    border: '1px solid #E8E8E8',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  rowSub: { display: 'block', fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' },
  gpsLive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.85rem',
    color: PORTAL.success,
    marginBottom: '0.75rem',
  },
  gpsError: { color: '#C62828', fontSize: '0.85rem', marginBottom: '0.75rem' },
  alertCard: {
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFE082',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
    maxWidth: 480,
    margin: '2rem auto',
  },
  alertTitle: { margin: '0.75rem 0 0.5rem' },
  alertText: { color: '#555', lineHeight: 1.5, margin: 0 },
  code: {
    backgroundColor: '#F5F5F5',
    padding: '0.1rem 0.35rem',
    borderRadius: '4px',
    fontSize: '0.85em',
  },
};

export default DriverDashboard;
