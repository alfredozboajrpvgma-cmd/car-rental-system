import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDriverProfile } from '../hooks/useDriverProfile';
import { useDriverGps } from '../hooks/useDriverGps';
import { fetchBookingsByDriverId } from '../utils/supabaseBookings';
import { getActiveDriverTrip } from '../utils/driverTrips';
import { shouldAutoTrackDriverGps } from '../utils/driverLocationSync';
import { reconcileDriverDutyStatus } from '../utils/driverDutySync';

/**
 * Background GPS for chauffeur portal — starts when a with-driver booking is Approved/Active.
 */
const DriverGpsTracker = () => {
  const { currentUser } = useAuth();
  const driverId = currentUser?.driverId;
  const { driver } = useDriverProfile(driverId);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!driverId) return undefined;
    const load = async () => {
      try {
        const list = await fetchBookingsByDriverId(driverId);
        setBookings(list);
      } catch (err) {
        console.error(err);
      }
    };
    load();
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [driverId]);

  useEffect(() => {
    if (!driverId || !driver) return undefined;
    reconcileDriverDutyStatus(driver, bookings).catch(console.error);
    return undefined;
  }, [driverId, driver, bookings]);

  const trackingTrip = useMemo(() => {
    const trip = getActiveDriverTrip(bookings, driver?.assignedBookingId);
    return trip && shouldAutoTrackDriverGps(trip) ? trip : null;
  }, [bookings, driver?.assignedBookingId]);

  useDriverGps(driver, {
    enabled: Boolean(trackingTrip),
    bookingId: trackingTrip?.docId,
  });

  return null;
};

export default DriverGpsTracker;
