import React, { useRef, useState } from 'react';
import { Plus, Search, MoreHorizontal, Filter, ChevronLeft, ChevronRight, Edit, RefreshCw, Car, UploadCloud, Loader, X, Trash2 } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../../components/Modal';
import ConfirmWarningModal from '../../components/ConfirmWarningModal';
import {
  validateVehicleImageFile,
  vehicleImageAcceptAttribute,
} from '../../utils/vehicleImageUpload';
import {
  deleteVehicleImage,
  getVehicleImageErrorMessage,
  uploadVehicleImage,
} from '../../utils/vehicleImageStorage';
import { RENTAL_MODE_OPTIONS, RENTAL_MODES, normalizeRentalMode, getRentalModeLabel } from '../../utils/rentalMode';
import {
  isVehicleStatusLockedByRental,
  resolveFleetVehicleStatus,
  FLEET_VEHICLE_STATUSES,
  isVehicleHeldByReservation,
} from '../../utils/bookings';
import { fetchVehicleReservationMap } from '../../utils/supabaseBookings';
import { syncAllLocationVehicleCounts } from '../../utils/locationVehicleCounts';

const emptyForm = {
  id: '',
  brand: '',
  model: '',
  name: '',
  type: 'Sedan',
  seats: 5,
  fuel: 'Gasoline',
  transmission: 'A/T',
  plate: '',
  status: 'Available',
  price: 1500,
  rating: 4.5,
  location: '',
  locationId: '',
  image: '',
  imagePath: '',
  rentalMode: RENTAL_MODES.SELF_DRIVE,
};

const RENTAL_LOCKED_HINT = 'Vehicle has an active reservation. Mark the booking returned in Reservations before editing.';

