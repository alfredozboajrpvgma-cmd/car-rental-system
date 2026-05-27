import React, { useState } from 'react';
import { Mail, Phone, ShieldCheck, Activity, CalendarCheck, Users } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { getStaffTypeLabel } from '../../utils/roles';
import { portalBtn } from '../../utils/portalTheme';

const StaffProfile = ({ theme }) => {
  const { currentUser, refreshUser } = useAuth();
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    setPhone(currentUser?.phone || '');
  }, [currentUser?.phone]);

  const handleSave = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        phone: phone.trim(),
        updatedAt: new Date().toISOString(),
      });
      await refreshUser();
      setMessage('Profile updated.');
    } catch (err) {
      console.error(err);
      setError('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const accent = theme?.primaryHex || '#0033FF';

  return (
    <div className="fade-in">
      <h1 style={styles.title}>My Profile</h1>

      <div className="responsive-grid-2-equal" style={{ alignItems: 'start' }}>
        {/* Left Column: Profile & Details */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={{ ...styles.avatar, backgroundColor: accent }}>
              {currentUser?.avatar || 'ST'}
            </div>
            <div>
              <h2 style={styles.name}>{currentUser?.name}</h2>
              <div style={styles.idRow}>
                <span style={styles.id}>{getStaffTypeLabel(currentUser?.staffType)}</span>
              </div>
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
                  value={currentUser?.email || ''}
                  disabled
                  style={{ ...styles.input, ...styles.inputDisabled }}
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Staff Access</label>
              <div style={styles.inputWrapper}>
                <ShieldCheck size={18} color="#999" style={styles.inputIcon} />
                <input
                  type="text"
                  value="System Portal Granted"
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
                onClick={handleSave}
                disabled={saving || !phone.trim()}
                style={{
                  ...portalBtn.primary,
                  backgroundColor: accent,
                  borderColor: accent,
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Today's Overview</h3>
            <div style={styles.opRow}>
              <div style={{ ...styles.opIconBox, backgroundColor: `${accent}15` }}>
                <Activity size={18} color={accent} />
              </div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>Active Assigned Tickets</span>
                <span style={styles.opValue}>3 pending action</span>
              </div>
            </div>
            <div style={styles.opRow}>
              <div style={{ ...styles.opIconBox, backgroundColor: `${accent}15` }}>
                <CalendarCheck size={18} color={accent} />
              </div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>Pending Reservations</span>
                <span style={styles.opValue}>12 needing verification</span>
              </div>
            </div>
            <div style={styles.opRow}>
              <div style={{ ...styles.opIconBox, backgroundColor: `${accent}15` }}>
                <Users size={18} color={accent} />
              </div>
              <div style={styles.opDetails}>
                <span style={styles.opLabel}>Customer Interactions</span>
                <span style={styles.opValue}>8 resolved today</span>
              </div>
            </div>
            <p style={styles.hint}>
              These statistics are a snapshot of your daily performance. View the dashboard for detailed metrics.
            </p>
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
  id: { fontSize: '0.85rem', color: '#666' },
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
  success: { color: '#2E7D32', fontSize: '0.85rem', fontWeight: 500 },
  error: { color: '#C62828', fontSize: '0.85rem', fontWeight: 500 },
};

export default StaffProfile;
