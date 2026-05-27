import React, { useState } from 'react';
import { Mail, Phone, MapPin, FileText, ShieldCheck, ShieldAlert, Star, Clock, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDriverProfile } from '../../hooks/useDriverProfile';
import { PORTAL, portalBtn } from '../../utils/portalTheme';
import { saveDriverRecord } from '../../utils/driverTrips';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DriverProfile = () => {
  const { currentUser, refreshUser } = useAuth();
  const driverId = currentUser?.driverId;
  const { driver, loading } = useDriverProfile(driverId);

  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (driver?.phone) setPhone(driver.phone);
    else if (currentUser?.phone) setPhone(currentUser.phone);
  }, [driver?.phone, currentUser?.phone]);

  const handleSavePhone = async () => {
    if (!driver?.id) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveDriverRecord({ ...driver, phone: phone.trim() });
      if (currentUser?.id) {
        await updateDoc(doc(db, 'users', currentUser.id), { phone: phone.trim() });
        await refreshUser();
      }
      setMessage('Contact details updated.');
    } catch (err) {
      console.error(err);
      setError('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (!driverId) {
    return (
      <div style={styles.alert}>
        <ShieldAlert size={24} color="#F57F17" />
        <p>Your account is not linked to a chauffeur record. Contact dispatch to set your driverId.</p>
      </div>
    );
  }

  if (loading) {
    return <p style={{ color: '#888' }}>Loading profile…</p>;
  }

  if (!driver) {
    return (
      <div style={styles.alert}>
        <p>
          No driver record found for
          {' '}
          <strong>{driverId}</strong>
          . Ask an admin to create it under Admin → Drivers.
        </p>
      </div>
    );
  }

  const licenseDisplay = driver.licenseNo && driver.licenseNo !== 'Pending'
    ? driver.licenseNo
    : 'Pending verification';

  const hasRating = driver.rating > 0;

  return (
    <div className="page-enter">
      <h1 style={styles.title}>My Profile</h1>

      <div className="responsive-grid-2-equal" style={{ alignItems: 'start' }}>
        {/* Left Column: Profile & Details */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.avatar}>{driver.avatar || 'DR'}</div>
            <div>
              <h2 style={styles.name}>{driver.name}</h2>
              <div style={styles.idRow}>
                <span style={styles.id}>{driver.id}</span>
                {driver.verified ? (
                  <span style={styles.verified}>
                    <ShieldCheck size={14} />
                    Verified
                  </span>
                ) : (
                  <span style={styles.unverified}>
                    <ShieldAlert size={14} />
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.stats}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{driver.completedTrips ?? 0}</div>
              <div style={styles.statLabel}>Completed trips</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>
                <Star 
                  size={18} 
                  color={hasRating ? "#F57F17" : "#B0BEC5"} 
                  fill={hasRating ? "#F57F17" : "transparent"}
                  style={{ verticalAlign: 'middle', marginRight: '4px', marginBottom: '3px' }} 
                />
                {hasRating ? driver.rating : 'N/A'}
              </div>
              <div style={styles.statLabel}>Rating</div>
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Contact Details</h3>
            
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="#999" style={styles.inputIcon} />
                <input
                  type="text"
                  value={driver.email || currentUser?.email || ''}
                  disabled
                  style={{ ...styles.input, ...styles.inputDisabled }}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Phone Number</label>
              <div style={styles.inputWrapper}>
                <Phone size={18} color="#999" style={styles.inputIcon} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
            </div>

            <div style={styles.formActions}>
              {message && <span style={styles.success}>{message}</span>}
              {error && <span style={styles.error}>{error}</span>}
              <button
                type="button"
                style={styles.saveBtn}
                onClick={handleSavePhone}
                disabled={saving || !phone.trim()}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Operations & Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Operational Status</h3>
            <div style={styles.opRow}>
              <div style={styles.opIconBox}><MapPin size={18} color={PORTAL.primaryHex} /></div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>Base Hub</span>
                <span style={styles.opValue}>{driver.location || 'Not assigned'}</span>
              </div>
            </div>
            <div style={styles.opRow}>
              <div style={styles.opIconBox}><FileText size={18} color={PORTAL.primaryHex} /></div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>License Status</span>
                <span style={styles.opValue}>{licenseDisplay}</span>
              </div>
            </div>
            <div style={styles.opRow}>
              <div style={styles.opIconBox}><Activity size={18} color={PORTAL.primaryHex} /></div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>Current Status</span>
                <span style={styles.opValue}>{driver.status}</span>
              </div>
            </div>
            <p style={styles.hint}>
              License verification and hub assignment are managed by dispatch in the admin portal.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Recent Activity</h3>
            <div style={styles.emptyActivity}>
              <Clock size={32} color="#E0E0E0" style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>No recent trips logged today.</p>
              <p style={{ margin: 0, color: '#aaa', fontSize: '0.8rem' }}>You're all caught up!</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  title: { margin: '0 0 1.5rem', fontSize: '1.75rem', fontWeight: 700 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #E8E8E8',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: PORTAL.primaryHex,
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  name: { margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 },
  idRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  id: { fontSize: '0.85rem', color: '#666', fontFamily: 'monospace' },
  verified: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: '#2E7D32',
    backgroundColor: '#E8F5E9',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  unverified: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    color: '#F57F17',
    backgroundColor: '#FFF8E1',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  stats: { display: 'flex', gap: '1rem', marginBottom: '1.5rem' },
  statBox: {
    flex: 1,
    padding: '1.25rem 1rem',
    backgroundColor: '#FFF',
    borderRadius: '10px',
    border: '1px solid #F0F0F0',
    textAlign: 'center',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
  },
  statValue: { fontSize: '1.5rem', fontWeight: 800, color: '#111' },
  statLabel: { fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 },
  divider: { height: '1px', backgroundColor: '#F0F0F0', margin: '1.5rem 0' },
  section: { marginBottom: '0.5rem' },
  sectionTitle: { margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700, color: '#111' },
  fieldGroup: {
    marginBottom: '1.25rem',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#555',
    marginBottom: '0.4rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.7rem 1rem 0.7rem 2.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    borderColor: '#E5E7EB',
    cursor: 'not-allowed',
  },
  formActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  saveBtn: {
    ...portalBtn.primary,
    padding: '0.65rem 1.25rem',
    cursor: 'pointer',
    borderRadius: '8px',
    fontWeight: 600,
  },
  opRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.25rem',
  },
  opIconBox: {
    width: 40,
    height: 40,
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 51, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  opDetails: {
    display: 'flex',
    flexDirection: 'column',
  },
  opLabel: {
    fontSize: '0.75rem',
    color: '#888',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  opValue: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#111',
  },
  hint: { fontSize: '0.8rem', color: '#888', margin: '1rem 0 0', lineHeight: 1.5, padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '8px' },
  emptyActivity: {
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: '8px',
    border: '1px dashed #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  success: { color: PORTAL.success, fontSize: '0.85rem', fontWeight: 500 },
  error: { color: '#C62828', fontSize: '0.85rem', fontWeight: 500 },
  alert: {
    padding: '1.5rem',
    backgroundColor: '#FFF8E1',
    borderRadius: '12px',
    maxWidth: 480,
  },
};

export default DriverProfile;
