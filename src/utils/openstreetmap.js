const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

const nominatimHeaders = {
  Accept: 'application/json',
  'Accept-Language': 'en',
};

export const PH_DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

/**
 * Search addresses via OpenStreetMap Nominatim.
 * @see https://nominatim.org/release-docs/develop/api/Search/
 */
export async function searchPlaces(query, { signal, limit = 6, countryCodes = 'ph' } = {}) {
  const q = query?.trim();
  if (!q || q.length < 3) return [];

  const params = new URLSearchParams({
    format: 'json',
    q,
    addressdetails: '1',
    limit: String(limit),
  });
  if (countryCodes) params.set('countrycodes', countryCodes);

  const response = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    signal,
    headers: nominatimHeaders,
  });

  if (!response.ok) {
    throw new Error('Address search is temporarily unavailable. Please try again.');
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  return data.map((place) => ({
    label: place.display_name,
    lat: Number.parseFloat(place.lat),
    lng: Number.parseFloat(place.lon),
    placeId: place.place_id,
  }));
}

export const formatPlaceCoordinates = (lat, lng) =>
  `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;

/**
 * Resolve coordinates to a display address via Nominatim reverse geocoding.
 * @see https://nominatim.org/release-docs/develop/api/Reverse/
 */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid map coordinates.');
  }

  const params = new URLSearchParams({
    format: 'json',
    lat: String(latitude),
    lon: String(longitude),
    addressdetails: '1',
  });

  const response = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
    signal,
    headers: nominatimHeaders,
  });

  if (!response.ok) {
    throw new Error('Could not resolve address for this pin.');
  }

  const data = await response.json();
  const label = data?.display_name;
  if (!label) {
    throw new Error('No address found for this location.');
  }

  return {
    label,
    lat: latitude,
    lng: longitude,
    placeId: data?.place_id ?? `pin-${latitude.toFixed(5)}-${longitude.toFixed(5)}`,
  };
}
