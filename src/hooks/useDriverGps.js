import { useState, useEffect, useRef, useCallback } from 'react';
import { syncDriverLiveLocation } from '../utils/driverLocationSync';

/**
 * Streams device GPS when enabled (e.g. after booking approval).
 * Updates Firestore driver record (admin) and Supabase booking (customer).
 */
export const useDriverGps = (driver, { enabled = false, bookingId = null } = {}) => {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const watchRef = useRef(null);
  const driverRef = useRef(driver);
  const bookingIdRef = useRef(bookingId);

  useEffect(() => {
    driverRef.current = driver;
  }, [driver]);

  useEffect(() => {
    bookingIdRef.current = bookingId;
  }, [bookingId]);

  const stop = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    const d = driverRef.current;
    if (!d?.id) {
      setError('Driver profile not loaded.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not available on this device.');
      return;
    }

    setError('');
    stop();
    setSharing(true);

    watchRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const current = driverRef.current;
        if (!current?.id) return;
        try {
          const updated = await syncDriverLiveLocation({
            driver: current,
            bookingId: bookingIdRef.current,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          driverRef.current = updated;
        } catch (err) {
          console.error(err);
          setError('Could not save location.');
        }
      },
      (err) => {
        setError(err.message || 'Could not read GPS location.');
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [stop]);

  useEffect(() => {
    if (enabled && driver?.id) {
      start();
    } else {
      stop();
    }
  }, [enabled, driver?.id, bookingId, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { sharing, error, stop, setError };
};
