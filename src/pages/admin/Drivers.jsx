import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search, MoreHorizontal, ChevronLeft, ChevronRight, X, ShieldCheck, ShieldAlert,
  Mail, Phone, MapPin, Car, FileText, Plus, Pencil, Navigation, Copy, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import Modal from '../../components/Modal';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { seedDrivers } from '../../utils/seedData';
import { fetchAllBookings, updateBooking } from '../../utils/supabaseBookings';
import { formatBookingDateRange } from '../../utils/bookings';
import {
  bookingRequiresDriver,
  DRIVER_ASSIGNABLE_BOOKING_STATUSES,
} from '../../utils/rentalMode';
import { resolveHubForVehicle, loadAvailableHubLocations } from '../../utils/hubLocations';
import { hasValidCoordinates } from '../../utils/bookingLocation';
import { findUserIdByDriverId, findUserIdByEmail, notifyDriverUser } from '../../utils/notifications';
import { reconcileStaleOnDutyDrivers } from '../../utils/driverDutySync';
import {
  provisionDriverLogin,
  getDriverAuthErrorMessage,
  loadBusinessName,
  fetchDriverAuthCredentials,
  resetDriverPortalPassword,
} from '../../utils/createDriverAccount';
import { getCompanyPasswordPrefix } from '../../utils/driverPassword';
import { useAdminSearch } from '../../contexts/AdminSearchContext';
import { STAFF_TYPE_OPTIONS, STAFF_TYPES, getStaffTypeLabel } from '../../utils/roles';
import { provisionStaffLogin, fetchStaffAuthCredentials, resetStaffPortalPassword } from '../../utils/staffAccounts';
import { fetchAllUsers } from '../../utils/analytics';

const DRIVER_STATUSES = ['Available', 'On Duty', 'Off Duty'];
const STAFF_STATUS_OPTIONS = ['All Status', 'Active', ...DRIVER_STATUSES];

const EMPTY_DRIVER = {
  id: '',
  name: '',
  email: '',
  phone: '',
  location: '',
  status: 'Available',
  verified: false,
  licenseNo: '',
  completedTrips: 0,
  rating: 0,
  staffType: STAFF_TYPES.DRIVER,
};

const buildAvatar = (name) =>
  (name || 'DR')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

/** Treat "Pending" as empty so the license field stays editable. */
const normalizeLicenseNo = (licenseNo) => {
  const value = (licenseNo || '').trim();
  return value === 'Pending' ? '' : value;
};

/** Verified with a real license number on file. */
const isDriverFullyVerified = (driver) =>
  Boolean(driver?.verified) && Boolean(normalizeLicenseNo(driver?.licenseNo));

const canAssignDriver = (driver) =>
  isDriverFullyVerified(driver) && driver?.status === 'Available';

const FieldLabel = ({ text, required = false }) => (
  <span style={labelRowStyle}>
    <span>{text}</span>
    {required && <span style={requiredMarkStyle} aria-hidden="true">*</span>}
  </span>
);

const labelRowStyle = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '0.25rem',
  whiteSpace: 'nowrap',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#555',
};

const requiredMarkStyle = { color: '#C62828', flexShrink: 0 };

const STAFF_SECTION_META = {
  [STAFF_TYPES.DRIVER]: {
    title: 'Drivers',
    addLabel: 'Add driver',
    counterLabel: 'drivers',
  },
  [STAFF_TYPES.SUPPORT]: {
    title: 'Contact and Support',
    addLabel: 'Add staff',
    counterLabel: 'staff',
  },
  [STAFF_TYPES.MAINTENANCE]: {
    title: 'Maintenance staff',
    addLabel: 'Add staff',
    counterLabel: 'staff',
  },
};

const getStaffTypeFromPath = (pathname) => {
  if (pathname.includes('/staff/support')) return STAFF_TYPES.SUPPORT;
  if (pathname.includes('/staff/maintenance')) return STAFF_TYPES.MAINTENANCE;
  if (pathname.includes('/staff/drivers') || pathname.endsWith('/drivers')) return STAFF_TYPES.DRIVER;
  return null;
};

