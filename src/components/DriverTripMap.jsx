import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader, Navigation } from 'lucide-react';
import { PH_DEFAULT_CENTER } from '../utils/openstreetmap';
import { hasValidCoordinates, resolveCustomerPickupPin } from '../utils/bookingLocation';
import { distanceKm } from '../utils/travelTime';
import {
  fetchDrivingRoute,
  bearingDegrees,
  closestRouteIndex,
  lookAheadOnRoute,
} from '../utils/routeGeometry';
import { PORTAL } from '../utils/portalTheme';

const ROUTE_FIT_PADDING = [56, 56];
const NAV_ZOOM = 17;

const getRouteFitMaxZoom = (points) => {
  if (points.length < 2) return 16;
  let maxKm = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      maxKm = Math.max(maxKm, distanceKm(points[i], points[j]));
    }
  }
  if (maxKm > 80) return 10;
  if (maxKm > 40) return 11;
  if (maxKm > 15) return 13;
  if (maxKm > 5) return 14;
  return 16;
};

const makeIcon = (className, extraHtml = '') => L.divIcon({
  className: 'driver-track-icon',
  html: `<div class="${className}" aria-hidden="true">${extraHtml}</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const makeNavDriverIcon = (bearing) => L.divIcon({
  className: 'driver-track-icon',
  html: `<div class="driver-track-driver-nav" style="transform: rotate(${bearing}deg)" aria-hidden="true"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 18],
});

const hubIcon = makeIcon('driver-track-hub');
const customerIcon = makeIcon('driver-track-customer');
const driverIcon = makeIcon('driver-track-driver');

const previewLineStyle = {
  color: PORTAL.primaryHex,
  weight: 5,
  opacity: 0.45,
  dashArray: '10 8',
  lineCap: 'round',
  lineJoin: 'round',
};

const activeLineStyle = {
  color: PORTAL.primaryHex,
  weight: 6,
  opacity: 0.92,
  lineCap: 'round',
  lineJoin: 'round',
};

/**
 * @param {null|'customer'|'hub'} navigationTarget — preview turn-by-turn path before opening external maps
 */
