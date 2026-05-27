import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader, Navigation, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PH_DEFAULT_CENTER } from '../utils/openstreetmap';
import { formatEtaLabel } from '../utils/travelTime';
import {
  getDriverDisplayPosition,
  formatDriverTrackingStatus,
  canViewDriverLiveTracking,
} from '../utils/driverTracking';
import { isWithDriverRentalMode } from '../utils/rentalMode';
import { hasValidCoordinates, resolveCustomerPickupPin } from '../utils/bookingLocation';
import { fetchBookingById } from '../utils/supabaseBookings';

const makeIcon = (className) => L.divIcon({
  className: 'driver-track-icon',
  html: `<div class="${className}" aria-hidden="true"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const hubIcon = makeIcon('driver-track-hub');
const customerIcon = makeIcon('driver-track-customer');
const driverIcon = makeIcon('driver-track-driver');

const BOOKING_POLL_MS = 12000;

const DriverTrackingPanel = ({ booking, compact = false }) => {
  const { currentUser } = useAuth();
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef({});
  const [driver, setDriver] = useState(null);
  const [liveBooking, setLiveBooking] = useState(booking);
  const [tick, setTick] = useState(Date.now());

  const viewerRole = currentUser?.role;
  const mayView = canViewDriverLiveTracking(viewerRole);
  const isStaffViewer = viewerRole === 'admin' || viewerRole === 'staff';

  const isWithDriver = isWithDriverRentalMode(booking?.rentalMode);
  const trackingBooking = liveBooking || booking;

  const customerPickup = resolveCustomerPickupPin(trackingBooking);
  const customerPin = customerPickup
    ? { lat: customerPickup.lat, lng: customerPickup.lng }
    : null;
  const hubPin = hasValidCoordinates({ lat: trackingBooking?.hubLat, lng: trackingBooking?.hubLng })
    ? { lat: trackingBooking.hubLat, lng: trackingBooking.hubLng }
    : null;

  const driverPosition = useMemo(
    () => getDriverDisplayPosition(trackingBooking, isStaffViewer ? driver : null, new Date(tick)),
    [trackingBooking, driver, tick, isStaffViewer]
  );

  const trackingStatus = formatDriverTrackingStatus(trackingBooking, isStaffViewer ? driver : null, driverPosition);
  const etaLabel = formatEtaLabel(trackingBooking?.estimatedArrivalMinutes);

  useEffect(() => {
    setLiveBooking(booking);
  }, [booking?.docId, booking?.driverLat, booking?.driverLng, booking?.driverLocationUpdatedAt, booking?.status]);

  useEffect(() => {
    if (!mayView || !isStaffViewer || !booking?.driverId) {
      setDriver(null);
      return undefined;
    }
    const unsub = onSnapshot(doc(db, 'drivers', booking.driverId), (snap) => {
      setDriver(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
    return unsub;
  }, [mayView, isStaffViewer, booking?.driverId]);

  useEffect(() => {
    if (!mayView || isStaffViewer || !booking?.docId || !isWithDriver) return undefined;

    let cancelled = false;
    const refresh = async () => {
      try {
        const fresh = await fetchBookingById(booking.docId);
        if (!cancelled && fresh) setLiveBooking(fresh);
      } catch (err) {
        console.error(err);
      }
    };

    refresh();
    const pollId = setInterval(refresh, BOOKING_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [mayView, isStaffViewer, booking?.docId, isWithDriver]);

  useEffect(() => {
    if (!mayView || !isWithDriver || !booking?.driverId) return undefined;
    const id = setInterval(() => setTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, [mayView, isWithDriver, booking?.driverId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !isWithDriver || !mayView) return undefined;

    const center = customerPin || hubPin || PH_DEFAULT_CENTER;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [isWithDriver, mayView]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setMarker = (key, coords, icon) => {
      if (!coords) {
        if (markersRef.current[key]) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
        return;
      }
      if (markersRef.current[key]) {
        markersRef.current[key].setLatLng([coords.lat, coords.lng]);
      } else {
        markersRef.current[key] = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
      }
    };

    setMarker('hub', hubPin, hubIcon);
    setMarker('customer', customerPin, customerIcon);
    setMarker('driver', driverPosition, driverIcon);

    const points = [hubPin, customerPin, driverPosition].filter(Boolean);
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds.pad(0.2));
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
    }
  }, [hubPin, customerPin, driverPosition]);

  if (!isWithDriver || !mayView) return null;

  const mapHeight = compact ? 180 : 240;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <Navigation size={16} color="#0033FF" />
        <span style={styles.headerTitle}>Chauffeur dispatch</span>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Est. travel from hub</span>
          <strong style={styles.statValue}>{etaLabel}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Dispatch hub</span>
          <strong style={styles.statValue}>{trackingBooking.hubName || '—'}</strong>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Chauffeur</span>
          <strong style={styles.statValue}>{trackingBooking.driverName || 'Not assigned'}</strong>
        </div>
      </div>

      <p style={styles.statusLine}>
        {!trackingBooking.driverId && <Loader size={14} className="spin" style={{ marginRight: 6 }} />}
        {trackingStatus}
        {driverPosition?.source === 'live' && (
          <span style={styles.liveBadge}>Live</span>
        )}
      </p>

      <div ref={containerRef} style={{ ...styles.map, height: mapHeight }} aria-label="Driver tracking map" />

      <div style={styles.legend}>
        <span style={styles.legendItem}><span style={{ ...styles.dot, backgroundColor: '#6B7280' }} /> Hub</span>
        <span style={styles.legendItem}><MapPin size={12} color="#0033FF" /> Your pin</span>
        <span style={styles.legendItem}><span style={{ ...styles.dot, backgroundColor: '#2E7D32' }} /> Chauffeur</span>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    padding: '0.85rem 1rem',
    backgroundColor: '#F0F4FF',
    border: '1px solid #D6E4FF',
    borderRadius: '8px',
  },
  header: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  headerTitle: { fontSize: '0.85rem', fontWeight: 700, color: '#111' },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '0.5rem',
  },
  stat: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  statLabel: { fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' },
  statValue: { fontSize: '0.85rem', color: '#111' },
  statusLine: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#444',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  liveBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    backgroundColor: '#2E7D32',
    color: '#FFF',
    padding: '0.1rem 0.4rem',
    borderRadius: '4px',
  },
  map: {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    fontSize: '0.72rem',
    color: '#666',
  },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
};

export default DriverTrackingPanel;