const Drivers = () => {
  const location = useLocation();
  const fixedStaffType = useMemo(
    () => getStaffTypeFromPath(location.pathname),
    [location.pathname]
  );
  const sectionMeta = fixedStaffType ? STAFF_SECTION_META[fixedStaffType] : null;

  const { items: drivers, loading, save } = useFirestoreCollection('drivers', { realtime: true });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { query: adminSearchQuery } = useAdminSearch();
  const [hubFilter, setHubFilter] = useState('All Hubs');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [availableHubs, setAvailableHubs] = useState([]);
  const [hubsLoading, setHubsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [staffTypeFilter, setStaffTypeFilter] = useState('All Types');
  const [internalStaff, setInternalStaff] = useState([]);

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER);
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  const [formError, setFormError] = useState('');

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDriver, setAssignDriver] = useState(null);
  const [assignableBookings, setAssignableBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifyLicenseNo, setVerifyLicenseNo] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [profileLicenseNo, setProfileLicenseNo] = useState('');
  const [saveDriverLoading, setSaveDriverLoading] = useState(false);
  const [passwordPrefixHint, setPasswordPrefixHint] = useState('Drive');
  const [portalAuth, setPortalAuth] = useState(null);
  const [portalAuthLoading, setPortalAuthLoading] = useState(false);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const onDutySyncKey = useMemo(
    () => drivers
      .filter((d) => d.status === 'On Duty' || d.assignedBookingId)
      .map((d) => `${d.id}:${d.status}:${d.assignedBookingId || ''}`)
      .join('|'),
    [drivers]
  );

  useEffect(() => {
    if (loading || !onDutySyncKey) return undefined;
    let cancelled = false;
    reconcileStaleOnDutyDrivers(drivers).catch((err) => {
      if (!cancelled) console.error(err);
    });
    return () => { cancelled = true; };
  }, [loading, onDutySyncKey, drivers]);

  useEffect(() => {
    if (!showDriverForm || isEditingDriver) return;
    loadBusinessName().then((name) => setPasswordPrefixHint(getCompanyPasswordPrefix(name)));
  }, [showDriverForm, isEditingDriver]);

  useEffect(() => {
    if (!showDriverForm) return;
    let cancelled = false;
    setHubsLoading(true);
    loadAvailableHubLocations({ forceRefresh: true })
      .then((hubs) => {
        if (!cancelled) setAvailableHubs(hubs);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setAvailableHubs([]);
      })
      .finally(() => {
        if (!cancelled) setHubsLoading(false);
      });
    return () => { cancelled = true; };
  }, [showDriverForm]);

  useEffect(() => {
    const loadHubs = async () => {
      setHubsLoading(true);
      try {
        const hubs = await loadAvailableHubLocations({ forceRefresh: true });
        setAvailableHubs(hubs);
      } catch (err) {
        console.error(err);
        setAvailableHubs([]);
      } finally {
        setHubsLoading(false);
      }
    };
    loadHubs();
  }, []);

  const reloadInternalStaff = async () => {
    try {
      const users = await fetchAllUsers();
      setInternalStaff(
        users.filter(
          (u) => u.role === 'staff'
            && [STAFF_TYPES.SUPPORT, STAFF_TYPES.MAINTENANCE].includes(u.staffType)
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    reloadInternalStaff();
  }, []);

  useEffect(() => {
    if (selectedDriver?.recordType === 'user') {
      setProfileLicenseNo('');
      setShowPortalPassword(false);
      setPortalAuthLoading(true);
      fetchStaffAuthCredentials({
        uid: selectedDriver.uid,
        staffKey: selectedDriver.staffKey,
      })
        .then(setPortalAuth)
        .catch((err) => {
          console.error(err);
          setPortalAuth(null);
        })
        .finally(() => setPortalAuthLoading(false));
      return;
    }
    if (selectedDriver) {
      setProfileLicenseNo(normalizeLicenseNo(selectedDriver.licenseNo));
      setShowPortalPassword(false);
      setPortalAuthLoading(true);
      fetchDriverAuthCredentials(selectedDriver.id)
        .then(setPortalAuth)
        .catch((err) => {
          console.error(err);
          setPortalAuth(null);
        })
        .finally(() => setPortalAuthLoading(false));
    } else {
      setProfileLicenseNo('');
      setPortalAuth(null);
      setShowPortalPassword(false);
    }
  }, [selectedDriver]);

  const activeHubNames = useMemo(
    () => availableHubs.map((h) => h.name),
    [availableHubs]
  );

  useEffect(() => {
    if (!showDriverForm || isEditingDriver || hubsLoading) return;
    if (!driverForm.location?.trim() && activeHubNames[0]) {
      setDriverForm((prev) => ({ ...prev, location: activeHubNames[0] }));
    }
  }, [showDriverForm, isEditingDriver, hubsLoading, activeHubNames, driverForm.location]);

  useEffect(() => {
    if (!showDriverForm || isEditingDriver || !fixedStaffType) return;
    setDriverForm((prev) => (
      prev.staffType === fixedStaffType
        ? prev
        : { ...prev, staffType: fixedStaffType, id: fixedStaffType === STAFF_TYPES.DRIVER ? prev.id : '' }
    ));
  }, [showDriverForm, isEditingDriver, fixedStaffType]);

  /** Hub dropdown when adding/editing a driver — active locations only (+ current value when editing). */
  const formHubOptions = useMemo(() => {
    const names = [...activeHubNames];
    const current = driverForm.location?.trim();
    if (current && !names.includes(current)) {
      names.push(current);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [activeHubNames, driverForm.location]);

  const hubFilterOptions = useMemo(() => {
    const fromDrivers = drivers.map((d) => d.location).filter(Boolean);
    return [...new Set([...activeHubNames, ...fromDrivers])].sort();
  }, [drivers, activeHubNames]);

  const allStaffRows = useMemo(() => {
    const driverRows = drivers.map((d) => ({
      ...d,
      staffType: STAFF_TYPES.DRIVER,
      recordType: 'driver',
      rowKey: `driver-${d.id}`,
    }));
    const userRows = internalStaff.map((u) => ({
      id: u.staffKey || u.id.slice(0, 8).toUpperCase(),
      uid: u.id,
      staffKey: u.staffKey,
      name: u.name,
      email: u.email,
      phone: u.phone || '—',
      staffType: u.staffType,
      location: '—',
      status: 'Active',
      verified: true,
      licenseNo: '—',
      completedTrips: null,
      rating: 0,
      avatar: buildAvatar(u.name || u.email || 'ST'),
      recordType: 'user',
      rowKey: `user-${u.id}`,
    }));
    return [...driverRows, ...userRows];
  }, [drivers, internalStaff]);

  const filteredStaff = useMemo(() => {
    let rows = allStaffRows;
    const activeTypeFilter = fixedStaffType
      || (staffTypeFilter !== 'All Types' ? staffTypeFilter : null);
    if (activeTypeFilter) {
      rows = rows.filter((r) => r.staffType === activeTypeFilter);
    }
    if (hubFilter !== 'All Hubs') {
      rows = rows.filter((r) => r.recordType !== 'driver' || r.location === hubFilter);
    }
    if (statusFilter !== 'All Status') {
      rows = rows.filter((r) => r.recordType !== 'driver' || r.status === statusFilter);
    }
    const combined = `${searchQuery || ''} ${adminSearchQuery || ''}`.trim();
    if (combined) {
      const q = combined.toLowerCase();
      rows = rows.filter((r) =>
        r.name?.toLowerCase().includes(q)
        || r.id?.toLowerCase().includes(q)
        || r.email?.toLowerCase().includes(q)
        || getStaffTypeLabel(r.staffType).toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allStaffRows, fixedStaffType, staffTypeFilter, hubFilter, statusFilter, searchQuery, adminSearchQuery]);

  React.useEffect(() => {
    setPage(0);
  }, [hubFilter, statusFilter, staffTypeFilter, searchQuery, adminSearchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const pagedStaff = filteredStaff.slice(page * pageSize, page * pageSize + pageSize);

  const effectiveStaffType = fixedStaffType || driverForm.staffType || STAFF_TYPES.DRIVER;
  const isDriverStaffForm = effectiveStaffType === STAFF_TYPES.DRIVER;

  const syncSelectedDriver = (updated) => {
    if (!selectedDriver) return;
    if (selectedDriver.recordType === 'user' && updated.uid === selectedDriver.uid) {
      setSelectedDriver({ ...selectedDriver, ...updated });
    } else if (selectedDriver.recordType !== 'user' && selectedDriver.id === updated.id) {
      setSelectedDriver({ ...selectedDriver, ...updated });
    }
  };

  const openAddDriverForm = () => {
    const staffType = fixedStaffType || STAFF_TYPES.DRIVER;
    setDriverForm({
      ...EMPTY_DRIVER,
      id: staffType === STAFF_TYPES.DRIVER ? `DRV-${Date.now().toString().slice(-4)}` : '',
      location: activeHubNames[0] || '',
      staffType,
    });
    setIsEditingDriver(false);
    setFormError('');
    setShowDriverForm(true);
  };

  const openEditDriverForm = (driver) => {
    if (driver.recordType === 'user') {
      setDriverForm({
        ...EMPTY_DRIVER,
        recordType: 'user',
        uid: driver.uid,
        staffKey: driver.staffKey,
        staffType: driver.staffType,
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone === '—' ? '' : driver.phone,
      });
    } else {
      setDriverForm({
        ...EMPTY_DRIVER,
        ...driver,
        staffType: STAFF_TYPES.DRIVER,
        licenseNo: normalizeLicenseNo(driver.licenseNo),
      });
    }
    setIsEditingDriver(true);
    setFormError('');
    setShowDriverForm(true);
    setActiveDropdown(null);
  };

  const closeDriverForm = () => {
    setShowDriverForm(false);
    setDriverForm(EMPTY_DRIVER);
    setFormError('');
  };

  const setDriverField = (key) => (e) => {
    setDriverForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const saveDriverForm = async () => {
    const name = driverForm.name.trim();
    const email = driverForm.email.trim();
    const phone = driverForm.phone.trim();
    const staffType = fixedStaffType || driverForm.staffType || STAFF_TYPES.DRIVER;
    const isDriverStaff = staffType === STAFF_TYPES.DRIVER;

    if (!name) {
      setFormError('Full name is required.');
      return;
    }
    if (!email) {
      setFormError('Email is required.');
      return;
    }
    if (!phone) {
      setFormError('Phone number is required.');
      return;
    }

    if (
      !isEditingDriver
      && isDriverStaff
      && !activeHubNames.length
    ) {
      setFormError('Add at least one Active hub in Admin → Locations before adding a driver.');
      return;
    }

    if (!isDriverStaff && !isEditingDriver) {
      setSaveDriverLoading(true);
      setFormError('');
      try {
        const login = await provisionStaffLogin({ email, name, phone, staffType });
        await reloadInternalStaff();
        closeDriverForm();
        const newStaff = {
          id: login.staffKey,
          uid: login.uid,
          staffKey: login.staffKey,
          name,
          email: login.email,
          phone,
          staffType,
          recordType: 'user',
          avatar: buildAvatar(name),
          rowKey: `user-${login.uid}`,
          location: '—',
          status: 'Active',
          verified: true,
        };
        setSelectedDriver(newStaff);
        setPortalAuth({
          email: login.email,
          password: login.password,
          uid: login.uid,
          staffKey: login.staffKey,
        });
        setActionMessage(`${getStaffTypeLabel(staffType)} added. Portal password is in the profile.`);
        setTimeout(() => setActionMessage(''), 5000);
      } catch (err) {
        console.error(err);
        setFormError(getDriverAuthErrorMessage(err) || 'Could not add staff member. Please try again.');
      } finally {
        setSaveDriverLoading(false);
      }
      return;
    }

    if (isEditingDriver && selectedDriver?.recordType === 'user') {
      setSaveDriverLoading(true);
      setFormError('');
      try {
        await setDoc(
          doc(db, 'users', selectedDriver.uid),
          {
            name,
            phone,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await reloadInternalStaff();
        const updated = {
          ...selectedDriver,
          name,
          phone: phone || '—',
          avatar: buildAvatar(name),
        };
        syncSelectedDriver(updated);
        setSelectedDriver(updated);
        closeDriverForm();
        setActionMessage('Staff profile updated.');
        setTimeout(() => setActionMessage(''), 4000);
      } catch (err) {
        console.error(err);
        setFormError('Could not update staff profile. Please try again.');
      } finally {
        setSaveDriverLoading(false);
      }
      return;
    }

    const id = driverForm.id.trim();

    if (!id) {
      setFormError('Driver ID is required.');
      return;
    }
    if (!activeHubNames.length) {
      setFormError('No active hubs available. Add or activate a hub under Admin → Locations.');
      return;
    }
    const hub = driverForm.location.trim();
    if (!hub) {
      setFormError('Select a hub location.');
      return;
    }
    const hubAllowed = activeHubNames.includes(hub)
      || (isEditingDriver && hub === (selectedDriver?.location || '').trim());
    if (!hubAllowed) {
      setFormError('Selected hub is not active. Choose a hub from Admin → Locations (status: Active).');
      return;
    }

    const licenseNo = driverForm.licenseNo.trim();

    const payload = {
      ...driverForm,
      id,
      name,
      email,
      phone,
      staffType: STAFF_TYPES.DRIVER,
      location: hub,
      licenseNo: licenseNo || 'Pending',
      avatar: buildAvatar(name),
      completedTrips: Number(driverForm.completedTrips) || 0,
      rating: Number(driverForm.rating) || 0,
    };
    
    delete payload.recordType;
    delete payload.rowKey;

    setSaveDriverLoading(true);
    setFormError('');

    try {
      if (!isEditingDriver) {
        const login = await provisionDriverLogin({
          email,
          name,
          phone,
          driverId: id,
        });
        await save({ ...payload, email: login.email });
        const savedDriver = {
          ...payload,
          email: login.email,
          recordType: 'driver',
          rowKey: `driver-${id}`,
        };
        syncSelectedDriver(savedDriver);
        closeDriverForm();
        setSelectedDriver(savedDriver);
        setPortalAuth({
          email: login.email,
          password: login.password,
          uid: login.uid,
        });
        setActionMessage('Driver added. Portal password is in the driver profile.');
        setTimeout(() => setActionMessage(''), 5000);
      } else {
        await save(payload);
        const updated = {
          ...payload,
          recordType: 'driver',
          rowKey: selectedDriver?.rowKey || `driver-${id}`,
        };
        syncSelectedDriver(updated);
        setSelectedDriver((prev) => (prev ? { ...prev, ...updated } : prev));
        closeDriverForm();
        setActionMessage('Driver profile updated.');
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setFormError(getDriverAuthErrorMessage(err) || 'Could not save driver. Please try again.');
    } finally {
      setSaveDriverLoading(false);
    }
  };

  const copyPortalLogin = async () => {
    if (!selectedDriver || !portalAuth?.password) return;
    const isStaffUser = selectedDriver.recordType === 'user';
    const text = (
      isStaffUser
        ? [
            'Drive PH — Staff login',
            `Email: ${portalAuth.email || selectedDriver.email}`,
            `Password: ${portalAuth.password}`,
            `Staff ref: ${selectedDriver.id}`,
            `Role: ${getStaffTypeLabel(selectedDriver.staffType)}`,
            `Portal: ${window.location.origin}/login`,
          ]
        : [
            'Drive PH — Chauffeur login',
            `Email: ${portalAuth.email || selectedDriver.email}`,
            `Password: ${portalAuth.password}`,
            `Driver ID: ${selectedDriver.id}`,
            `Portal: ${window.location.origin}/login`,
          ]
    ).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage('Login details copied to clipboard.');
      setTimeout(() => setActionMessage(''), 3000);
    } catch {
      setActionMessage('Could not copy to clipboard.');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleResetPortalPassword = async () => {
    if (!selectedDriver?.email) return;
    const isInternalStaff = selectedDriver.recordType === 'user';
    const confirmMsg = isInternalStaff
      ? 'Generate a new portal password for this staff member?'
      : 'Generate a new portal password for this chauffeur?';
    if (!window.confirm(confirmMsg)) return;
    setResetPasswordLoading(true);
    try {
      if (isInternalStaff) {
        let staffKey = selectedDriver.staffKey || portalAuth?.staffKey;
        if (!staffKey && selectedDriver.uid) {
          const creds = await fetchStaffAuthCredentials({ uid: selectedDriver.uid });
          staffKey = creds?.staffKey;
          if (creds?.staffKey) setPortalAuth((p) => ({ ...p, ...creds }));
        }
        const result = await resetStaffPortalPassword({
          staffKey,
          email: selectedDriver.email,
          staffType: selectedDriver.staffType,
        });
        setPortalAuth((prev) => ({
          ...prev,
          email: result.email,
          password: result.password,
        }));
      } else {
        const result = await resetDriverPortalPassword({
          driverId: selectedDriver.id,
          email: selectedDriver.email,
        });
        setPortalAuth((prev) => ({
          ...prev,
          email: result.email,
          password: result.password,
        }));
      }
      setShowPortalPassword(true);
      setActionMessage('Portal password updated. Share the new password with the staff member.');
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err) {
      console.error(err);
      setActionMessage(getDriverAuthErrorMessage(err) || 'Could not reset password.');
      setTimeout(() => setActionMessage(''), 5000);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const openVerifyModal = (driver, licenseOverride) => {
    setVerifyTarget(driver);
    setVerifyLicenseNo(
      (licenseOverride || '').trim() || normalizeLicenseNo(driver.licenseNo)
    );
    setVerifyError('');
    setShowVerifyModal(true);
    setActiveDropdown(null);
  };

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setVerifyTarget(null);
    setVerifyLicenseNo('');
    setVerifyError('');
  };

  const confirmVerifyDriver = async () => {
    if (!verifyTarget) return;
    const licenseNo = verifyLicenseNo.trim();
    if (!licenseNo) {
      setVerifyError('Enter a professional license number.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError('');
    try {
      const updated = { ...verifyTarget, verified: true, licenseNo };
      await save(updated);
      syncSelectedDriver(updated);
      closeVerifyModal();
      setActionMessage(`${verifyTarget.name} verified.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setVerifyError('Could not verify driver. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const saveProfileLicense = async () => {
    if (!selectedDriver) return;
    const licenseNo = profileLicenseNo.trim();
    if (!licenseNo) return;

    const updated = { ...selectedDriver, licenseNo };
    try {
      await save(updated);
      syncSelectedDriver(updated);
      setActionMessage('License number saved.');
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Could not save license number.');
    }
  };

  const openAssignModal = async (driver) => {
    setActiveDropdown(null);

    if (!isDriverFullyVerified(driver)) {
      setActionMessage('Verify this driver\'s license before assigning a booking.');
      setTimeout(() => setActionMessage(''), 4000);
      return;
    }
    if (driver.status !== 'Available') {
      setActionMessage('Only available drivers can be assigned to a booking.');
      setTimeout(() => setActionMessage(''), 4000);
      return;
    }

    setAssignDriver(driver);
    setAssignError('');
    setSelectedBookingId('');

    try {
      const [bookings, vehicleSnap] = await Promise.all([
        fetchAllBookings(),
        getDocs(collection(db, 'vehicles')),
      ]);

      const vehicleRentalModeById = new Map();
      vehicleSnap.forEach((d) => {
        const data = d.data();
        const mode = data.rentalMode;
        vehicleRentalModeById.set(d.id, mode);
        if (data.id) vehicleRentalModeById.set(data.id, mode);
      });

      const eligible = bookings.filter(
        (b) => DRIVER_ASSIGNABLE_BOOKING_STATUSES.includes(b.status)
          && !b.driverId
          && bookingRequiresDriver(b, vehicleRentalModeById.get(b.vehicleId))
      );
      setAssignableBookings(eligible);
      setSelectedBookingId(eligible[0]?.docId || '');
      setShowAssignModal(true);
    } catch (err) {
      console.error(err);
      setAssignableBookings([]);
      setActionMessage('Could not load bookings. Check Supabase configuration.');
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignDriver(null);
    setAssignableBookings([]);
    setSelectedBookingId('');
    setAssignError('');
  };

  const confirmAssign = async () => {
    if (!assignDriver || !selectedBookingId) {
      setAssignError('Select a booking to assign.');
      return;
    }
    if (!canAssignDriver(assignDriver)) {
      setAssignError('This driver must be verified and available before assignment.');
      return;
    }

    const booking = assignableBookings.find((b) => b.docId === selectedBookingId);
    if (!booking) return;

    setAssignLoading(true);
    setAssignError('');
    try {
      await updateBooking(selectedBookingId, {
        driverId: assignDriver.id,
        driverName: assignDriver.name,
      });

      let hubCoords = null;
      if (hasValidCoordinates({ lat: booking.hubLat, lng: booking.hubLng })) {
        hubCoords = { lat: booking.hubLat, lng: booking.hubLng };
      } else {
        const hub = await resolveHubForVehicle(booking.hubName || assignDriver.location);
        if (hub) hubCoords = { lat: hub.lat, lng: hub.lng };
      }

      const updatedDriver = {
        ...assignDriver,
        status: 'On Duty',
        assignedBookingId: selectedBookingId,
        ...(hubCoords ? {
          currentLat: hubCoords.lat,
          currentLng: hubCoords.lng,
          locationUpdatedAt: Date.now(),
        } : {}),
      };
      await save(updatedDriver);
      syncSelectedDriver(updatedDriver);
      closeAssignModal();
      setActionMessage(`${assignDriver.name} assigned to ${booking.vehicleName}.`);
      setTimeout(() => setActionMessage(''), 4000);

      try {
        const driverUserId = await findUserIdByDriverId(assignDriver.id)
          || await findUserIdByEmail(assignDriver.email);
        if (driverUserId) {
          await notifyDriverUser({
            userId: driverUserId,
            title: 'New trip assignment',
            message: `You are assigned to ${booking.vehicleName} — ${booking.location || 'pickup pending'}.`,
            link: `/driver/trips/${selectedBookingId}`,
            type: 'assignment',
          });
        }
      } catch (notifyErr) {
        console.warn('Driver notification skipped:', notifyErr);
      }
    } catch (err) {
      console.error(err);
      setAssignError(
        err.message?.includes('driver_id')
          ? 'Run supabase/bookings-driver-columns.sql in Supabase first.'
          : 'Could not assign driver. Please try again.'
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const viewProfile = (driver) => {
    setSelectedDriver(driver);
    setActiveDropdown(null);
  };

  return (
    <>
      <div className="fade-in">
        <div style={styles.pageHeader}>
          <div style={styles.titleArea}>
            <h1 style={styles.pageTitle}>{sectionMeta?.title || 'Staff'}</h1>
            <span style={styles.counter}>
              {filteredStaff.length}
              {' '}
              {sectionMeta?.counterLabel || 'members'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {fixedStaffType === STAFF_TYPES.DRIVER && drivers.length === 0 && (
              <button type="button" style={styles.seedBtn} onClick={seedDrivers}>Seed default drivers</button>
            )}
            <button type="button" style={styles.seedBtn} onClick={openAddDriverForm}>
              <Plus size={16} />
              {' '}
              {sectionMeta?.addLabel || 'Add staff'}
            </button>
          </div>
        </div>

        {actionMessage && <p style={styles.actionMessage}>{actionMessage}</p>}

        <div style={styles.summaryRow}>
          {fixedStaffType === STAFF_TYPES.DRIVER ? (
            <>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{drivers.length}</div>
                <div style={styles.summaryLabel}>Total Drivers</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{drivers.filter((d) => d.status === 'Available').length}</div>
                <div style={styles.summaryLabel}>Available Now</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{drivers.filter((d) => d.status === 'On Duty').length}</div>
                <div style={styles.summaryLabel}>On Duty</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{drivers.filter((d) => !d.verified).length}</div>
                <div style={styles.summaryLabel}>Pending Verification</div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{filteredStaff.length}</div>
                <div style={styles.summaryLabel}>Total {sectionMeta?.title}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryValue}>{filteredStaff.filter((r) => r.status === 'Active').length}</div>
                <div style={styles.summaryLabel}>Active</div>
              </div>
            </>
          )}
        </div>

        <div style={styles.toolbar}>
          <div style={styles.searchBar}>
            <Search size={18} color="#888" />
            <input
              type="text"
              placeholder="Search staff by name, ID, or email..."
              style={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!fixedStaffType && (
            <select
              style={styles.filterSelect}
              value={staffTypeFilter}
              onChange={(e) => setStaffTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              {STAFF_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          {(!fixedStaffType || fixedStaffType === STAFF_TYPES.DRIVER) && (
            <select
              style={styles.filterSelect}
              value={hubFilter}
              onChange={(e) => setHubFilter(e.target.value)}
            >
              <option>All Hubs</option>
              {hubFilterOptions.map((hub) => (
                <option key={hub} value={hub}>{hub}</option>
              ))}
            </select>
          )}
          {(!fixedStaffType || fixedStaffType === STAFF_TYPES.DRIVER) && (
            <select
              style={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STAFF_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          )}
        </div>

        <div style={styles.tableContainer}>
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  {!fixedStaffType && <th>Type</th>}
                  <th>Hub Location</th>
                  <th>Status</th>
                  <th>License / Verification</th>
                  <th>Trips</th>
                  <th>Rating</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={fixedStaffType ? 7 : 8} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                )}
                {!loading && filteredStaff.length === 0 && (
                  <tr><td colSpan={fixedStaffType ? 7 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No staff match your filters.</td></tr>
                )}
                {!loading && pagedStaff.map((d) => (
                  <tr key={d.rowKey} style={{ cursor: 'pointer' }} onClick={() => viewProfile(d)}>
                    <td>
                      <div style={styles.driverCell}>
                        <div style={styles.avatar}>{d.avatar || buildAvatar(d.name)}</div>
                        <div>
                          <div style={styles.primaryText}>{d.name}</div>
                          <div style={styles.secondaryText}>{d.id}</div>
                        </div>
                      </div>
                    </td>
                    {!fixedStaffType && (
                      <td>
                        <span style={styles.typeBadge}>{getStaffTypeLabel(d.staffType)}</span>
                      </td>
                    )}
                    <td style={styles.secondaryText}>{d.location}</td>
                    <td>
                      <span style={{
                        ...styles.statusBadge,
                        ...(d.status === 'Available' || d.status === 'Active' ? styles.badgeSuccess
                          : d.status === 'On Duty' ? styles.badgeWarning : styles.badgeNeutral),
                      }}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td>
                      {d.recordType === 'driver' ? (
                        <>
                          <div style={styles.primaryText}>{d.licenseNo || 'Pending'}</div>
                          {d.verified ? (
                            <span style={{ ...styles.secondaryText, color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <ShieldCheck size={12} /> Verified
                            </span>
                          ) : (
                            <span style={{ ...styles.secondaryText, color: '#F57F17', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <ShieldAlert size={12} /> Unverified
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={styles.secondaryText}>—</span>
                      )}
                    </td>
                    <td style={styles.monoCell}>{d.recordType === 'driver' ? (d.completedTrips ?? 0) : '—'}</td>
                    <td style={styles.monoCell}>{d.recordType === 'driver' && d.rating > 0 ? `⭐ ${d.rating}` : '—'}</td>
                    <td style={styles.actionCell}>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === d.rowKey ? null : d.rowKey);
                          }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {activeDropdown === d.rowKey && (
                          <div style={styles.dropdownMenu} className="fade-in">
                            <button
                              type="button"
                              style={styles.dropdownItem}
                              onClick={(e) => { e.stopPropagation(); viewProfile(d); }}
                            >
                              View Profile
                            </button>
                            {d.recordType === 'driver' && (
                              <>
                                <button
                                  type="button"
                                  style={{
                                    ...styles.dropdownItem,
                                    ...(!canAssignDriver(d) ? styles.dropdownItemDisabled : {}),
                                  }}
                                  aria-disabled={!canAssignDriver(d)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!canAssignDriver(d)) return;
                                    openAssignModal(d);
                                  }}
                                >
                                  Assign to Booking
                                </button>
                                {!d.verified && (
                                  <button
                                    type="button"
                                    style={{ ...styles.dropdownItem, color: '#2E7D32' }}
                                    onClick={(e) => { e.stopPropagation(); openVerifyModal(d); }}
                                  >
                                    Verify License
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.pagination}>
            <div style={styles.pageInfo}>
              Showing <strong>{filteredStaff.length === 0 ? 0 : page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredStaff.length)}</strong> of{' '}
              <strong>{filteredStaff.length}</strong> staff
            </div>
            <div style={styles.pageControls}>
              <button
                type="button"
                style={styles.pageBtn}
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                type="button"
                style={styles.pageBtn}
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedDriver && (
        <>
          <div style={styles.modalOverlay} onClick={() => setSelectedDriver(null)}></div>
          <div style={styles.slideOver} className="slide-in">
            <div style={styles.slideHeader}>
              <h2 style={styles.slideTitle}>{selectedDriver.recordType === 'user' ? 'Staff Profile' : 'Driver Profile'}</h2>
              <button type="button" style={styles.closeBtn} onClick={() => setSelectedDriver(null)}><X size={24} /></button>
            </div>
            <div style={styles.slideContent}>
              <div style={styles.profileHeader}>
                <div style={styles.profileAvatar}>{selectedDriver.avatar || buildAvatar(selectedDriver.name)}</div>
                <div>
                  <h3 style={styles.profileName}>{selectedDriver.name}</h3>
                  <div style={styles.profileId}>{selectedDriver.id}</div>
                </div>
                {selectedDriver.verified ? (
                  <span style={styles.verifiedBadge}><ShieldCheck size={14} /> Verified</span>
                ) : (
                  <span style={styles.unverifiedBadge}><ShieldAlert size={14} /> Unverified</span>
                )}
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Contact & Role</h4>
                <div style={styles.infoRow}><Mail size={16} color="#888" /> {selectedDriver.email}</div>
                <div style={styles.infoRow}><Phone size={16} color="#888" /> {selectedDriver.phone}</div>
                <div style={styles.infoRow}><MapPin size={16} color="#888" /> Base: {selectedDriver.location}</div>
                <div style={styles.infoRow}><ShieldCheck size={16} color="#888" /> Type: {getStaffTypeLabel(selectedDriver.staffType)}</div>
                <div style={styles.infoRow}><Car size={16} color="#888" /> Status: {selectedDriver.status}</div>
                {selectedDriver.recordType === 'driver' && Number.isFinite(selectedDriver.currentLat) && (
                  <div style={styles.infoRow}>
                    <Navigation size={16} color="#888" />
                    Live: {selectedDriver.currentLat.toFixed(5)}, {selectedDriver.currentLng.toFixed(5)}
                  </div>
                )}
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Portal login</h4>
                {portalAuthLoading ? (
                  <p style={styles.fieldHint}>Loading login details…</p>
                ) : portalAuth?.password ? (
                  <>
                    <div style={styles.credentialRow}>
                      <span style={styles.credentialLabel}>Email</span>
                      <code style={styles.credentialValue}>
                        {portalAuth.email || selectedDriver.email}
                      </code>
                    </div>
                    <div style={styles.credentialRow}>
                      <span style={styles.credentialLabel}>Password</span>
                      <div style={styles.passwordRow}>
                        <code style={styles.credentialValue}>
                          {showPortalPassword ? portalAuth.password : '••••••••••••'}
                        </code>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          onClick={() => setShowPortalPassword((v) => !v)}
                          aria-label={showPortalPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPortalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                    <div style={styles.portalActions}>
                      <button type="button" style={styles.btnSecondary} onClick={copyPortalLogin}>
                        <Copy size={16} />
                        Copy login
                      </button>
                      <button
                        type="button"
                        style={styles.btnSecondary}
                        onClick={handleResetPortalPassword}
                        disabled={resetPasswordLoading}
                      >
                        <KeyRound size={16} />
                        {resetPasswordLoading ? 'Resetting…' : 'Reset password'}
                      </button>
                    </div>
                    <p style={styles.fieldHint}>
                      Password format:
                      {' '}
                      {passwordPrefixHint}
                      {' '}
                      + 8 random characters. You can view it here anytime.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={styles.fieldHint}>
                      No portal password on file.
                    </p>
                    <button
                      type="button"
                      style={styles.btnSecondary}
                      onClick={handleResetPortalPassword}
                      disabled={resetPasswordLoading}
                    >
                      <KeyRound size={16} />
                      {resetPasswordLoading ? 'Creating…' : 'Create / reset portal login'}
                    </button>
                  </>
                )}
              </div>

              {selectedDriver.recordType === 'driver' && (
                <>
                  <div style={styles.detailSection}>
                    <h4 style={styles.detailTitle}>Performance</h4>
                    <div style={styles.activityGrid}>
                      <div style={styles.activityCard}>
                        <div style={styles.activityValue}>{selectedDriver.completedTrips ?? 0}</div>
                        <div style={styles.activityLabel}>Completed Trips</div>
                      </div>
                      <div style={styles.activityCard}>
                        <div style={styles.activityValue}>{selectedDriver.rating > 0 ? selectedDriver.rating : 'N/A'}</div>
                        <div style={styles.activityLabel}>Average Rating</div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.detailSection}>
                    <h4 style={styles.detailTitle}>License Documents</h4>
                    {!selectedDriver.verified ? (
                      <>
                        <label style={styles.formLabel}>
                          <FieldLabel text="License Number" required />
                          <input
                            className="location-field"
                            value={profileLicenseNo}
                            onChange={(e) => setProfileLicenseNo(e.target.value)}
                            placeholder="N01-12-123456"
                          />
                        </label>
                        <button
                          type="button"
                          style={styles.btnSecondary}
                          onClick={saveProfileLicense}
                          disabled={!profileLicenseNo.trim()}
                        >
                          Save License Number
                        </button>
                      </>
                    ) : (
                      <div style={styles.infoRow}>
                        <FileText size={16} color="#888" />
                        License No: {selectedDriver.licenseNo}
                      </div>
                    )}
                    <div style={styles.licensePlaceholder}>
                      <span style={{ color: '#888' }}>
                        {selectedDriver.verified
                          ? 'License verified by admin'
                          : 'Enter the license number, then verify when ready'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div style={styles.slideFooter}>
              <button type="button" style={styles.btnSecondary} onClick={() => openEditDriverForm(selectedDriver)}>
                <Pencil size={16} /> Edit Profile
              </button>
              {selectedDriver.recordType === 'driver' && !selectedDriver.verified && (
                <button type="button" style={styles.btnSuccess} onClick={() => openVerifyModal(selectedDriver, profileLicenseNo)}>
                  <ShieldCheck size={18} /> Verify License
                </button>
              )}
              {canAssignDriver(selectedDriver) && (
                <button type="button" style={styles.btnPrimary} onClick={() => openAssignModal(selectedDriver)}>
                  <Car size={18} /> Assign to Booking
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        open={showDriverForm}
        onClose={closeDriverForm}
        title={isEditingDriver ? `Edit ${sectionMeta?.title || 'Staff'}` : `Add ${sectionMeta?.title || 'Staff'}`}
        maxWidth="520px"
        footer={
          <>
            <button type="button" style={styles.btnSecondary} onClick={closeDriverForm}>Cancel</button>
            <button type="button" style={styles.btnPrimary} onClick={saveDriverForm} disabled={saveDriverLoading}>
              {saveDriverLoading ? 'Saving…' : (isEditingDriver ? 'Save Changes' : 'Add Staff')}
            </button>
          </>
        }
      >
        <div style={styles.formScrollArea}>
          <div style={styles.formGrid}>
            {!fixedStaffType && (
              <label style={styles.formLabel}>
                <FieldLabel text="Staff Type" required />
                <select
                  className="location-field location-field-select"
                  value={driverForm.staffType}
                  onChange={setDriverField('staffType')}
                  disabled={isEditingDriver && driverForm.recordType === 'user'}
                >
                  {STAFF_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            )}
            {isDriverStaffForm && (
              <label style={styles.formLabel}>
                <FieldLabel text="Driver ID" required />
                <input
                  className="location-field"
                  style={isEditingDriver ? styles.inputReadOnly : undefined}
                  value={driverForm.id}
                  onChange={setDriverField('id')}
                  placeholder="DRV-1001"
                  readOnly={isEditingDriver}
                  disabled={isEditingDriver}
                />
              </label>
            )}
            <label style={styles.formLabel}>
              <FieldLabel text="Full Name" required />
              <input className="location-field" value={driverForm.name} onChange={setDriverField('name')} placeholder="Juan Dela Cruz" />
            </label>
            <label style={styles.formLabel}>
              <FieldLabel text="Email" required />
              <input type="email" className="location-field" value={driverForm.email} onChange={setDriverField('email')} placeholder="driver@email.com" />
            </label>
            <label style={styles.formLabel}>
              <FieldLabel text="Phone" required />
              <input type="tel" className="location-field" value={driverForm.phone} onChange={setDriverField('phone')} placeholder="09XX XXX XXXX" />
            </label>
            {isDriverStaffForm && (
              <>
                <label style={styles.formLabel}>
                  <FieldLabel text="Hub Location" required />
                  <select
                    className="location-field location-field-select"
                    value={driverForm.location}
                    onChange={setDriverField('location')}
                    disabled={hubsLoading || formHubOptions.length === 0}
                  >
                    {hubsLoading && <option value="">Loading hubs…</option>}
                    {!hubsLoading && formHubOptions.length === 0 && (
                      <option value="">No active hubs — add in Locations</option>
                    )}
                    {!hubsLoading && formHubOptions.map((hub) => (
                      <option key={hub} value={hub}>{hub}</option>
                    ))}
                  </select>
                  {!hubsLoading && formHubOptions.length > 0 && (
                    <span style={styles.fieldHint}>
                      Only hubs marked <strong>Active</strong> in Admin → Locations are listed.
                    </span>
                  )}
                </label>
                <label style={styles.formLabel}>
                  <FieldLabel text="Status" required />
                  <select className="location-field location-field-select" value={driverForm.status} onChange={setDriverField('status')}>
                    {DRIVER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label style={{ ...styles.formLabel, gridColumn: '1 / -1' }}>
                  <FieldLabel text="License Number" />
                  <input className="location-field" value={driverForm.licenseNo} onChange={setDriverField('licenseNo')} placeholder="N01-12-123456" />
                </label>
              </>
            )}
          </div>
          {!isEditingDriver && (
            <p style={styles.fieldHint}>
              <KeyRound size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              A portal login is created automatically. Password =
              {' '}
              <strong>{passwordPrefixHint}</strong>
              {' '}
              + 8 random characters (from Settings → Business company name).
            </p>
          )}
          {formError && <p style={styles.formError}>{formError}</p>}
        </div>
      </Modal>

      <Modal
        open={showAssignModal}
        onClose={closeAssignModal}
        title={`Assign ${assignDriver?.name || 'Driver'}`}
        maxWidth="520px"
        footer={
          assignableBookings.length === 0 ? (
            <button type="button" style={styles.btnSecondary} onClick={closeAssignModal}>
              Close
            </button>
          ) : (
            <>
              <button type="button" style={styles.btnSecondary} onClick={closeAssignModal} disabled={assignLoading}>
                Cancel
              </button>
              <button
                type="button"
                style={styles.btnPrimary}
                onClick={confirmAssign}
                disabled={assignLoading || !selectedBookingId}
              >
                {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </>
          )
        }
      >
        <div style={styles.formScrollArea}>
          {assignableBookings.length === 0 ? (
            <p style={styles.assignEmpty}>
              No chauffeur bookings are ready to assign. You need a Pending, Approved, or Active
              reservation for a with-driver vehicle that does not already have a driver assigned.
            </p>
          ) : (
            <label style={styles.formLabel}>
              <FieldLabel text="Select booking" required />
              <select
                className="location-field location-field-select"
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
              >
                {assignableBookings.map((b) => (
                  <option key={b.docId} value={b.docId}>
                    {b.vehicleName} — {formatBookingDateRange(b.startDate, b.endDate)} ({b.status})
                  </option>
                ))}
              </select>
            </label>
          )}
          {assignError && <p style={styles.formError}>{assignError}</p>}
        </div>
      </Modal>

      <Modal
        open={showVerifyModal}
        onClose={closeVerifyModal}
        title={`Verify ${verifyTarget?.name || 'Driver'}`}
        maxWidth="480px"
        footer={
          <>
            <button type="button" style={styles.btnSecondary} onClick={closeVerifyModal} disabled={verifyLoading}>Cancel</button>
            <button type="button" style={styles.btnSuccess} onClick={confirmVerifyDriver} disabled={verifyLoading}>
              {verifyLoading ? 'Verifying...' : 'Verify License'}
            </button>
          </>
        }
      >
        <div style={styles.formScrollArea}>
          <label style={styles.formLabel}>
            <FieldLabel text="Professional License Number" required />
            <input
              className="location-field"
              value={verifyLicenseNo}
              onChange={(e) => setVerifyLicenseNo(e.target.value)}
              placeholder="N01-12-123456"
              autoFocus
            />
          </label>
          <p style={styles.fieldHint}>Enter the license number before marking this driver as verified.</p>
          {verifyError && <p style={styles.formError}>{verifyError}</p>}
        </div>
      </Modal>
    </>
  );
};

const styles = {
  seedBtn: { padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #E0E0E0', background: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  counter: { fontSize: '0.9rem', color: '#888' },
  actionMessage: { color: '#2E7D32', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' },
  summaryCard: { backgroundColor: '#FFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  summaryValue: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem' },
  summaryLabel: { color: '#666', fontSize: '0.85rem' },
  toolbar: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  searchBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1, maxWidth: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--font-primary)', width: '100%' },
  filterSelect: { padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', backgroundColor: '#FFF', cursor: 'pointer' },
  tableContainer: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', minHeight: '400px' },
  tableScroll: { overflowX: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  driverCell: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#0033FF', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 },
  primaryText: { fontWeight: 600, fontSize: '0.95rem', color: '#111' },
  secondaryText: { fontSize: '0.8rem', color: '#888', marginTop: '0.1rem' },
  typeBadge: {
    padding: '0.3rem 0.6rem',
    borderRadius: '999px',
    backgroundColor: '#EEF2FF',
    color: '#3730A3',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  monoCell: { fontFamily: 'monospace', fontSize: '0.95rem' },
  statusBadge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarning: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  badgeNeutral: { backgroundColor: '#F5F5F7', color: '#666' },
  verifiedBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#2E7D32' },
  unverifiedBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#FFF8E1', color: '#F57F17' },
  actionCell: { textAlign: 'right', paddingRight: '1.5rem' },
  iconBtn: { color: '#888', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', right: '2rem', top: '50%', backgroundColor: '#FFF', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '180px', overflow: 'hidden' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', width: '100%', textAlign: 'left', fontSize: '0.85rem', color: '#333', cursor: 'pointer', borderBottom: '1px solid #F0F0F0' },
  dropdownItemDisabled: { color: '#AAA', cursor: 'not-allowed', opacity: 0.65 },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#FAFAFA', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
  pageInfo: { fontSize: '0.85rem', color: '#666' },
  pageControls: { display: 'flex', gap: '0.5rem' },
  pageBtn: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.85rem', cursor: 'pointer', color: '#333' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200 },
  slideOver: { position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '500px', height: '100vh', backgroundColor: '#FFF', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' },
  slideHeader: { padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  slideTitle: { fontSize: '1.5rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888' },
  slideContent: { flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  profileAvatar: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0033FF', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 600 },
  profileName: { fontSize: '1.25rem', fontWeight: 600 },
  profileId: { fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' },
  detailSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  detailTitle: { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', marginBottom: '0.25rem' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' },
  activityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  activityCard: { backgroundColor: '#F5F5F7', padding: '1.25rem', borderRadius: '8px' },
  activityValue: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' },
  activityLabel: { fontSize: '0.8rem', color: '#666' },
  licensePlaceholder: { width: '100%', height: '150px', backgroundColor: '#F5F5F7', border: '1px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  slideFooter: { padding: '2rem', borderTop: '1px solid #F3F4F6', backgroundColor: '#FAFAFA', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' },
  btnSuccess: { backgroundColor: '#2E7D32', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  btnPrimary: { backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  btnSecondary: { backgroundColor: '#FFF', color: '#333', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #E0E0E0', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  btnDanger: { backgroundColor: '#C62828', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  gpsHint: { margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#666', lineHeight: 1.45 },
  formScrollArea: { paddingBottom: '2rem' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  formLabel: { display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 },
  inputReadOnly: { backgroundColor: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed' },
  formError: { color: '#C62828', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: 0 },
  fieldHint: { color: '#666', fontSize: '0.8rem', marginTop: '0.5rem', lineHeight: 1.4 },
  credentialRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '0.65rem 0.75rem',
    backgroundColor: '#F5F5F7',
    borderRadius: '8px',
  },
  credentialLabel: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888' },
  credentialValue: { fontSize: '0.95rem', fontWeight: 600, wordBreak: 'break-all' },
  passwordRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },
  portalActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  assignEmpty: { color: '#666', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 },
};

export default Drivers;