const DriverTripMap = ({
  booking,
  hubOrigin,
  driverPosition,
  height = 300,
  showLegend = false,
  navigationTarget = null,
  onNavigationRoute = null,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef({ preview: null, active: null });
  const abortRef = useRef(null);

  const [routeLoading, setRouteLoading] = useState(false);

  const hubPin = hasValidCoordinates(hubOrigin)
    ? { lat: hubOrigin.lat, lng: hubOrigin.lng }
    : hasValidCoordinates({ lat: booking?.hubLat, lng: booking?.hubLng })
      ? { lat: booking.hubLat, lng: booking.hubLng }
      : null;
  const customerPickup = resolveCustomerPickupPin(booking);
  const customerPin = customerPickup
    ? { lat: customerPickup.lat, lng: customerPickup.lng }
    : null;

  const clearPolyline = (key) => {
    const map = mapRef.current;
    if (polylinesRef.current[key] && map) {
      map.removeLayer(polylinesRef.current[key]);
      polylinesRef.current[key] = null;
    }
  };

  const drawPolyline = (key, coords, style) => {
    const map = mapRef.current;
    if (!map || !coords?.length) return;
    clearPolyline(key);
    const latlngs = coords.map((c) => [c.lat, c.lng]);
    polylinesRef.current[key] = L.polyline(latlngs, style).addTo(map);
  };

  const fitToCoords = (coords, maxZoomOverride) => {
    const map = mapRef.current;
    if (!map || !coords?.length) return;
    if (coords.length === 1) {
      map.setView([coords[0].lat, coords[0].lng], 16, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(coords.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds, {
      padding: ROUTE_FIT_PADDING,
      maxZoom: maxZoomOverride ?? getRouteFitMaxZoom(coords),
      animate: true,
    });
  };

  const setMarker = (key, coords, icon) => {
    const map = mapRef.current;
    if (!map) return;
    if (!coords) {
      if (markersRef.current[key]) {
        map.removeLayer(markersRef.current[key]);
        delete markersRef.current[key];
      }
      return;
    }
    if (markersRef.current[key]) {
      markersRef.current[key].setLatLng([coords.lat, coords.lng]);
      markersRef.current[key].setIcon(icon);
    } else {
      markersRef.current[key] = L.marker([coords.lat, coords.lng], { icon }).addTo(map);
    }
  };

  const applyNavigationPov = (routeCoords, origin, useNavChevron = false) => {
    const map = mapRef.current;
    if (!map || !routeCoords?.length || !origin) return;

    const idx = closestRouteIndex(routeCoords, origin);
    const ahead = lookAheadOnRoute(routeCoords, idx) || routeCoords[Math.min(idx + 1, routeCoords.length - 1)];
    const heading = bearingDegrees(origin, ahead);

    if (useNavChevron) {
      if (markersRef.current.driver) map.removeLayer(markersRef.current.driver);
      markersRef.current.driver = L.marker([origin.lat, origin.lng], {
        icon: makeNavDriverIcon(heading),
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      setMarker('driver', origin, driverIcon);
    }

    const center = lookAheadOnRoute(routeCoords, idx, 200) || ahead;
    map.setView([center.lat, center.lng], NAV_ZOOM, { animate: true });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const center = customerPin || hubPin || PH_DEFAULT_CENTER;
    const initialZoom = (customerPin && hubPin) ? 14 : 15;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: initialZoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      if (abortRef.current) abortRef.current.abort();
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      polylinesRef.current = { preview: null, active: null };
    };
  }, [booking?.docId]);

  useEffect(() => {
    if (!mapRef.current) return;

    const driverCoords = driverPosition?.lat != null
      ? { lat: driverPosition.lat, lng: driverPosition.lng }
      : null;

    setMarker('hub', hubPin, hubIcon);
    setMarker('customer', customerPin, customerIcon);
    if (!navigationTarget) {
      setMarker('driver', driverCoords, driverIcon);
    }
  }, [hubPin, customerPin, driverPosition, navigationTarget]);

  useEffect(() => {
    if (!mapRef.current || !hubPin || !customerPin) {
      clearPolyline('preview');
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const route = await fetchDrivingRoute(hubPin, customerPin);
        if (cancelled || !route?.coordinates?.length) return;
        drawPolyline('preview', route.coordinates, previewLineStyle);
        if (!navigationTarget) {
          fitToCoords(route.coordinates);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [hubPin?.lat, hubPin?.lng, customerPin?.lat, customerPin?.lng, navigationTarget]);

  useEffect(() => {
    if (!mapRef.current) return undefined;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!navigationTarget) {
      clearPolyline('active');
      setRouteLoading(false);
      onNavigationRoute?.(null);
      const routePoints = [hubPin, customerPin].filter(Boolean);
      const allPoints = [hubPin, customerPin, driverPosition].filter(Boolean);
      if (routePoints.length >= 2) fitToCoords(routePoints);
      else if (allPoints.length >= 2) fitToCoords(allPoints);
      else if (allPoints.length === 1) {
        mapRef.current.setView([allPoints[0].lat, allPoints[0].lng], 16);
      }
      return () => controller.abort();
    }

    const dest = navigationTarget === 'customer' ? customerPin : hubPin;
    const origin = navigationTarget === 'customer'
      ? (driverPosition?.lat != null ? driverPosition : hubPin)
      : (driverPosition?.lat != null ? driverPosition : customerPin);

    if (!origin || !dest) {
      setRouteLoading(false);
      onNavigationRoute?.(null);
      return () => controller.abort();
    }

    let cancelled = false;
    setRouteLoading(true);

    const load = async () => {
      try {
        const route = await fetchDrivingRoute(origin, dest, { signal: controller.signal });
        if (cancelled || !route?.coordinates?.length) return;

        drawPolyline('active', route.coordinates, activeLineStyle);
        fitToCoords(route.coordinates, NAV_ZOOM);
        const isLiveDriver = driverPosition?.lat != null
          && Math.abs(driverPosition.lat - origin.lat) < 0.0002
          && Math.abs(driverPosition.lng - origin.lng) < 0.0002;
        applyNavigationPov(route.coordinates, origin, isLiveDriver);

        const info = {
          target: navigationTarget,
          distanceKm: route.distanceKm,
          durationMinutes: route.durationMinutes,
          fallback: route.fallback,
        };
        onNavigationRoute?.(info);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
        if (!cancelled) onNavigationRoute?.(null);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    navigationTarget,
    hubPin?.lat,
    hubPin?.lng,
    customerPin?.lat,
    customerPin?.lng,
    driverPosition?.lat,
    driverPosition?.lng,
  ]);

  useEffect(() => {
    if (!navigationTarget || !mapRef.current) return;
    const driverCoords = driverPosition?.lat != null
      ? { lat: driverPosition.lat, lng: driverPosition.lng }
      : null;
    const activeLine = polylinesRef.current.active;
    if (!driverCoords || !activeLine) return;

    const latlngs = activeLine.getLatLngs();
    const routeCoords = latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng }));
    applyNavigationPov(routeCoords, driverCoords, true);
  }, [navigationTarget, driverPosition?.lat, driverPosition?.lng]);

  const navActive = Boolean(navigationTarget);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {navActive && (
        <div style={navBannerStyle}>
          <Navigation size={16} color={PORTAL.primaryHex} />
          <span>
            Navigation preview
            {routeLoading ? ' — loading route…' : ' — follow the blue line, then open Google Maps for turn-by-turn'}
          </span>
          {routeLoading && <Loader size={14} className="spin" />}
        </div>
      )}
      <div
        ref={containerRef}
        className={navActive ? 'driver-trip-map-pov' : undefined}
        style={{
          width: '100%',
          height,
          minHeight: height,
          borderRadius: '10px',
          border: navActive ? `2px solid ${PORTAL.primaryHex}` : '2px solid #D1D5DB',
          boxShadow: navActive
            ? `0 0 0 2px ${PORTAL.primaryBg}, 0 4px 14px rgba(0,51,255,0.15)`
            : 'inset 0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          backgroundColor: '#E5E7EB',
        }}
        aria-label="Trip route map"
      />
      {showLegend && (
        <div style={legendStyle}>
          <span style={legendItemStyle}>
            <span style={{ ...dotStyle, backgroundColor: '#6B7280' }} />
            Vehicle origin (hub)
          </span>
          <span style={legendItemStyle}>
            <span style={{ ...dotStyle, backgroundColor: PORTAL.primaryHex }} />
            Customer
          </span>
          <span style={legendItemStyle}>
            <span style={{ ...dotStyle, backgroundColor: PORTAL.success }} />
            You
          </span>
          {hubPin && customerPin && (
            <span style={legendItemStyle}>
              <span style={routeLineSample} />
              Route
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const navBannerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.75rem',
  backgroundColor: PORTAL.primaryBg,
  borderRadius: '8px',
  border: `1px solid ${PORTAL.primaryBgAlt}`,
  fontSize: '0.78rem',
  color: '#374151',
  fontWeight: 500,
};

const legendStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  fontSize: '0.72rem',
  color: '#666',
};

const legendItemStyle = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem' };

const dotStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  display: 'inline-block',
};

const routeLineSample = {
  width: 18,
  height: 4,
  borderRadius: 2,
  backgroundColor: PORTAL.primaryHex,
  display: 'inline-block',
};

export default DriverTripMap;
