import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/** Fallback coordinates when Firestore hubs have no lat/lng yet. */
export const HUB_COORDINATES_BY_NAME = {
  'Main Hub - Makati': { lat: 14.5547, lng: 121.0244 },
  'Makati Hub': { lat: 14.5547, lng: 121.0244 },
  'BGC Flagship Hub': { lat: 14.5515, lng: 121.0477 },
  'BGC Hub': { lat: 14.5515, lng: 121.0477 },
  'NAIA Terminal 3': { lat: 14.5086, lng: 121.0198 },
  'NAIA T3 Hub': { lat: 14.5086, lng: 121.0198 },
  'Quezon City Garage': { lat: 14.629, lng: 121.034 },
  'Quezon City': { lat: 14.629, lng: 121.034 },
};

const normalizeHubKey = (name) => String(name || '').trim().toLowerCase();

export const resolveHubCoordinates = (hubName, locationDoc) => {
  const name = hubName || locationDoc?.name || '';
  if (Number.isFinite(locationDoc?.lat) && Number.isFinite(locationDoc?.lng)) {
    return { name, lat: locationDoc.lat, lng: locationDoc.lng };
  }
  const direct = HUB_COORDINATES_BY_NAME[name];
  if (direct) return { name, ...direct };

  const key = normalizeHubKey(name);
  const fuzzy = Object.entries(HUB_COORDINATES_BY_NAME).find(([label]) => {
    const k = normalizeHubKey(label);
    return key.includes(k) || k.includes(key);
  });
  if (fuzzy) return { name: fuzzy[0], ...fuzzy[1] };
  return null;
};

let locationsCache = null;

export const clearHubLocationsCache = () => {
  locationsCache = null;
};

export const loadHubLocations = async ({ forceRefresh = false } = {}) => {
  if (forceRefresh) locationsCache = null;
  if (locationsCache) return locationsCache;
  const snap = await getDocs(collection(db, 'locations'));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  locationsCache = list;
  return list;
};

/** Hubs that are operational (Active status in Admin → Locations). */
export const isHubLocationAvailable = (location) => {
  const status = String(location?.status ?? 'Active').trim();
  return status === 'Active';
};

export const loadAvailableHubLocations = async (options) => {
  const all = await loadHubLocations(options);
  return all
    .filter(isHubLocationAvailable)
    .filter((loc) => Boolean(loc.name?.trim()))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const loadAvailableHubNames = async (options) => {
  const hubs = await loadAvailableHubLocations(options);
  return hubs.map((h) => h.name);
};

/** Match vehicle hub name (e.g. "Makati Hub") to a locations document. */
export const findHubForVehicleLocation = (vehicleLocation, locations) => {
  if (!vehicleLocation) return null;
  const key = normalizeHubKey(vehicleLocation);
  return locations.find((loc) => {
    const name = normalizeHubKey(loc.name);
    const address = normalizeHubKey(loc.address);
    return name === key || name.includes(key) || key.includes(name)
      || address.includes(key);
  }) || null;
};

export const resolveHubForVehicle = async (vehicleLocation) => {
  const locations = await loadHubLocations();
  const doc = findHubForVehicleLocation(vehicleLocation, locations);
  return resolveHubCoordinates(vehicleLocation, doc);
};
