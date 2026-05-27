export const OSRM_ROUTE_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_ROUTE = OSRM_ROUTE_BASE;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Haversine distance in kilometers. */
export const distanceKm = (from, to) => {
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** City driving fallback (~28 km/h average). */
export const estimateMinutesFromDistance = (km, avgSpeedKmh = 28) => {
  if (!km || km <= 0) return 5;
  return Math.max(5, Math.ceil((km / avgSpeedKmh) * 60));
};

/**
 * Driving time in minutes from hub to customer pin (OSRM with haversine fallback).
 */
export async function estimateDrivingMinutes(from, to, { signal } = {}) {
  if (!from?.lat || !to?.lat) return null;

  try {
    const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const response = await fetch(`${OSRM_ROUTE}/${path}?overview=false`, { signal });
    if (response.ok) {
      const data = await response.json();
      const seconds = data?.routes?.[0]?.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.max(5, Math.ceil(seconds / 60));
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
  }

  const km = distanceKm(from, to);
  return estimateMinutesFromDistance(km);
}

export const formatEtaLabel = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
};

export const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);
