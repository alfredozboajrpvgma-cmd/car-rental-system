import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Car, Plus, Pencil } from 'lucide-react';
import Modal from '../../components/Modal';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { seedLocations } from '../../utils/seedData';
import { loadLocationsWithVehicleCounts } from '../../utils/locationVehicleCounts';

const LOCATION_TYPES = ['Primary Hub', 'Airport Kiosk', 'Maintenance & Hub', 'Satellite Hub'];
const LOCATION_STATUSES = ['Active', 'Inactive', 'Maintenance'];

const emptyLoc = {
  id: '',
  name: '',
  type: 'Primary Hub',
  address: '',
  phone: '',
  email: '',
  hours: '24/7 Open',
  vehicleCount: 0,
  capacity: 10,
  status: 'Active',
};

const FieldLabel = ({ text, required = false }) => (
  <span style={labelRowStyle}>
    <span>{text}</span>
    {required && (
      <span style={requiredMarkStyle} aria-hidden="true">*</span>
    )}
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
  lineHeight: 1.2,
};

const requiredMarkStyle = { color: '#C62828', flexShrink: 0 };

const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyLoc);
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const { locations: list } = await loadLocationsWithVehicleCounts();
      setLocations(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setForm({ ...emptyLoc, id: `LOC-${Date.now().toString().slice(-4)}` });
    setIsEditing(false);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (loc) => {
    setForm({
      id: loc.id || '',
      name: loc.name || '',
      type: loc.type || 'Primary Hub',
      address: loc.address || '',
      phone: loc.phone || '',
      email: loc.email || '',
      hours: loc.hours || '24/7 Open',
      vehicleCount: loc.vehicleCount ?? 0,
      capacity: loc.capacity ?? 10,
      status: loc.status || 'Active',
    });
    setIsEditing(true);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyLoc);
    setIsEditing(false);
    setFormError('');
  };

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNumberField = (key) => (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setForm((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const parsed = parseInt(raw, 10);
    setForm((prev) => ({ ...prev, [key]: Number.isNaN(parsed) ? prev[key] : parsed }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const address = form.address.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!form.id.trim()) {
      setFormError('Location ID is required.');
      return;
    }
    if (!name) {
      setFormError('Location name is required.');
      return;
    }
    if (!address) {
      setFormError('Address is required.');
      return;
    }
    if (!phone) {
      setFormError('Phone number is required.');
      return;
    }
    if (!email) {
      setFormError('Email is required.');
      return;
    }
    if (!form.hours.trim()) {
      setFormError('Operating hours are required.');
      return;
    }

    const capacity = Number(form.capacity);

    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError('Capacity must be at least 1.');
      return;
    }

    const id = form.id.trim();
    const payload = {
      id,
      name,
      type: form.type,
      address,
      phone,
      email,
      hours: form.hours.trim(),
      vehicleCount: isEditing ? Number(form.vehicleCount) || 0 : 0,
      capacity,
      status: form.status,
    };

    try {
      await setDoc(doc(db, 'locations', id), payload, { merge: true });
      closeModal();
      load();
    } catch (err) {
      console.error(err);
      setFormError('Could not save location. Please try again.');
    }
  };

  const seedDefaults = async () => {
    await seedLocations();
    load();
  };

  return (
    <div className="page-enter">
      <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Locations & Hubs</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {locations.length === 0 && (
            <button type="button" style={styles.secondaryBtn} onClick={seedDefaults}>Seed defaults</button>
          )}
          <button type="button" style={styles.addBtn} className="btn-hover" onClick={openAddModal}>
            <Plus size={18} /> <span>Add New Location</span>
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {locations.map((loc) => (
          <div key={loc.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.locName}>{loc.name}</h3>
                <span style={styles.locType}>{loc.type}</span>
                <div style={styles.locId}>{loc.id}</div>
              </div>
              <div style={styles.cardHeaderActions}>
                <span style={{ ...styles.badge, ...(loc.status === 'Active' ? styles.badgeSuccess : styles.badgeWarning) }}>
                  {loc.status}
                </span>
                <button type="button" style={styles.editBtn} onClick={() => openEditModal(loc)} aria-label="Edit location">
                  <Pencil size={16} />
                </button>
              </div>
            </div>
            <div style={styles.infoSection}>
              <div style={styles.infoRow}><MapPin size={16} color="#888" /> <span style={styles.infoText}>{loc.address}</span></div>
              <div style={styles.infoRow}><Phone size={16} color="#888" /> <span style={styles.infoText}>{loc.phone}</span></div>
              <div style={styles.infoRow}><Mail size={16} color="#888" /> <span style={styles.infoText}>{loc.email}</span></div>
              <div style={styles.infoRow}><Clock size={16} color="#888" /> <span style={styles.infoText}>{loc.hours}</span></div>
            </div>
            <div style={styles.metricsSection}>
              <div style={styles.metricItem}>
                <Car size={18} color="#0033FF" />
                <div>
                  <div style={styles.metricValue}>{loc.vehicleCount || 0} / {loc.capacity}</div>
                  <div style={styles.metricLabel}>Vehicles On-Site</div>
                </div>
              </div>
              <div style={styles.progressContainer}>
                <div style={{
                  ...styles.progressBar,
                  width: `${loc.capacity ? ((loc.vehicleCount || 0) / loc.capacity) * 100 : 0}%`,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showModal}
        onClose={closeModal}
        title={isEditing ? 'Edit Location' : 'Add Location'}
        footer={
          <>
            <button type="button" style={styles.secondaryBtn} onClick={closeModal}>Cancel</button>
            <button type="button" style={styles.addBtn} onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Save Location'}
            </button>
          </>
        }
      >
        <div style={styles.formScrollArea}>
          <div style={styles.formGrid}>
          <label style={styles.label}>
            <FieldLabel text="Location ID" required />
            <input
              className="location-field"
              style={isEditing ? styles.inputReadOnly : undefined}
              value={form.id}
              onChange={setField('id')}
              placeholder="LOC-6117"
              readOnly={isEditing}
              disabled={isEditing}
            />
            {isEditing && (
              <span style={styles.fieldHint}>System ID — cannot be changed after creation.</span>
            )}
          </label>

          <label style={styles.label}>
            <FieldLabel text="Location Name" required />
            <input
              className="location-field"
              value={form.name}
              onChange={setField('name')}
              placeholder="Main Hub - Makati"
            />
          </label>

          <label style={styles.label}>
            <FieldLabel text="Hub Type" required />
            <select className="location-field location-field-select" value={form.type} onChange={setField('type')}>
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            <FieldLabel text="Status" required />
            <select className="location-field location-field-select" value={form.status} onChange={setField('status')}>
              {LOCATION_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label style={{ ...styles.label, gridColumn: '1 / -1' }}>
            <FieldLabel text="Address" required />
            <input
              className="location-field"
              value={form.address}
              onChange={setField('address')}
              placeholder="123 Ayala Avenue, Makati City"
            />
          </label>

          <label style={styles.label}>
            <FieldLabel text="Phone" required />
            <input
              type="tel"
              className="location-field"
              value={form.phone}
              onChange={setField('phone')}
              placeholder="09XX XXX XXXX"
            />
          </label>

          <label style={styles.label}>
            <FieldLabel text="Email" required />
            <input
              type="email"
              className="location-field"
              value={form.email}
              onChange={setField('email')}
              placeholder="hub@driveph.com"
            />
          </label>

          <label style={{ ...styles.label, gridColumn: '1 / -1' }}>
            <FieldLabel text="Operating Hours" required />
            <input
              className="location-field"
              value={form.hours}
              onChange={setField('hours')}
              placeholder="24/7 Open"
            />
          </label>

          <label style={styles.label}>
            <FieldLabel text="Vehicles On-Site" />
            <input
              type="number"
              min="0"
              className="location-field"
              style={styles.inputReadOnly}
              value={form.vehicleCount}
              readOnly
              disabled
            />
            <span style={styles.fieldHint}>
              Updated automatically when vehicles are assigned to this hub in Fleet.
            </span>
          </label>

          <label style={styles.label}>
            <FieldLabel text="Capacity" required />
            <input
              type="number"
              min="1"
              className="location-field"
              value={form.capacity}
              onChange={setNumberField('capacity')}
            />
          </label>
          </div>

          {formError && <p style={styles.formError}>{formError}</p>}
        </div>
      </Modal>
    </div>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  addBtn: { backgroundColor: 'var(--text-color)', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, border: 'none', cursor: 'pointer' },
  secondaryBtn: { padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #E0E0E0', background: '#FFF', cursor: 'pointer', fontWeight: 500 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' },
  card: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  cardHeader: { padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' },
  cardHeaderActions: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 },
  editBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E0E0E0', background: '#FFF', color: '#555', cursor: 'pointer' },
  locName: { fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' },
  locType: { fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' },
  locId: { fontSize: '0.75rem', color: '#AAA', fontFamily: 'monospace', marginTop: '0.35rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarning: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  infoSection: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--border-color)' },
  infoRow: { display: 'flex', alignItems: 'flex-start', gap: '0.75rem' },
  infoText: { fontSize: '0.9rem', color: '#444', lineHeight: 1.4 },
  metricsSection: { padding: '1.5rem', backgroundColor: '#FAFAFA' },
  metricItem: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  metricValue: { fontSize: '1.1rem', fontWeight: 600, fontFamily: 'monospace' },
  metricLabel: { fontSize: '0.8rem', color: '#666' },
  progressContainer: { height: '6px', width: '100%', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#0033FF', transition: 'width 0.3s ease' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  formScrollArea: { paddingBottom: '2rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: 0 },
  fieldHint: { fontSize: '0.75rem', color: '#888', lineHeight: 1.35, marginTop: '0.1rem' },
  inputReadOnly: { backgroundColor: '#F3F4F6', color: '#6B7280', cursor: 'not-allowed' },
  formError: { color: '#C62828', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 },
};

export default Locations;
