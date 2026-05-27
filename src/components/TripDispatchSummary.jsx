import React from 'react';
import { MapPin, Navigation, Car, Clock, ExternalLink, Loader } from 'lucide-react';
import { formatEtaLabel, formatDriveDistance, formatPickupCoordinates } from '../utils/tripDispatchInfo';
import { formatRouteDistance } from '../utils/routeGeometry';
import { formatPickupAddressLabel } from '../utils/bookingLocation';
import { buildMapsDirectionsUrl } from '../utils/driverTrips';
import { PORTAL, portalBtn } from '../utils/portalTheme';

const DetailCell = ({ label, value, mono = false }) => (
  <div style={styles.detailCell}>
    <span style={styles.detailLabel}>{label}</span>
    <span style={mono ? styles.detailValueMono : styles.detailValue}>{value || '—'}</span>
  </div>
);

const TripDispatchSummary = ({
  booking,
  hubOrigin,
  customerPickup,
  driveMinutes,
  driveDistanceKm,
  loading = false,
  compact = false,
  hideNavButtons = false,
  navigationTarget = null,
  onPreviewNavigate = null,
  navigationRoute = null,
}) => {
  const hubUrl = hubOrigin
    ? buildMapsDirectionsUrl(hubOrigin.lat, hubOrigin.lng)
    : null;
  const customerUrl = customerPickup
    ? buildMapsDirectionsUrl(customerPickup.lat, customerPickup.lng)
    : null;

  const hubCoords = hubOrigin
    ? formatPickupCoordinates({ lat: hubOrigin.lat, lng: hubOrigin.lng })
    : '';

  return (
    <div style={compact ? styles.compact : styles.wrapper}>
      <div style={styles.originBanner}>
        <Car size={18} color="#6B7280" />
        <div>
          <span style={styles.originLabel}>Vehicle originates from</span>
          <strong style={styles.originName}>{hubOrigin?.name || booking?.hubName || '—'}</strong>
          {hubOrigin?.vehicleLocation && hubOrigin.vehicleLocation !== hubOrigin.name && (
            <span style={styles.originSub}>
              Fleet base:
              {' '}
              {hubOrigin.vehicleLocation}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p style={styles.muted}>
          <Loader size={14} className="spin" style={{ marginRight: 6 }} />
          Calculating drive time from hub…
        </p>
      ) : (
        <div style={styles.etaCard}>
          <Clock size={18} color={PORTAL.primaryHex} />
          <div>
            <span style={styles.etaLabel}>Est. drive hub → customer</span>
            <strong style={styles.etaValue}>
              {formatEtaLabel(driveMinutes)}
              {Number.isFinite(driveDistanceKm) && (
                <span style={styles.etaDistance}>
                  {' '}
                  (
                  {formatDriveDistance(driveDistanceKm)}
                  )
                </span>
              )}
            </strong>
          </div>
        </div>
      )}

      <div style={compact ? styles.detailGridCompact : styles.detailGrid}>
        <DetailCell label="Customer" value={booking?.customerName} />
        <DetailCell
          label="Pickup"
          value={customerPickup?.label || formatPickupAddressLabel(booking?.location)}
        />
        {customerPickup && (
          <DetailCell
            label="Customer pin"
            value={formatPickupCoordinates(customerPickup)}
            mono
          />
        )}
        <DetailCell label="Hub address" value={hubOrigin?.address} />
        {hubCoords && (
          <DetailCell label="Hub pin" value={hubCoords} mono />
        )}
      </div>

      {!hideNavButtons && (
        <div style={styles.navBtns}>
          {onPreviewNavigate && customerUrl && (
            <button
              type="button"
              style={navigationTarget === 'customer' ? styles.navBtnActive : styles.navBtnPrimary}
              onClick={() => onPreviewNavigate('customer')}
            >
              <Navigation size={16} />
              {navigationTarget === 'customer' ? 'Hide route preview' : 'Preview route to customer'}
            </button>
          )}
          {onPreviewNavigate && hubUrl && (
            <button
              type="button"
              style={navigationTarget === 'hub' ? styles.navBtnActive : styles.navBtnOutline}
              onClick={() => onPreviewNavigate('hub')}
            >
              <MapPin size={16} />
              {navigationTarget === 'hub' ? 'Hide hub route' : 'Preview route to vehicle hub'}
            </button>
          )}
          {navigationRoute && (
            <p style={styles.routeMeta}>
              Route:
              {' '}
              {formatEtaLabel(navigationRoute.durationMinutes)}
              {' '}
              ·
              {' '}
              {formatRouteDistance(navigationRoute.distanceKm)}
            </p>
          )}
          {navigationTarget === 'customer' && customerUrl && (
            <a href={customerUrl} target="_blank" rel="noopener noreferrer" style={styles.navBtnMaps}>
              <ExternalLink size={14} />
              Start turn-by-turn in Google Maps
            </a>
          )}
          {navigationTarget === 'hub' && hubUrl && (
            <a href={hubUrl} target="_blank" rel="noopener noreferrer" style={styles.navBtnMaps}>
              <ExternalLink size={14} />
              Start turn-by-turn in Google Maps
            </a>
          )}
          {!onPreviewNavigate && hubUrl && (
            <a href={hubUrl} target="_blank" rel="noopener noreferrer" style={styles.navBtn}>
              <MapPin size={16} />
              Navigate to vehicle hub
              <ExternalLink size={14} />
            </a>
          )}
          {!onPreviewNavigate && customerUrl && (
            <a href={customerUrl} target="_blank" rel="noopener noreferrer" style={styles.navBtnPrimary}>
              <Navigation size={16} />
              Navigate to customer
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  compact: { display: 'flex', flexDirection: 'column', gap: '0.65rem' },
  originBanner: {
    display: 'flex',
    gap: '0.65rem',
    padding: '0.75rem 0.85rem',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  originLabel: {
    display: 'block',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
  },
  originName: { display: 'block', fontSize: '0.95rem', color: '#111' },
  originSub: { display: 'block', fontSize: '0.78rem', color: '#666', marginTop: '0.15rem' },
  etaCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    padding: '0.75rem 0.85rem',
    backgroundColor: PORTAL.primaryBg,
    borderRadius: '8px',
    border: `1px solid ${PORTAL.primaryBgAlt}`,
  },
  etaLabel: { display: 'block', fontSize: '0.72rem', color: '#666' },
  etaValue: { display: 'block', fontSize: '1rem', color: PORTAL.primaryHex },
  etaDistance: { fontSize: '0.85rem', fontWeight: 500, color: '#555' },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.85rem 1rem',
    marginTop: '0.15rem',
  },
  detailGridCompact: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '0.75rem 0.85rem',
    marginTop: '0.1rem',
  },
  detailCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    minWidth: 0,
    padding: '0.65rem 0.75rem',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    border: '1px solid #ECECEC',
  },
  detailLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#6B7280',
    lineHeight: 1.2,
  },
  detailValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  detailValueMono: {
    fontSize: '0.82rem',
    fontWeight: 600,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    color: PORTAL.primaryHex,
    lineHeight: 1.4,
    wordBreak: 'break-all',
  },
  navBtns: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' },
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
    width: '100%',
    cursor: 'pointer',
  },
  navBtnOutline: {
    ...portalBtn.outline,
    padding: '0.6rem',
    fontSize: '0.85rem',
    width: '100%',
    cursor: 'pointer',
  },
  navBtnActive: {
    ...portalBtn.primary,
    padding: '0.6rem',
    fontSize: '0.85rem',
    width: '100%',
    cursor: 'pointer',
    boxShadow: `0 0 0 2px ${PORTAL.primaryBg}`,
  },
  navBtnMaps: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.55rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: PORTAL.primaryHex,
    textDecoration: 'none',
  },
  routeMeta: {
    margin: 0,
    fontSize: '0.82rem',
    color: '#555',
    fontWeight: 600,
  },
  muted: { margin: 0, fontSize: '0.85rem', color: '#888', display: 'flex', alignItems: 'center' },
};

export default TripDispatchSummary;