const FleetManagement = () => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [rentalModeFilter, setRentalModeFilter] = useState('All Rental Types');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [hubLocations, setHubLocations] = useState([]);
  const [reservedVehicleIds, setReservedVehicleIds] = useState(new Set());
  const imageInputRef = useRef(null);
  const pageSize = 10;

  const isVehicleRentalLocked = (vehicle) =>
    isVehicleStatusLockedByRental(vehicle, reservedVehicleIds);

  const canEditVehicle = (vehicle) => !isVehicleRentalLocked(vehicle);
  const canDeleteVehicle = canEditVehicle;
  const canChangeVehicleStatus = canEditVehicle;

  const resolveHubFromVehicle = (vehicle) => {
    if (vehicle.locationId) {
      const byId = hubLocations.find((h) => h.id === vehicle.locationId);
      if (byId) return byId;
    }
    if (vehicle.location) {
      return hubLocations.find((h) => h.name === vehicle.location) || null;
    }
    return null;
  };

  const resetImageState = (previewUrl = '') => {
    setImageFile(null);
    setImagePreview(previewUrl);
    setImageError('');
    setRemoveExistingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const fetchFleet = async () => {
    try {
      const [snapshot, reservationMap] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        fetchVehicleReservationMap().catch(() => ({ reserved: new Set(), pending: new Set() })),
      ]);
      const vehicles = [];
      snapshot.forEach((d) => {
        const data = d.data();
        vehicles.push({
          docId: d.id,
          ...data,
          rentalMode: normalizeRentalMode(
            data.rentalMode ?? (data.type === 'Van' ? RENTAL_MODES.WITH_DRIVER : RENTAL_MODES.SELF_DRIVE)
          ),
          status: resolveFleetVehicleStatus(d.id, data.status, reservationMap.reserved),
        });
      });
      setFleet(vehicles);
      setReservedVehicleIds(reservationMap.reserved);
    } catch (err) {
      console.error('Error fetching fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFleet();
  }, []);

  React.useEffect(() => {
    const loadHubs = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        const list = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.name && data.status === 'Active') {
            list.push({ id: d.id, name: data.name });
          }
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setHubLocations(list);
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };
    loadHubs();
  }, []);

  React.useEffect(() => {
    const close = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [activeDropdown]);

  const filtered = fleet
    .filter((c) => statusFilter === 'All Status' || c.status === statusFilter)
    .filter((c) => typeFilter === 'All Types' || c.type === typeFilter)
    .filter((c) => rentalModeFilter === 'All Rental Types' || normalizeRentalMode(c.rentalMode) === rentalModeFilter)
    .filter((c) =>
      `${c.brand} ${c.model} ${c.plate} ${c.id}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const openAdd = () => {
    const defaultHub = hubLocations[0];
    setEditing(null);
    setForm({
      ...emptyForm,
      id: `PH-${Date.now().toString().slice(-4)}`,
      location: defaultHub?.name || '',
      locationId: defaultHub?.id || '',
    });
    resetImageState();
    setShowModal(true);
  };

  const openEdit = (car) => {
    if (!canEditVehicle(car)) return;
    const hub = resolveHubFromVehicle(car);
    setEditing(car);
    setForm({
      id: car.id || car.docId,
      brand: car.brand || '',
      model: car.model || '',
      name: car.name || `${car.brand} ${car.model}`,
      type: car.type || 'Sedan',
      seats: car.seats || 5,
      fuel: car.fuel || 'Gasoline',
      transmission: car.transmission || 'A/T',
      plate: car.plate || '',
      status: car.status || 'Available',
      price: car.price || 1500,
      rating: car.rating || 4.5,
      location: hub?.name || car.location || '',
      locationId: car.locationId || hub?.id || '',
      image: car.image || '',
      imagePath: car.imagePath || '',
      rentalMode: normalizeRentalMode(car.rentalMode),
    });
    resetImageState(car.image || '');
    setShowModal(true);
    setActiveDropdown(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVehicleImageFile(file);
    if (!validation.ok) {
      setImageError(validation.message);
      e.target.value = '';
      return;
    }

    setImageError('');
    setImageFile(file);
    setRemoveExistingImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setImageFile(null);
    setImagePreview('');
    setRemoveExistingImage(true);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (editing && !canEditVehicle(editing)) {
      alert(RENTAL_LOCKED_HINT);
      return;
    }
    if (!form.brand?.trim() || !form.model?.trim() || !form.plate?.trim()) {
      alert('Brand, model, and plate are required.');
      return;
    }

    const selectedHub = hubLocations.find(
      (h) => h.id === form.locationId || h.name === form.location
    );
    if (!selectedHub) {
      alert('Select a hub from Locations. Add an active hub under Locations if none are listed.');
      return;
    }

    const docId = editing ? editing.docId : form.id;
    if (!docId?.trim()) {
      alert('Vehicle ID is required.');
      return;
    }

    setSaving(true);
    setImageError('');

    try {
      let imageUrl = removeExistingImage ? '' : form.image;
      let imagePath = removeExistingImage ? '' : form.imagePath;

      if (imageFile) {
        const uploaded = await uploadVehicleImage(imageFile, docId);
        if (form.imagePath && form.imagePath !== uploaded.path) {
          await deleteVehicleImage(form.imagePath);
        }
        imageUrl = uploaded.url;
        imagePath = uploaded.path;
      } else if (removeExistingImage && form.imagePath) {
        await deleteVehicleImage(form.imagePath);
      }

      const payload = {
        ...form,
        id: docId,
        name: form.name || `${form.brand} ${form.model}`.trim(),
        rentalMode: normalizeRentalMode(form.rentalMode),
        seats: Number(form.seats),
        price: Number(form.price),
        rating: Number(form.rating),
        image: imageUrl,
        imagePath,
        status: form.status,
        location: selectedHub.name,
        locationId: selectedHub.id,
      };

      await setDoc(doc(db, 'vehicles', docId), payload, { merge: true });
      await syncAllLocationVehicleCounts().catch((err) => {
        console.warn('Could not sync hub vehicle counts:', err);
      });
      setShowModal(false);
      resetImageState();
      await fetchFleet();
    } catch (err) {
      console.error(err);
      if (imageFile) {
        setImageError(getVehicleImageErrorMessage(err));
      } else {
        alert('Could not save vehicle. Check Firestore permissions.');
      }
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (vehicle) => {
    if (!canChangeVehicleStatus(vehicle)) return;
    const statuses = FLEET_VEHICLE_STATUSES;
    const current = statuses.includes(vehicle.status) ? vehicle.status : 'Available';
    const nextStatus = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    await updateDoc(doc(db, 'vehicles', vehicle.docId), { status: nextStatus });
    fetchFleet();
    setActiveDropdown(null);
  };

  const openDeleteModal = (vehicle) => {
    if (!canDeleteVehicle(vehicle)) return;
    setDeleteTarget(vehicle);
    setActiveDropdown(null);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDeleteVehicle = async () => {
    if (!deleteTarget || !canDeleteVehicle(deleteTarget)) return;

    setDeleting(true);
    try {
      if (deleteTarget.imagePath) {
        await deleteVehicleImage(deleteTarget.imagePath);
      }
      await deleteDoc(doc(db, 'vehicles', deleteTarget.docId));
      await syncAllLocationVehicleCounts().catch((err) => {
        console.warn('Could not sync hub vehicle counts:', err);
      });
      setDeleteTarget(null);
      await fetchFleet();
    } catch (err) {
      console.error(err);
      alert('Could not delete vehicle. Check Firestore permissions.');
    } finally {
      setDeleting(false);
    }
  };

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleHubChange = (e) => {
    const hub = hubLocations.find((h) => h.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      locationId: hub?.id || '',
      location: hub?.name || '',
    }));
  };

  return (
    <div className="page-enter">
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Fleet Management</h1>
          <p style={styles.pageSubtitle}>{filtered.length} vehicles in fleet</p>
        </div>
        <button type="button" style={styles.addBtn} className="btn-hover" onClick={openAdd}>
          <Plus size={18} /> <span>Add Vehicle</span>
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBar}>
          <Search size={18} color="#888" />
          <input
            type="text"
            placeholder="Search vehicles..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          />
        </div>
        <div style={styles.filterGroup}>
          <div style={styles.filterSelect}>
            <Filter size={14} color="#888" />
            <select style={styles.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option>All Status</option>
              <option>Available</option>
              <option>Maintenance</option>
            </select>
          </div>
          <div style={styles.filterSelect}>
            <select style={styles.select} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}>
              <option>All Types</option>
              <option>Sedan</option>
              <option>SUV</option>
              <option>MPV</option>
              <option>Van</option>
            </select>
          </div>
          <div style={styles.filterSelect}>
            <select style={styles.select} value={rentalModeFilter} onChange={(e) => { setRentalModeFilter(e.target.value); setPage(0); }}>
              <option>All Rental Types</option>
              <option value={RENTAL_MODES.SELF_DRIVE}>Self Drive</option>
              <option value={RENTAL_MODES.WITH_DRIVER}>With Driver</option>
            </select>
          </div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '72px' }}></th>
                <th>Vehicle</th>
                <th>Type & Hub</th>
                <th>Rental Type</th>
                <th>Plate No.</th>
                <th style={{ textAlign: 'right' }}>Daily Rate</th>
                <th>Status</th>
                <th style={{ width: '48px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="8" style={styles.emptyCell}>Loading fleet...</td>
                </tr>
              )}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan="8" style={styles.emptyCell}>
                    <Car size={40} color="#CCC" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ fontWeight: 600, color: '#111' }}>No vehicles found</div>
                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      {fleet.length === 0 ? 'Seed data from Settings or add your first vehicle.' : 'Try different filters.'}
                    </div>
                    {fleet.length === 0 && (
                      <button type="button" style={{ ...styles.addBtn, marginTop: '1rem' }} onClick={openAdd}>
                        <Plus size={16} /> Add Vehicle
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {!loading && paged.map((car) => (
                <tr key={car.docId}>
                  <td>
                    {car.image ? (
                      <img src={car.image} alt="" style={styles.thumbnail} />
                    ) : (
                      <div style={styles.thumbnailPlaceholder}><Car size={20} color="#AAA" /></div>
                    )}
                  </td>
                  <td>
                    <div style={styles.carName}>{car.brand} {car.model}</div>
                    <div style={styles.idCell}>{car.id}</div>
                  </td>
                  <td>
                    <div style={styles.carType}>{car.type}</div>
                    <div style={styles.hubLocation}>{car.location}</div>
                  </td>
                  <td>
                    <span style={styles.rentalTypeBadge}>{getRentalModeLabel(car.rentalMode)}</span>
                  </td>
                  <td style={styles.monoCell}>{car.plate}</td>
                  <td style={{ ...styles.monoCell, textAlign: 'right', fontWeight: 600 }}>
                    ₱{car.price?.toLocaleString()}
                  </td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      ...(car.status === 'Maintenance' ? styles.badgeDanger : styles.badgeSuccess),
                    }}>
                      {car.status}
                      {isVehicleHeldByReservation(car.docId, reservedVehicleIds) && (
                        <span style={styles.reservedTag}> · On reservation</span>
                      )}
                    </span>
                  </td>
                  <td style={styles.actionCell}>
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        style={styles.iconBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown((prev) => (prev === car.docId ? null : car.docId));
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {activeDropdown === car.docId && (
                        <div style={styles.dropdownMenu} className="fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            style={{
                              ...styles.dropdownItem,
                              ...(!canEditVehicle(car) ? styles.dropdownItemDisabled : {}),
                            }}
                            disabled={!canEditVehicle(car)}
                            title={canEditVehicle(car) ? 'Edit vehicle details' : RENTAL_LOCKED_HINT}
                            onClick={() => openEdit(car)}
                          >
                            <Edit size={14} /> Edit Details
                          </button>
                          <button
                            type="button"
                            style={{
                              ...styles.dropdownItem,
                              ...(!canChangeVehicleStatus(car) ? styles.dropdownItemDisabled : {}),
                            }}
                            disabled={!canChangeVehicleStatus(car)}
                            title={
                              canChangeVehicleStatus(car)
                                ? 'Cycle vehicle status'
                                : RENTAL_LOCKED_HINT
                            }
                            onClick={() => cycleStatus(car)}
                          >
                            <RefreshCw size={14} /> Change Status
                          </button>
                          <button
                            type="button"
                            style={{
                              ...styles.dropdownItem,
                              ...(canDeleteVehicle(car) ? { color: '#C62828' } : styles.dropdownItemDisabled),
                            }}
                            disabled={!canDeleteVehicle(car)}
                            title={canDeleteVehicle(car) ? 'Delete vehicle' : RENTAL_LOCKED_HINT}
                            onClick={() => openDeleteModal(car)}
                          >
                            <Trash2 size={14} /> Delete Vehicle
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={styles.pagination}>
            <div style={styles.pageInfo}>
              Showing <strong>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)}</strong> of{' '}
              <strong>{filtered.length}</strong> vehicles
            </div>
            <div style={styles.pageControls}>
              <button type="button" style={styles.pageBtn} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button type="button" style={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editing ? 'Edit Vehicle' : 'Add Vehicle'}
        footer={
          <>
            <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              style={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || hubLocations.length === 0}
            >
              {saving ? 'Saving...' : 'Save Vehicle'}
            </button>
          </>
        }
      >
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Vehicle ID
            <input style={styles.input} value={form.id} disabled={!!editing} onChange={setField('id')} />
          </label>
          <label style={styles.label}>
            Plate Number
            <input style={styles.input} value={form.plate} onChange={setField('plate')} placeholder="ABC 1234" />
          </label>
          <label style={styles.label}>
            Brand
            <input style={styles.input} value={form.brand} onChange={setField('brand')} placeholder="Toyota" />
          </label>
          <label style={styles.label}>
            Model
            <input style={styles.input} value={form.model} onChange={setField('model')} placeholder="Vios 1.5 G" />
          </label>
          <label style={styles.label}>
            Type
            <select style={styles.input} value={form.type} onChange={setField('type')}>
              <option>Sedan</option>
              <option>SUV</option>
              <option>MPV</option>
              <option>Van</option>
            </select>
          </label>
          <label style={styles.label}>
            Hub Location
            {hubLocations.length === 0 ? (
              <>
                <p style={styles.hint}>No active hubs found. Add locations under Admin → Locations first.</p>
              </>
            ) : (
              <select
                className="location-field location-field-select"
                style={styles.input}
                value={form.locationId || ''}
                onChange={handleHubChange}
                required
              >
                <option value="">Select a hub...</option>
                {hubLocations.map((hub) => (
                  <option key={hub.id} value={hub.id}>{hub.name}</option>
                ))}
              </select>
            )}
          </label>
          <label style={styles.label}>
            Fuel
            <select style={styles.input} value={form.fuel} onChange={setField('fuel')}>
              <option>Gasoline</option>
              <option>Diesel</option>
            </select>
          </label>
          <label style={styles.label}>
            Transmission
            <select style={styles.input} value={form.transmission} onChange={setField('transmission')}>
              <option>A/T</option>
              <option>M/T</option>
            </select>
          </label>
          <label style={styles.label}>
            Seats
            <input type="number" min="2" style={styles.input} value={form.seats} onChange={setField('seats')} />
          </label>
          <label style={styles.label}>
            Daily Rate (₱)
            <input type="number" min="0" style={styles.input} value={form.price} onChange={setField('price')} />
          </label>
          <label style={styles.label}>
            Rating
            <input type="number" min="0" max="5" step="0.1" style={styles.input} value={form.rating} onChange={setField('rating')} />
          </label>
          <label style={styles.label}>
            Rental Type
            <select style={styles.input} value={form.rentalMode} onChange={setField('rentalMode')}>
              {RENTAL_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Status
            <select style={styles.input} value={form.status} onChange={setField('status')}>
              <option>Available</option>
              <option>Maintenance</option>
            </select>
          </label>
          <div style={{ ...styles.label, gridColumn: '1 / -1' }}>
            <span>Vehicle photo</span>
            <div style={styles.imageUploadBox}>
              {imagePreview ? (
                <div style={styles.imagePreviewWrap}>
                  <img src={imagePreview} alt="Vehicle preview" style={styles.imagePreview} />
                  <button
                    type="button"
                    style={styles.imageRemoveBtn}
                    onClick={clearSelectedImage}
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={styles.imagePlaceholder}>
                  <Car size={32} color="#AAA" />
                  <span>No photo uploaded</span>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept={vehicleImageAcceptAttribute}
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                style={styles.imageUploadBtn}
                onClick={() => imageInputRef.current?.click()}
                disabled={saving}
              >
                {saving && imageFile ? <Loader size={16} className="spin" /> : <UploadCloud size={16} />}
                {imagePreview ? 'Replace photo' : 'Upload photo'}
              </button>
              <span style={styles.hint}>PNG, JPG, or WebP · max 5 MB · stored in Supabase</span>
              {imageError && <span style={styles.imageError}>{imageError}</span>}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmWarningModal
        open={Boolean(deleteTarget)}
        title="Delete this vehicle?"
        message={
          deleteTarget
            ? `Remove ${deleteTarget.brand} ${deleteTarget.model} (${deleteTarget.plate}) from the fleet permanently.`
            : ''
        }
        consequences={[
          ...(deleteTarget?.status === 'Maintenance'
            ? ['This vehicle is currently in Maintenance.']
            : []),
          'The vehicle photo will be removed from storage.',
          'This action cannot be undone.',
        ]}
        cancelLabel="Keep Vehicle"
        confirmLabel="Yes, Delete Vehicle"
        confirmingLabel="Deleting..."
        onCancel={closeDeleteModal}
        onConfirm={confirmDeleteVehicle}
        confirming={deleting}
      />
    </div>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  pageTitle: { fontSize: '1.75rem', fontWeight: 600, color: '#111', margin: 0 },
  pageSubtitle: { color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' },
  toolbar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: '#FFFFFF',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    flex: '1',
    minWidth: '220px',
    maxWidth: '360px',
  },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--font-primary)', width: '100%' },
  filterGroup: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  filterSelect: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#FFFFFF',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  select: { border: 'none', outline: 'none', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', color: '#333', backgroundColor: 'transparent', cursor: 'pointer' },
  addBtn: {
    backgroundColor: '#111',
    color: '#FFF',
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  tableScroll: { overflowX: 'auto', width: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '720px' },
  emptyCell: { textAlign: 'center', padding: '3rem 2rem', color: '#888' },
  thumbnail: { width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E0E0E0' },
  thumbnailPlaceholder: {
    width: '56px',
    height: '56px',
    borderRadius: '8px',
    backgroundColor: '#F5F5F7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCell: { fontFamily: 'monospace', color: '#888', fontSize: '0.75rem', marginTop: '0.2rem' },
  carName: { fontWeight: 600, fontSize: '1rem' },
  carType: { fontSize: '0.85rem', fontWeight: 500, color: '#333' },
  hubLocation: { fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' },
  monoCell: { fontFamily: 'monospace', fontSize: '0.9rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  reservedTag: { fontSize: '0.72em', fontWeight: 600, color: '#1565C0' },
  badgeWarning: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  badgeDanger: { backgroundColor: '#FFEBEE', color: '#C62828' },
  rentalTypeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  actionCell: { textAlign: 'right', paddingRight: '0.5rem' },
  iconBtn: { color: '#888', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: '0.25rem',
    backgroundColor: '#FFF',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: '#333',
    cursor: 'pointer',
  },
  dropdownItemDisabled: { color: '#AAA', cursor: 'not-allowed', opacity: 0.65 },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  pageInfo: { fontSize: '0.85rem', color: '#666' },
  pageControls: { display: 'flex', gap: '0.5rem' },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: '#FFF',
    fontSize: '0.85rem',
    cursor: 'pointer',
    color: '#333',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: '#555' },
  input: { padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #E0E0E0', fontFamily: 'var(--font-primary)', fontSize: '0.95rem', width: '100%' },
  hint: { fontSize: '0.75rem', color: '#888', fontWeight: 400 },
  imageUploadBox: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' },
  imagePreviewWrap: { position: 'relative', width: '100%', maxWidth: '280px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E0E0E0' },
  imagePreview: { width: '100%', height: '160px', objectFit: 'cover', display: 'block' },
  imageRemoveBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0,0,0,0.55)',
    color: '#FFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    maxWidth: '280px',
    height: '160px',
    borderRadius: '10px',
    border: '1px dashed #D1D5DB',
    background: '#F9FAFB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: '#888',
    fontSize: '0.85rem',
  },
  imageUploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    alignSelf: 'flex-start',
    padding: '0.55rem 1rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    background: '#FFF',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#333',
  },
  imageError: { fontSize: '0.8rem', color: '#C62828', fontWeight: 500 },
  cancelBtn: { padding: '0.7rem 1.25rem', borderRadius: '8px', border: '1px solid #E0E0E0', background: '#FFF', cursor: 'pointer', fontWeight: 600 },
  saveBtn: { padding: '0.7rem 1.25rem', borderRadius: '8px', border: 'none', background: '#111', color: '#FFF', fontWeight: 600, cursor: 'pointer' },
};

export default FleetManagement;
