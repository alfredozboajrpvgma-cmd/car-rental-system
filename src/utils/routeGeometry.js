import {
  distanceKm,
  estimateMinutesFromDistance,
  OSRM_ROUTE_BASE,
} from './travelTime';

/**
 * Full driving route geometry from OSRM (GeoJSON coordinates).
 */
export async function fetchDrivingRoute(from, to, { signal } = {}) {
  if (!from?.lat || !to?.lat) return null;

  try {
    const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${OSRM_ROUTE_BASE}/${path}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('OSRM route failed');

    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error('No route geometry');

    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    return {
      coordinates,
      distanceKm: (route.distance || 0) / 1000,
      durationMinutes: Math.max(1, Math.ceil((route.duration || 0) / 60)),
    };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    const km = distanceKm(from, to);
    return {
      coordinates: [from, to],
      distanceKm: km,
      durationMinutes: estimateMinutesFromDistance(km),
      fallback: true,
    };
  }
}

/** Bearing in degrees (0 = north, clockwise). */
export const bearingDegrees = (from, to) => {
  if (!from || !to) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/** Index of closest point on route polyline to a position. */
export const closestRouteIndex = (routeCoords, point) => {
  if (!routeCoords?.length || !point) return 0;
  let best = 0;
  let bestDist = Infinity;
  routeCoords.forEach((c, i) => {
    const d = distanceKm(point, c);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
};

/** Point ahead on the route for navigation-style map centering. */
export const lookAheadOnRoute = (routeCoords, fromIndex, metersAhead = 140) => {
  if (!routeCoords?.length) return null;
  let remaining = metersAhead;
  let idx = Math.min(fromIndex, routeCoords.length - 1);
  let current = routeCoords[idx];

  while (remaining > 0 && idx < routeCoords.length - 1) {
    const next = routeCoords[idx + 1];
    const segKm = distanceKm(current, next);
    const segM = segKm * 1000;
    if (segM >= remaining) {
      const t = remaining / segM;
      return {
        lat: current.lat + (next.lat - current.lat) * t,
        lng: current.lng + (next.lng - current.lng) * t,
      };
    }
    remaining -= segM;
    idx += 1;
    current = next;
  }
  return routeCoords[routeCoords.length - 1];
};

export const formatRouteDistance = (km) => {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};
