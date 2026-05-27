import { useState, useEffect } from 'react';
import { resolveCustomerPickupPin } from '../utils/bookingLocation';
import {
  resolveVehicleHubOrigin,
  resolveDriverAssignedHub,
  computeHubToCustomerDrive,
} from '../utils/tripDispatchInfo';

/**
 * Resolves vehicle origin hub + live hub→customer ETA for driver/admin dispatch UI.
 * @param {object|null} booking
 * @param {{ location?: string }|null} [driver] — fallback hub from chauffeur profile
 */
export const useTripDispatchInfo = (booking, driver = null) => {
  const [hubOrigin, setHubOrigin] = useState(null);
  const [customerPickup, setCustomerPickup] = useState(null);
  const [driveMinutes, setDriveMinutes] = useState(null);
  const [driveDistanceKm, setDriveDistanceKm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!booking?.docId) {
      setHubOrigin(null);
      setCustomerPickup(null);
      setDriveMinutes(null);
      setDriveDistanceKm(null);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const pickup = resolveCustomerPickupPin(booking);
        let hub = await resolveVehicleHubOrigin(booking);
        if (!hub && driver?.location) {
          hub = await resolveDriverAssignedHub(driver.location);
        }
        const drive = await computeHubToCustomerDrive(
          hub,
          pickup,
          booking.estimatedArrivalMinutes
        );

        if (cancelled) return;
        setCustomerPickup(pickup);
        setHubOrigin(hub);
        setDriveMinutes(drive.minutes);
        setDriveDistanceKm(drive.distanceKm);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setCustomerPickup(resolveCustomerPickupPin(booking));
          setHubOrigin(null);
          setDriveMinutes(booking.estimatedArrivalMinutes ?? null);
          setDriveDistanceKm(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [
    booking?.docId,
    booking?.hubLat,
    booking?.hubLng,
    booking?.hubName,
    booking?.pickupLat,
    booking?.pickupLng,
    booking?.location,
    booking?.vehicleId,
    booking?.estimatedArrivalMinutes,
    driver?.location,
  ]);

  return {
    hubOrigin,
    customerPickup,
    driveMinutes,
    driveDistanceKm,
    loading,
  };
};
