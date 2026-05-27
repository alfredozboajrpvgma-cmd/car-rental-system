import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  findHubForVehicleLocation,
  loadHubLocations,
  resolveHubCoordinates,
} from './hubLocations';
import { resolveCustomerPickupPin, hasValidCoordinates, formatPickupCoordinates } from './bookingLocation';
import { estimateDrivingMinutes, formatEtaLabel, distanceKm } from './travelTime';

/**
 * Hub where the fleet vehicle originates (booking snapshot, else vehicle.location → locations).
 */
export const resolveVehicleHubOrigin = async (booking) => {
  if (!booking) return null;

  if (hasValidCoordinates({ lat: booking.hubLat, lng: booking.hubLng })) {
    const locations = await loadHubLocations();
    const docMatch = booking.hubName
      ? findHubForVehicleLocation(booking.hubName, locations)
      : null;
    return {
      name: booking.hubName || docMatch?.name || 'Vehicle origin hub',
      lat: booking.hubLat,
      lng: booking.hubLng,
      address: docMatch?.address || '',
      vehicleLocation: docMatch?.name || booking.hubName || '',
    };
  }

  if (booking.vehicleId) {
    try {
      const vSnap = await getDoc(doc(db, 'vehicles', booking.vehicleId));
      const vehicleLoc = vSnap.data()?.location;
      if (vehicleLoc) {
        const locations = await loadHubLocations();
        const locDoc = findHubForVehicleLocation(vehicleLoc, locations);
        const hub = resolveHubCoordinates(vehicleLoc, locDoc);
        if (hub) {
          return {
            ...hub,
            address: locDoc?.address || '',
            vehicleLocation: vehicleLoc,
          };
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (booking.hubName) {
    const locations = await loadHubLocations();
    const locDoc = findHubForVehicleLocation(booking.hubName, locations);
    const hub = resolveHubCoordinates(booking.hubName, locDoc);
    if (hub) {
      return {
        ...hub,
        address: locDoc?.address || '',
        vehicleLocation: booking.hubName,
      };
    }
  }

  return null;
};

/** Driver's assigned hub when booking snapshot has no hub coordinates. */
export const resolveDriverAssignedHub = async (driverLocation) => {
  if (!driverLocation) return null;

  const locations = await loadHubLocations();
  const locDoc = findHubForVehicleLocation(driverLocation, locations);
  const hub = resolveHubCoordinates(driverLocation, locDoc);
  if (!hub) return null;

  return {
    ...hub,
    address: locDoc?.address || '',
    vehicleLocation: driverLocation,
  };
};

/** Driving time hub → customer; uses OSRM when possible. */
export const computeHubToCustomerDrive = async (hub, customerPin, storedMinutes) => {
  if (!hub || !customerPin) {
    return {
      minutes: Number.isFinite(storedMinutes) ? storedMinutes : null,
      distanceKm: null,
    };
  }

  const from = { lat: hub.lat, lng: hub.lng };
  const to = { lat: customerPin.lat, lng: customerPin.lng };
  const km = distanceKm(from, to);

  try {
    const minutes = await estimateDrivingMinutes(from, to);
    return { minutes, distanceKm: km };
  } catch (err) {
    console.error(err);
    return {
      minutes: Number.isFinite(storedMinutes) ? storedMinutes : null,
      distanceKm: km,
    };
  }
};

export const formatDriveDistance = (km) => {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export { formatEtaLabel, formatPickupCoordinates };
