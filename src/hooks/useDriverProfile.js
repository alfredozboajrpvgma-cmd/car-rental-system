import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/** Real-time Firestore driver profile for the logged-in chauffeur. */
export const useDriverProfile = (driverId) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) {
      setDriver(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      doc(db, 'drivers', driverId),
      (snap) => {
        setDriver(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return unsub;
  }, [driverId]);

  return { driver, loading, error };
};
