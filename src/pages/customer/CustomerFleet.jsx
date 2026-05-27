import React, { useState } from 'react';
import { Car, Fuel, Users, Star, Search, Settings, X, Calendar, MapPin, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { createBooking, fetchVehicleReservationMap, getBookingErrorMessage, isVehicleAvailable } from '../../utils/supabaseBookings';
import { resolveFleetVehicleStatus } from '../../utils/bookings';
import { createNotification, notifyStaff } from '../../utils/notifications';
import { isCustomerContactComplete, getCustomerContactMissingMessage } from '../../utils/customerContact';
import { RENTAL_MODES, normalizeRentalMode, getRentalModeLabel } from '../../utils/rentalMode';
import CustomLocationPicker from '../../components/CustomLocationPicker';
import { formatPlaceCoordinates } from '../../utils/openstreetmap';
import { buildWithDriverDispatchFields } from '../../utils/withDriverDispatch';
import { formatEtaLabel } from '../../utils/travelTime';
import { resolveHubForVehicle } from '../../utils/hubLocations';
import { calculateBookingTotal } from '../../utils/pricing';

const VehicleImage = ({ src, type, statusLabel, availableNow, rentalModeLabel }) => {
  const [error, setError] = useState(false);
  const showImage = src && !error;

  return (
    <div style={styles.imageWrapper}>
      {showImage ? (
        <img src={src} alt="" style={styles.image} onError={() => setError(true)} />
      ) : (
        <div style={styles.fallbackImage}>
          <Car size={36} color="#B0B0B0" strokeWidth={1.5} />
        </div>
      )}
      {type && <span style={styles.typeBadge}>{type}</span>}
      {rentalModeLabel && (
        <span style={{
          ...styles.rentalModeBadge,
          ...(rentalModeLabel === 'With Driver' ? styles.rentalModeBadgeDriver : styles.rentalModeBadgeSelf),
        }}>
          {rentalModeLabel}
        </span>
      )}
      {availableNow && <span style={styles.availableNowBadge}>Available now</span>}
      {statusLabel && <span style={styles.statusBadge}>{statusLabel}</span>}
    </div>
  );
};

const VehicleSpecs = ({ seats, transmission, fuel }) => {
  const items = [
    { icon: <Users size={14} />, label: `${seats} Seats` },
    { icon: <Settings size={14} />, label: transmission },
    { icon: <Fuel size={14} />, label: fuel },
  ];

  return (
    <div style={styles.specsRow}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && <span style={styles.specDivider} aria-hidden="true" />}
          <span style={styles.feature}>
            {item.icon}
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

const CustomerFleet = () => {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rentalModeTab, setRentalModeTab] = useState(RENTAL_MODES.SELF_DRIVE);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedVehicleName, setBookedVehicleName] = useState('');
  
  // Booking Form State
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [locations, setLocations] = useState([]);
  const [pickupLocation, setPickupLocation] = useState('');
  const [customPickupLocation, setCustomPickupLocation] = useState(null);
  const [dispatchEtaMinutes, setDispatchEtaMinutes] = useState(null);
  const [dispatchEtaLoading, setDispatchEtaLoading] = useState(false);
  const [dispatchHubName, setDispatchHubName] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [reservedVehicleIds, setReservedVehicleIds] = useState(() => new Set());
  const [pendingVehicleIds, setPendingVehicleIds] = useState(() => new Set());
  const [quoteTotal, setQuoteTotal] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setFleetLoading(true);
      try {
        const [vehicleSnap, locationSnap, reservationMap] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          getDocs(collection(db, 'locations')),
          fetchVehicleReservationMap().catch(() => ({ reserved: new Set(), pending: new Set() })),
        ]);
        setReservedVehicleIds(reservationMap.reserved);
        setPendingVehicleIds(reservationMap.pending);

        const fleet = [];
        vehicleSnap.forEach((d) => {
          const data = d.data();
          const id = d.id;
          fleet.push({
            id,
            ...data,
            rentalMode: normalizeRentalMode(
              data.rentalMode ?? (data.type === 'Van' ? RENTAL_MODES.WITH_DRIVER : RENTAL_MODES.SELF_DRIVE)
            ),
            status: resolveFleetVehicleStatus(id, data.status, reservationMap.reserved),
          });
        });
        setVehicles(fleet);

        const locs = [];
        locationSnap.forEach((d) => {
          const data = d.data();
          if (data.status === 'Active') locs.push(data.name);
        });
        if (locs.length === 0) {
          locs.push('Main Hub - Makati', 'BGC Flagship Hub', 'NAIA Terminal 3', 'Quezon City Garage');
        }
        setLocations(locs);
        setPickupLocation(locs[0]);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
      } finally {
        setFleetLoading(false);
      }
    };
    fetchData();
  }, []);

  React.useEffect(() => {
    if (!selectedVehicle) {
      setCustomPickupLocation(null);
      return;
    }
    if (normalizeRentalMode(selectedVehicle.rentalMode) === RENTAL_MODES.WITH_DRIVER) {
      setCustomPickupLocation(null);
    }
  }, [selectedVehicle?.id]);

  const isWithDriverBooking = selectedVehicle
    && normalizeRentalMode(selectedVehicle.rentalMode) === RENTAL_MODES.WITH_DRIVER;

  React.useEffect(() => {
    if (!isWithDriverBooking || !selectedVehicle || !customPickupLocation?.lat) {
      setDispatchEtaMinutes(null);
      setDispatchHubName('');
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setDispatchEtaLoading(true);
      try {
        const hub = await resolveHubForVehicle(selectedVehicle.location);
        const fields = await buildWithDriverDispatchFields(selectedVehicle, customPickupLocation);
        if (cancelled) return;
        setDispatchHubName(fields.hubName || hub?.name || '');
        setDispatchEtaMinutes(fields.estimatedArrivalMinutes ?? null);
      } catch {
        if (!cancelled) {
          setDispatchEtaMinutes(null);
          setDispatchHubName('');
        }
      } finally {
        if (!cancelled) setDispatchEtaLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [customPickupLocation?.lat, customPickupLocation?.lng, selectedVehicle?.id, isWithDriverBooking]);

  const resolveBookingLocation = () => {
    if (isWithDriverBooking) {
      if (!customPickupLocation?.label) return '';
      const coords = formatPlaceCoordinates(customPickupLocation.lat, customPickupLocation.lng);
      return `${customPickupLocation.label} (${coords})`;
    }
    return pickupLocation;
  };

  const isVehicleRentable = (v) =>
    v.status === 'Available' && !reservedVehicleIds.has(v.id);

  const getVehicleStatusLabel = (v) => {
    if (pendingVehicleIds.has(v.id)) return 'Reserved — Pending Approval';
    if (reservedVehicleIds.has(v.id)) return 'On active reservation';
    if (v.status === 'Maintenance') return 'Under Maintenance';
    if (v.status === 'Available') return null;
    return 'Unavailable';
  };

  const filteredVehicles = vehicles
    .filter((v) => normalizeRentalMode(v.rentalMode) === rentalModeTab)
    .filter((v) => category === 'All' || v.type === category)
    .filter((v) => v.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aAvail = isVehicleRentable(a) ? 1 : 0;
      const bAvail = isVehicleRentable(b) ? 1 : 0;
      if (aAvail !== bAvail) return bAvail - aAvail;
      if (sortBy === 'PriceLowToHigh') return a.price - b.price;
      if (sortBy === 'PriceHighToLow') return b.price - a.price;
      return b.rating - a.rating;
    });

  const availableCount = vehicles.filter((v) => isVehicleRentable(v)).length;
  const rentedCount = vehicles.filter((v) => reservedVehicleIds.has(v.id)).length;
  const hasActiveFilters = searchQuery.trim() !== '' || category !== 'All';
  const selfDriveCount = vehicles.filter((v) => normalizeRentalMode(v.rentalMode) === RENTAL_MODES.SELF_DRIVE).length;
  const withDriverCount = vehicles.filter((v) => normalizeRentalMode(v.rentalMode) === RENTAL_MODES.WITH_DRIVER).length;
  const filteredAvailableCount = filteredVehicles.filter((v) => isVehicleRentable(v)).length;
  const activeModeLabel = getRentalModeLabel(rentalModeTab);

  const getEmptyState = () => {
    if (fleetLoading) return null;
    if (vehicles.length === 0) {
      return {
        title: 'No vehicles in fleet',
        message: 'Please check back later — new vehicles may be added soon.',
      };
    }
    if (filteredVehicles.length > 0) return null;
    if (hasActiveFilters) {
      return {
        title: 'No matches found',
        message: `We couldn’t find any ${activeModeLabel.toLowerCase()} vehicles with those filters. Try a different category or clear your search.`,
      };
    }
    const tabCount = rentalModeTab === RENTAL_MODES.SELF_DRIVE ? selfDriveCount : withDriverCount;
    if (tabCount === 0) {
      return {
        title: `No ${activeModeLabel.toLowerCase()} vehicles yet`,
        message: rentalModeTab === RENTAL_MODES.WITH_DRIVER
          ? 'Chauffeur-service vehicles will appear here when added to the fleet.'
          : 'Self-drive vehicles will appear here when added to the fleet.',
      };
    }
    if (availableCount === 0 && rentedCount > 0) {
      return {
        title: 'Everything’s rented out',
        message: 'All our cars are on the road right now. Check back soon — something may open up!',
      };
    }
    return {
      title: 'Nothing available right now',
      message: 'Our vehicles are either rented or in maintenance. Please check back a little later.',
    };
  };

  const emptyState = getEmptyState();

  const getFleetSubtitle = () => {
    if (fleetLoading) return 'Loading our fleet…';
    if (vehicles.length === 0) return 'We’re adding vehicles — check back soon.';
    if (filteredVehicles.length === 0) return null;
    if (filteredAvailableCount > 0) {
      const n = filteredAvailableCount;
      return `${n} ${activeModeLabel.toLowerCase()} ${n === 1 ? 'vehicle' : 'vehicles'} ready to book`;
    }
    if (hasActiveFilters) {
      return `Nothing available with these filters — try another category or clear your search`;
    }
    if (rentedCount > 0) {
      return `Our ${activeModeLabel.toLowerCase()} fleet is fully booked right now`;
    }
    return `No ${activeModeLabel.toLowerCase()} vehicles available at the moment — please check back later`;
  };

  const fleetSubtitle = getFleetSubtitle();

  const calculateDays = () => {
    if (!pickupDate || !returnDate) return 0;
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays > 0 ? diffDays : 1;
  };

  const contactComplete = isCustomerContactComplete(currentUser);

  React.useEffect(() => {
    if (!selectedVehicle || !pickupDate || !returnDate) {
      setQuoteTotal(null);
      return undefined;
    }
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) {
      setQuoteTotal(null);
      return undefined;
    }
    const days = calculateDays();
    if (days <= 0) return undefined;

    let cancelled = false;
    setQuoteLoading(true);
    calculateBookingTotal({
      baseDailyRate: selectedVehicle.price,
      days,
      pickupDate: start,
    })
      .then(({ total }) => {
        if (!cancelled) setQuoteTotal(total);
      })
      .catch(() => {
        if (!cancelled) setQuoteTotal(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedVehicle, pickupDate, returnDate]);

  const handleBookNow = (vehicle) => {
    setBookingError('');
    if (!isCustomerContactComplete(currentUser)) {
      setBookingError(getCustomerContactMissingMessage(currentUser));
      setSelectedVehicle(vehicle);
      return;
    }
    setSelectedVehicle(vehicle);
  };

  const handleConfirmBooking = async () => {
    setBookingError('');
    if (!isCustomerContactComplete(currentUser)) {
      setBookingError(getCustomerContactMissingMessage(currentUser));
      return;
    }
    if (!pickupDate || !returnDate) {
      setBookingError('Please select both pickup and return dates.');
      return;
    }
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) {
      setBookingError('Return date must be after pickup date.');
      return;
    }
    if (isWithDriverBooking && !customPickupLocation?.label) {
      setBookingError('Please search and select your pickup address.');
      return;
    }
    if (!isWithDriverBooking && !pickupLocation) {
      setBookingError('Please select a pickup hub.');
      return;
    }

    setIsBooking(true);
    try {
      const available = await isVehicleAvailable(selectedVehicle.id, start, end);
      if (!available) {
        setBookingError('This vehicle is already booked for the selected dates. Please choose another date or vehicle.');
        setIsBooking(false);
        return;
      }

      const days = calculateDays();
      const { total: totalPayment } = await calculateBookingTotal({
        baseDailyRate: selectedVehicle.price,
        days,
        pickupDate: start,
      });
      const userId = auth.currentUser?.uid ?? currentUser.id;

      const dispatchFields = isWithDriverBooking
        ? await buildWithDriverDispatchFields(selectedVehicle, customPickupLocation)
        : {};

      await createBooking({
        userId,
        customerName: currentUser.name || currentUser.email.split('@')[0],
        customerEmail: currentUser.email,
        vehicleId: selectedVehicle.id,
        vehicleName: selectedVehicle.name,
        plate: selectedVehicle.plate,
        startDate: start,
        endDate: end,
        days,
        total: totalPayment,
        location: resolveBookingLocation(),
        rentalMode: normalizeRentalMode(selectedVehicle.rentalMode),
        status: 'Pending',
        paymentStatus: 'Unpaid',
        ...dispatchFields,
      });

      setReservedVehicleIds((prev) => new Set(prev).add(selectedVehicle.id));
      setPendingVehicleIds((prev) => new Set(prev).add(selectedVehicle.id));

      await createNotification({
        userId,
        title: 'Booking submitted',
        message: `Your request for ${selectedVehicle.name} is pending approval.`,
        link: '/customer/bookings',
      });

      try {
        await notifyStaff({
          title: 'New booking submitted',
          message: `${selectedVehicle.name} is pending approval.`,
          link: '/admin/reservations',
          type: 'new_booking',
        });
      } catch (notifyErr) {
        console.warn('Staff notification skipped:', notifyErr);
      }

      setBookedVehicleName(selectedVehicle.name);
      setSelectedVehicle(null);
      setBookingSuccess(true);
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingError(getBookingErrorMessage(err));
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
      <div className="page-enter">
        <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Browse Fleet</h1>
          {fleetSubtitle && <p style={styles.subtitle}>{fleetSubtitle}</p>}
        </div>
      </div>

      {!contactComplete && (
        <div style={styles.contactBanner}>
          <p style={styles.contactBannerText}>
            <strong>Contact information required.</strong> Complete your profile before booking.{' '}
            <Link to="/customer/profile" style={styles.contactBannerLink}>Go to My Profile →</Link>
          </p>
        </div>
      )}

      <div style={styles.rentalModeTabs} role="tablist" aria-label="Rental type">
        {[
          { value: RENTAL_MODES.SELF_DRIVE, label: 'Self Drive', count: selfDriveCount },
          { value: RENTAL_MODES.WITH_DRIVER, label: 'With Driver', count: withDriverCount },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={rentalModeTab === tab.value}
            style={{
              ...styles.rentalModeTab,
              ...(rentalModeTab === tab.value ? styles.rentalModeTabActive : {}),
            }}
            onClick={() => {
              setRentalModeTab(tab.value);
              setCategory('All');
            }}
          >
            {tab.label}
            <span style={styles.rentalModeTabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div style={styles.filterRow}>
        <div style={styles.searchBar}>
          <Search size={18} color="#888" />
          <input 
            type="text" 
            placeholder="Search car models..." 
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div style={styles.categoryFilters}>
          {['All', 'Sedan', 'SUV', 'MPV', 'Van'].map(cat => (
            <button 
              key={cat} 
              style={{
                ...styles.categoryPill,
                ...(category === cat ? styles.categoryPillActive : {})
              }}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <select style={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="Recommended">Highest Rated</option>
          <option value="PriceLowToHigh">Price: Low to High</option>
          <option value="PriceHighToLow">Price: High to Low</option>
        </select>
      </div>

      <div className="fleet-card-grid">
        {filteredVehicles.map((v) => {
          const rentable = isVehicleRentable(v);
          const statusLabel = getVehicleStatusLabel(v);
          return (
            <div
              key={v.id}
              style={{
                ...styles.card,
                ...(rentable ? {} : styles.cardUnavailable),
              }}
            >
              <VehicleImage
                src={v.image}
                type={v.type}
                statusLabel={statusLabel}
                availableNow={v.availableNow && rentable}
                rentalModeLabel={getRentalModeLabel(v.rentalMode)}
              />
              <div style={styles.cardBody}>
                <div style={styles.cardTitleRow}>
                  <h3 style={styles.carName}>{v.name}</h3>
                  <span style={styles.ratingBadge}>
                    <Star size={12} fill="#F57F17" color="#F57F17" style={{ marginRight: '0.2rem' }} />
                    {v.rating}
                  </span>
                </div>
                <VehicleSpecs seats={v.seats} transmission={v.transmission} fuel={v.fuel} />
                <div style={styles.cardFooter}>
                  <div>
                    <span style={styles.price}>₱{v.price.toLocaleString()}</span>
                    <span style={styles.perDay}>/day</span>
                  </div>
                  {rentable ? (
                    <button style={styles.bookBtn} className="btn-hover" onClick={() => handleBookNow(v)}>
                      Book Now
                    </button>
                  ) : (
                    <button type="button" style={styles.bookBtnDisabled} disabled>
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {emptyState && (
          <div style={styles.emptyState}>
            <Car size={48} color="#CCC" style={{ marginBottom: '1rem' }} />
            <h3 style={styles.emptyTitle}>{emptyState.title}</h3>
            <p style={styles.emptyMessage}>{emptyState.message}</p>
            {hasActiveFilters && rentedCount > 0 && (
              <button
                type="button"
                style={styles.clearFiltersBtn}
                onClick={() => {
                  setSearchQuery('');
                  setCategory('All');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Booking Modal */}
      {selectedVehicle && (
        <div style={styles.modalOverlay} onClick={() => setSelectedVehicle(null)}>
          <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Book {selectedVehicle.name}</h2>
              <button style={styles.closeBtn} onClick={() => setSelectedVehicle(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.modalSpecs}>
                <VehicleImage
                  src={selectedVehicle.image}
                  type={selectedVehicle.type}
                  rentalModeLabel={getRentalModeLabel(selectedVehicle.rentalMode)}
                />
                <div style={styles.specsContent}>
                  <div style={styles.specsFeatures}>
                    <span style={styles.feature}><Users size={16} /> {selectedVehicle.seats} Seats</span>
                    <span style={styles.feature}><Settings size={16} /> {selectedVehicle.transmission}</span>
                    <span style={styles.feature}><Fuel size={16} /> {selectedVehicle.fuel}</span>
                    <span style={styles.feature}><Star size={16} fill="#F57F17" color="#F57F17" /> {selectedVehicle.rating} Rating</span>
                  </div>
                  <div style={styles.specsPrice}>
                    <span style={styles.price}>₱{selectedVehicle.price.toLocaleString()}</span>
                    <span style={styles.perDay}>/day</span>
                  </div>
                </div>
              </div>

              <div style={styles.modalForm}>
                {bookingError && (
                  <div style={{ color: '#C62828', fontSize: '0.85rem', fontWeight: 500, backgroundColor: '#FFEBEE', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                    {bookingError}
                    {!contactComplete && (
                      <>
                        {' '}
                        <Link to="/customer/profile" style={{ color: '#0033FF', fontWeight: 600 }}>Update profile →</Link>
                      </>
                    )}
                  </div>
                )}
                {normalizeRentalMode(selectedVehicle.rentalMode) === RENTAL_MODES.WITH_DRIVER && (
                  <div style={styles.driverNote}>
                    This is a <strong>With Driver</strong> booking. After approval, your chauffeur is dispatched from the nearest hub to your pinned address — no hub pickup grace period.
                  </div>
                )}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Pickup Date & Time</label>
                  <div style={styles.inputWrapper}>
                    <Calendar size={18} color="#888" />
                    <input type="datetime-local" style={styles.input} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Return Date & Time</label>
                  <div style={styles.inputWrapper}>
                    <Calendar size={18} color="#888" />
                    <input type="datetime-local" style={styles.input} value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {isWithDriverBooking ? 'Pickup Address' : 'Pickup Location'}
                  </label>
                  {isWithDriverBooking ? (
                    <>
                      <p style={styles.locationHint}>
                        Enter where the chauffeur should meet you. Hub pickup is not required for with-driver rentals.
                      </p>
                      <CustomLocationPicker
                        value={customPickupLocation}
                        onChange={setCustomPickupLocation}
                        disabled={isBooking}
                      />
                      {(dispatchEtaLoading || dispatchEtaMinutes) && (
                        <p style={styles.etaPreview}>
                          {dispatchEtaLoading
                            ? 'Calculating drive time from hub…'
                            : `Estimated ${formatEtaLabel(dispatchEtaMinutes)} from ${dispatchHubName || 'dispatch hub'} to your pin.`}
                        </p>
                      )}
                    </>
                  ) : (
                    <div style={styles.inputWrapper}>
                      <MapPin size={18} color="#888" />
                      <select style={styles.input} value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)}>
                        {locations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {pickupDate && returnDate && !bookingError && calculateDays() > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#F0F4FF', borderRadius: '8px', border: '1px solid #D6E4FF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                      <span>₱{selectedVehicle.price.toLocaleString()} x {calculateDays()} days (base)</span>
                      <span>{quoteLoading ? '…' : quoteTotal != null ? `₱${quoteTotal.toLocaleString()}` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '1.1rem', color: '#111', borderTop: '1px solid #D6E4FF', paddingTop: '0.5rem' }}>
                      <span>Total due</span>
                      <span>{quoteLoading ? 'Calculating…' : quoteTotal != null ? `₱${quoteTotal.toLocaleString()}` : '—'}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.5rem 0 0' }}>
                      Includes peak/off-peak and long-term discounts from admin pricing settings.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => setSelectedVehicle(null)} disabled={isBooking}>Cancel</button>
              <button style={styles.confirmBtn} className="btn-hover" onClick={handleConfirmBooking} disabled={isBooking || !contactComplete}>
                {isBooking ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {bookingSuccess && (
        <div style={styles.modalOverlay} onClick={() => setBookingSuccess(false)}>
          <div style={styles.successModal} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.successIconWrapper}>
              <CheckCircle size={56} color="#2E7D32" />
            </div>
            <h2 style={styles.successTitle}>Booking Confirmed!</h2>
            <p style={styles.successDesc}>
              You have successfully reserved the <strong>{bookedVehicleName}</strong>.
              Your booking is pending admin approval. Check My Bookings for updates.
            </p>
            <div style={styles.successActions}>
              <button style={styles.cancelBtn} style={{...styles.cancelBtn, flex: 1}} onClick={() => setBookingSuccess(false)}>Close</button>
              <Link to="/customer/bookings" style={styles.viewBookingsBtn} className="btn-hover">View My Bookings</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.75rem', fontWeight: 600, color: '#111' },
  subtitle: { color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' },
  contactBanner: {
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFE082',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    marginBottom: '1.5rem',
  },
  contactBannerText: { color: '#5D4037', fontSize: '0.9rem', margin: 0 },
  contactBannerLink: { color: '#0033FF', fontWeight: 600, textDecoration: 'underline' },
  rentalModeTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  rentalModeTab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.65rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#555',
    transition: 'all 0.2s ease',
  },
  rentalModeTabActive: {
    backgroundColor: '#0033FF',
    border: '1px solid #0033FF',
    color: '#FFF',
  },
  rentalModeTabCount: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.15rem 0.45rem',
    borderRadius: '999px',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  filterRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2.5rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '0 1rem',
    flex: '1',
    minWidth: '250px',
    height: '42px',
    boxSizing: 'border-box',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontFamily: 'var(--font-primary)',
    fontSize: '0.9rem',
  },
  categoryFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    backgroundColor: '#FFF',
    padding: '0.35rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    height: '42px',
    boxSizing: 'border-box',
  },
  categoryPill: {
    padding: '0 0.85rem',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#666',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#0033FF',
    color: '#FFF',
    fontWeight: 600,
  },
  sortSelect: {
    padding: '0 1rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
    fontFamily: 'var(--font-primary)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    outline: 'none',
    height: '42px',
    boxSizing: 'border-box',
  },

  card: {
    position: 'relative',
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '320px',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  cardUnavailable: { opacity: 0.92, backgroundColor: '#FAFAFA' },
  availableNowBadge: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    zIndex: 3,
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
  },
  statusBadge: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    backgroundColor: '#FFF3E0',
    color: '#E65100',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    zIndex: 3,
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
    maxWidth: 'calc(100% - 6rem)',
    lineHeight: 1.2,
  },
  rentalModeBadge: {
    position: 'absolute',
    bottom: '0.75rem',
    left: '0.75rem',
    padding: '0.35rem 0.65rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    zIndex: 2,
    lineHeight: 1.2,
  },
  rentalModeBadgeSelf: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  rentalModeBadgeDriver: {
    backgroundColor: '#F3E5F5',
    color: '#7B1FA2',
  },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 0', color: '#888' },
  emptyTitle: { color: '#111', marginBottom: '0.5rem', fontSize: '1.1rem' },
  emptyMessage: { maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 },
  clearFiltersBtn: {
    marginTop: '1.25rem',
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
    color: '#0033FF',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 10',
    overflow: 'hidden',
    backgroundColor: '#F0F1F3',
    flexShrink: 0,
  },
  image: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  fallbackImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECEEF2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#FFF',
    padding: '0.35rem 0.7rem',
    borderRadius: '6px',
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    zIndex: 2,
    lineHeight: 1.2,
  },
  cardBody: { padding: '1rem 1.1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' },
  cardTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.85rem',
  },
  carName: { fontSize: '1rem', fontWeight: 600, color: '#111', margin: 0, lineHeight: 1.3 },
  ratingBadge: { display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#333', flexShrink: 0 },
  specsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0 1rem',
    marginBottom: '1.25rem',
  },
  specDivider: {
    width: '1px',
    height: '14px',
    backgroundColor: '#E0E0E0',
    flexShrink: 0,
  },
  feature: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '0.85rem',
    marginTop: 'auto',
    borderTop: '1px solid #F0F0F0',
    gap: '0.5rem',
  },
  price: { fontSize: '1.25rem', fontWeight: 700, color: '#111' },
  perDay: { fontSize: '0.8rem', color: '#888' },
  bookBtn: { backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' },
  bookBtnDisabled: {
    backgroundColor: '#E0E0E0',
    color: '#888',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  driverNote: {
    padding: '0.75rem 1rem',
    backgroundColor: '#F3E5F5',
    border: '1px solid #E1BEE7',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#6A1B9A',
    lineHeight: 1.5,
  },
  locationHint: {
    margin: '0 0 0.35rem',
    fontSize: '0.8rem',
    color: '#666',
    lineHeight: 1.4,
    textTransform: 'none',
    letterSpacing: 'normal',
    fontWeight: 400,
  },
  etaPreview: {
    margin: '0.35rem 0 0',
    fontSize: '0.8rem',
    color: '#1565C0',
    fontWeight: 600,
    lineHeight: 1.4,
  },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '800px', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' },
  modalTitle: { fontSize: '1.25rem', fontWeight: 600, color: '#111' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex' },
  modalBody: { display: 'flex', padding: '2rem', gap: '2.5rem', flexWrap: 'wrap' },
  modalSpecs: { flex: '1', minWidth: '250px', border: '1px solid #E0E0E0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FAFAFA' },
  specsContent: { padding: '1.5rem' },
  specsFeatures: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' },
  specsPrice: { paddingTop: '1rem', borderTop: '1px solid #E0E0E0' },
  modalForm: { flex: '2', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' },
  inputWrapper: { display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #E0E0E0', borderRadius: '8px', padding: '0.85rem 1rem', backgroundColor: '#FFF' },
  input: { border: 'none', outline: 'none', flex: 1, fontSize: '0.95rem', fontFamily: 'var(--font-primary)', color: '#111', backgroundColor: 'transparent' },
  modalFooter: { padding: '1.5rem 2rem', borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', backgroundColor: '#FAFAFA' },
  cancelBtn: { padding: '0.85rem 1.5rem', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#FFF', fontWeight: 600, cursor: 'pointer', color: '#555', transition: 'all 0.2s ease' },
  confirmBtn: { padding: '0.85rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#0033FF', color: '#FFF', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' },

  successModal: { backgroundColor: '#FFF', borderRadius: '16px', width: '100%', maxWidth: '450px', padding: '2.5rem', textAlign: 'center', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' },
  successIconWrapper: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#E8F5E9', marginBottom: '1.5rem' },
  successTitle: { fontSize: '1.5rem', fontWeight: 600, color: '#111', marginBottom: '0.75rem' },
  successDesc: { fontSize: '0.95rem', color: '#666', lineHeight: 1.5, marginBottom: '2rem' },
  successActions: { display: 'flex', gap: '1rem', justifyContent: 'center' },
  viewBookingsBtn: { padding: '0.85rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#2E7D32', color: '#FFF', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s ease', flex: 1, display: 'inline-block' },
};

export default CustomerFleet;
