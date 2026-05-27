import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/** Count fleet vehicles assigned to a hub (by locationId, then by location name). */
export const countVehiclesForLocation = (vehicles, location) => {
  if (!location?.id && !location?.name) return 0;
  return vehicles.filter((vehicle) => {
    if (vehicle.locationId) {
      return location.id && vehicle.locationId === location.id;
    }
    return Boolean(location.name && vehicle.location === location.name);
  }).length;
};

/** Load vehicles and locations; return locations with live vehicleCount. */
export const loadLocationsWithVehicleCounts = async () => {
  const [locSnap, vehicleSnap] = await Promise.all([
    getDocs(collection(db, 'locations')),
    getDocs(collection(db, 'vehicles')),
  ]);

  const vehicles = [];
  vehicleSnap.forEach((d) => vehicles.push({ docId: d.id, id: d.id, ...d.data() }));

  const locations = [];
  locSnap.forEach((d) => {
    const location = { id: d.id, ...d.data() };
    locations.push({
      ...location,
      vehicleCount: countVehiclesForLocation(vehicles, location),
    });
  });

  return { locations, vehicles };
};

/** Persist vehicleCount on every location from current fleet data. */
export const syncAllLocationVehicleCounts = async () => {
  const { locations } = await loadLocationsWithVehicleCounts();
  await Promise.all(
    locations.map((loc) =>
      setDoc(doc(db, 'locations', loc.id), { vehicleCount: loc.vehicleCount }, { merge: true })
    )
  );
  return locations;
};
