import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, CheckCircle, Radio, Loader, MapPin, Users, Save,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { fetchBookingById } from '../../utils/supabaseBookings';
import { formatBookingDateRange } from '../../utils/bookings';
import {
  startDriverTrip,
  completeDriverTrip,
  setDriverAvailability,
  updateTripPhase,
  saveHandoverNotes,
  TRIP_PHASES,
  TRIP_PHASE_LABELS,
} from '../../utils/driverTrips';
import { shouldAutoTrackDriverGps } from '../../utils/driverLocationSync';
import DriverTripMap from '../../components/DriverTripMap';
import TripDispatchSummary from '../../components/TripDispatchSummary';
import { useTripDispatchInfo } from '../../hooks/useTripDispatchInfo';
import { getRentalModeLabel, isWithDriverRentalMode } from '../../utils/rentalMode';
import { getDriverDisplayPosition } from '../../utils/driverTracking';
import { PORTAL, portalBtn } from '../../utils/portalTheme';

const DriverTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const driverId = currentUser?.driverId;
  const { driver, loading: driverLoading } = useDriverProfile(driverId);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mapTick, setMapTick] = useState(Date.now());
  const [navTarget, setNavTarget] = useState(null);
  const [navRoute, setNavRoute] = useState(null);
  const [handoverDraft, setHandoverDraft] = useState('');
  const [handoverSaving, setHandoverSaving] = useState(false);

  const loadBooking = async () => {
    if (!tripId) return;
    try {
      const b = await fetchBookingById(tripId);
      setBooking(b);
      setHandoverDraft(b?.handoverNotes || '');
    } catch (err) {
      console.error(err);
      setError('Could not load trip.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadBooking();
  }, [tripId]);

  const isAssignedToMe = booking?.driverId === driverId;
  const autoTrack = isAssignedToMe && booking && shouldAutoTrackDriverGps(booking);

  useEffect(() => {
    if (!autoTrack) return undefined;
    const id = setInterval(() => setMapTick(Date.now()), 10000);
    return () => clearInterval(id);
  }, [autoTrack, booking?.docId]);

  const {
    hubOrigin,
    customerPickup,
    driveMinutes,
    driveDistanceKm,
    loading: dispatchLoading,
  } = useTripDispatchInfo(booking, driver);

  const myPosition = useMemo(
    () => (booking ? getDriverDisplayPosition(booking, driver, new Date(mapTick)) : null),
    [booking, driver, mapTick]
  );

  const handleStartTrip = async () => {
    if (!booking || !driver) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await startDriverTrip({
        booking,
        driver,
        customerUserId: booking.userId,
      });
      setMessage('Trip started.');
      await loadBooking();
    } catch (err) {
      setError(err.message || 'Could not start trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!booking || !driver) return;
    if (!window.confirm('Mark this trip as completed?')) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await completeDriverTrip({
        booking,
        driver,
        customerUserId: booking.userId,
      });
      setMessage('Trip completed. The vehicle is now available for customers and dispatch.');
      await loadBooking();
    } catch (err) {
      setError(err.message || 'Could not complete trip.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoAvailable = async () => {
    if (!driver) return;
    if (driver.assignedBookingId) {
      setError('Complete your current trip before going available.');
      return;
    }
    setActionLoading(true);
    try {
      await setDriverAvailability(driver, 'Available');
      setMessage('You are now available for new assignments.');
    } catch (err) {
      setError('Could not update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhase = async (phase) => {
    if (!booking) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      await updateTripPhase({
        booking,
        phase,
        customerUserId: booking.userId,
        driverName: driver?.name,
      });
      setMessage(TRIP_PHASE_LABELS[phase] || 'Status updated.');
      await loadBooking();
    } catch (err) {
      setError(err.message || 'Could not update trip status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveHandover = async () => {
    if (!booking?.docId) return;
    setHandoverSaving(true);
    try {
      await saveHandoverNotes(booking.docId, handoverDraft);
      setMessage('Handover notes saved.');
      await loadBooking();
    } catch (err) {
      setError('Could not save handover notes.');
    } finally {
      setHandoverSaving(false);
    }
  };

  const handleGoOffDuty = async () => {
    if (!driver) return;
    if (driver.assignedBookingId) {
      setError('Complete your trip before going off duty.');
      return;
    }
    setActionLoading(true);
    try {
      await setDriverAvailability(driver, 'Off Duty');
      setMessage('You are off duty.');
    } catch (err) {
      setError('Could not update status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!driverId) {
    return <p>Account not linked.</p>;
  }

  if (loading || driverLoading) {
    return <p style={{ color: '#888' }}>Loading trip…</p>;
  }

  if (!booking) {
    return (
      <div>
        <Link to="/driver/trips" style={styles.backLink}>
          <ArrowLeft size={18} />
          Back to trips
        </Link>
        <p>Trip not found.</p>
      </div>
    );
  }

  if (!isAssignedToMe) {
    return (
      <div>
        <Link to="/driver/trips" style={styles.backLink}>
          <ArrowLeft size={18} />
          Back
        </Link>
        <p style={{ color: '#C62828' }}>This trip is not assigned to your chauffeur ID.</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <Link to="/driver/trips" style={styles.backLink}>
        <ArrowLeft size={18} />
        Back to trips
      </Link>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{booking.vehicleName}</h1>
          <p style={styles.meta}>
            {formatBookingDateRange(booking.startDate, booking.endDate)}
            {' '}
            ·
            {' '}
            {getRentalModeLabel(booking.rentalMode)}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <span style={styles.statusPill}>{booking.status}</span>
          {booking.tripPhase && (
            <span style={styles.phasePill}>
              {TRIP_PHASE_LABELS[booking.tripPhase] || booking.tripPhase}
            </span>
          )}
        </div>
      </div>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Dispatch</h2>
          <TripDispatchSummary
            booking={booking}
            hubOrigin={hubOrigin}
            customerPickup={customerPickup}
            driveMinutes={driveMinutes}
            driveDistanceKm={driveDistanceKm}
            loading={dispatchLoading}
            navigationTarget={navTarget}
            navigationRoute={navRoute}
            onPreviewNavigate={(target) => {
              setNavTarget((prev) => {
                if (prev === target) {
                  setNavRoute(null);
                  return null;
                }
                return target;
              });
            }}
          />
        </section>

        {isWithDriverRentalMode(booking.rentalMode) && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Route map</h2>
            <p style={styles.mapHint}>
              Gray = vehicle origin hub · Blue = customer · Green = you
            </p>
            <DriverTripMap
              booking={booking}
              hubOrigin={hubOrigin}
              driverPosition={myPosition}
              height={300}
              showLegend
              navigationTarget={navTarget}
              onNavigationRoute={setNavRoute}
            />
            {myPosition?.source === 'live' && (
              <p style={styles.liveNote}>
                <Radio size={14} />
                Live GPS — you are on the map
              </p>
            )}
            {!myPosition && autoTrack && (
              <p style={styles.mapHint}>Waiting for GPS… allow location access on this device.</p>
            )}
            {autoTrack && (
              <p style={styles.liveNote}>
                Customers and dispatch see the same live position when sharing is on.
              </p>
            )}
          </section>
        )}
      </div>

      <section style={styles.actionsCard}>
        <h2 style={styles.cardTitle}>Trip actions</h2>

        {booking.status === 'Approved' && (
          <button
            type="button"
            style={styles.actionPrimary}
            onClick={handleStartTrip}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader size={18} className="spin" /> : <Play size={18} />}
            Start trip (en route)
          </button>
        )}

        {booking.status === 'Active' && (
          <div style={styles.phaseActions}>
            {(!booking.tripPhase || booking.tripPhase === TRIP_PHASES.EN_ROUTE) && (
              <button
                type="button"
                style={styles.phaseBtn}
                onClick={() => handlePhase(TRIP_PHASES.ARRIVED)}
                disabled={actionLoading}
              >
                <MapPin size={18} />
                Arrived at pickup
              </button>
            )}
            {booking.tripPhase === TRIP_PHASES.ARRIVED && (
              <button
                type="button"
                style={styles.phaseBtn}
                onClick={() => handlePhase(TRIP_PHASES.ONBOARD)}
                disabled={actionLoading}
              >
                <Users size={18} />
                Passenger onboard
              </button>
            )}
            {(booking.tripPhase === TRIP_PHASES.ONBOARD
              || booking.tripPhase === TRIP_PHASES.ARRIVED) && (
              <button
                type="button"
                style={styles.actionComplete}
                onClick={handleCompleteTrip}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader size={18} className="spin" /> : <CheckCircle size={18} />}
                Complete trip
              </button>
            )}
            {booking.tripPhase === TRIP_PHASES.EN_ROUTE && (
              <>
                <p style={styles.muted}>Mark arrival before completing the trip, or use emergency complete below.</p>
                <button
                  type="button"
                  style={styles.secondaryBtn}
                  onClick={handleCompleteTrip}
                  disabled={actionLoading}
                >
                  Emergency complete
                </button>
              </>
            )}
          </div>
        )}

        {booking.status === 'Active' && isWithDriverRentalMode(booking.rentalMode) && (
          <div style={styles.handoverBlock}>
            <label style={styles.handoverLabel}>
              Handover notes (damage, fuel, extras)
              <textarea
                value={handoverDraft}
                onChange={(e) => setHandoverDraft(e.target.value)}
                rows={3}
                style={styles.handoverInput}
                placeholder="Optional notes for dispatch and support"
              />
            </label>
            <button
              type="button"
              style={styles.secondaryBtn}
              onClick={handleSaveHandover}
              disabled={handoverSaving}
            >
              {handoverSaving ? <Loader size={16} className="spin" /> : <Save size={16} />}
              Save notes
            </button>
          </div>
        )}

        {['Completed', 'Cancelled', 'No-Show'].includes(booking.status) && (
          <p style={styles.muted}>This trip is closed.</p>
        )}

        {booking.status === 'Pending' && (
          <p style={styles.muted}>Waiting for admin approval before you can start.</p>
        )}
      </section>

      <section style={styles.availabilityCard}>
        <h2 style={styles.cardTitle}>Your availability</h2>
        <p style={styles.muted}>
          Current:
          {' '}
          <strong>{driver?.status}</strong>
        </p>
        <div style={styles.availBtns}>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={handleGoAvailable}
            disabled={actionLoading || driver?.status === 'Available'}
          >
            Go available
          </button>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={handleGoOffDuty}
            disabled={actionLoading || driver?.status === 'Off Duty'}
          >
            Go off duty
          </button>
        </div>
      </section>
    </div>
  );
};

const styles = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: PORTAL.primaryHex,
    textDecoration: 'none',
    fontWeight: 600,
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700 },
  meta: { margin: '0.35rem 0 0', color: '#666', fontSize: '0.9rem' },
  statusPill: {
    padding: '0.35rem 0.75rem',
    borderRadius: '6px',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  phasePill: {
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    backgroundColor: PORTAL.primaryBg,
    color: PORTAL.primaryHex,
    fontWeight: 600,
    fontSize: '0.72rem',
  },
  phaseActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    alignItems: 'flex-start',
  },
  phaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: PORTAL.primaryBg,
    color: PORTAL.primaryHex,
    border: `1px solid ${PORTAL.primaryHex}`,
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  handoverBlock: { marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #EEE' },
  handoverLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#444',
    marginBottom: '0.75rem',
  },
  handoverInput: {
    fontWeight: 400,
    padding: '0.65rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    fontSize: '0.9rem',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #E8E8E8',
  },
  cardTitle: { margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '0.65rem',
    fontSize: '0.9rem',
    color: '#666',
  },
  pickupText: { maxWidth: '60%', textAlign: 'right', fontSize: '0.85rem' },
  coordsText: {
    maxWidth: '60%',
    textAlign: 'right',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    color: PORTAL.primaryHex,
  },
  navBtns: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.6rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#333',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  navBtnPrimary: {
    ...portalBtn.primary,
    padding: '0.6rem',
    fontSize: '0.85rem',
  },
  actionsCard: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #E8E8E8',
    marginBottom: '1rem',
  },
  availabilityCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid #E8E8E8',
  },
  actionPrimary: {
    ...portalBtn.primary,
    padding: '0.75rem 1.25rem',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  actionComplete: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: PORTAL.success,
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.95rem',
  },
  secondaryBtn: {
    padding: '0.55rem 1rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    background: '#FFF',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    marginRight: '0.5rem',
  },
  availBtns: { marginTop: '0.75rem' },
  gpsManual: { marginTop: '0.75rem' },
  liveNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: PORTAL.success,
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
  mapHint: { margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#666' },
  success: { color: PORTAL.success, marginBottom: '0.75rem' },
  error: { color: '#C62828', marginBottom: '0.75rem' },
  muted: { color: '#888', fontSize: '0.9rem' },
};

export default DriverTripDetail;
