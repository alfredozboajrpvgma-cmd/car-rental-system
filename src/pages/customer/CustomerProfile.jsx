import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Phone, MapPin, Calendar, FileText, UploadCloud, Loader, ShieldCheck, Clock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  validateLicenseFile,
  licenseAcceptAttribute,
  getLicenseContentType,
} from '../../utils/licenseUpload';
import { uploadLicenseFile, getUploadErrorMessage } from '../../utils/licenseStorage';
import { getLicenseVerificationStatus } from '../../utils/userProfile';
import { validateCustomerContactFields } from '../../utils/customerContact';

const CustomerProfile = () => {
  const { currentUser, refreshUser } = useAuth();
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  const nameParts = (currentUser?.name || '').split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [licenseUrl, setLicenseUrl] = useState(currentUser?.licenseUrl || null);
  const [licenseName, setLicenseName] = useState(currentUser?.licenseName || 'license_front.jpg');

  useEffect(() => {
    if (currentUser) {
      const parts = (currentUser.name || '').split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setPhone(currentUser.phone || '');
      setAddress(currentUser.address || '');
      if (currentUser.licenseUrl) {
        setLicenseUrl(currentUser.licenseUrl);
        setLicenseName(currentUser.licenseName || 'license_document');
      }
    }
  }, [currentUser]);

  const handleInputChange = (setter, field) => (e) => {
    setter(e.target.value);
    setIsModified(true);
    if (field && fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    const validation = validateLicenseFile(file);
    if (!validation.ok) {
      setError(validation.message);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { url, fileName } = await uploadLicenseFile(file, currentUser.id);

      setLicenseUrl(url);
      setLicenseName(fileName);

      await updateDoc(doc(db, 'users', currentUser.id), {
        licenseUrl: url,
        licenseName: fileName,
        licenseContentType: getLicenseContentType(file),
        verified: false,
      });
      await refreshUser();
      setSuccessMsg('License uploaded. An admin will review and verify it before pickup.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(getUploadErrorMessage(err));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser?.id) return;

    const validation = validateCustomerContactFields({ firstName, lastName, phone, address });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError('Please complete all required contact fields.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccessMsg('');
    setFieldErrors({});
    try {
      await updateDoc(doc(db, 'users', currentUser.id), {
        name: `${firstName} ${lastName}`.trim(),
        phone,
        address,
      });
      setIsModified(false);
      await refreshUser();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update profile. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const licenseStatus = getLicenseVerificationStatus({
    licenseUrl,
    verified: currentUser?.verified,
  });

  const contactIncomplete = !validateCustomerContactFields({ firstName, lastName, phone, address }).valid;

  return (
    <div className="fade-in">
      <h1 style={styles.title}>My Profile</h1>
      <p style={styles.subtitle}>Manage your personal information and account settings.</p>

      <div style={styles.grid}>
        {/* Profile Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.profileAvatar}>{currentUser?.avatar || 'CU'}</div>
            <div>
              <h2 style={styles.profileName}>{currentUser?.name || 'Customer User'}</h2>
              <span style={styles.roleBadge}>{currentUser?.role || 'customer'}</span>
            </div>
          </div>

          <div style={styles.infoList}>
            <div style={styles.infoRow}>
              <Mail size={18} color="#888" />
              <span>{currentUser?.email || 'No email'}</span>
            </div>
            <div style={styles.infoRow}>
              <Phone size={18} color="#888" />
              <span>{phone || 'Not set'}</span>
            </div>
            <div style={styles.infoRow}>
              <MapPin size={18} color="#888" />
              <span>{address || 'Not set'}</span>
            </div>
            <div style={styles.infoRow}>
              <Calendar size={18} color="#888" />
              <span>
                Member since{' '}
                {currentUser?.createdAt
                  ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* License Card */}
        <div style={{ ...styles.card, justifyContent: 'center' }}>
          <h3 style={styles.cardTitle}>Driver's License</h3>
          <div style={styles.licenseStatus}>
            {licenseStatus === 'verified' && (
              <>
                <ShieldCheck size={20} color="#2E7D32" />
                <span style={{ color: '#2E7D32', fontWeight: 600, fontSize: '0.9rem' }}>Verified</span>
              </>
            )}
            {licenseStatus === 'pending' && (
              <>
                <Clock size={20} color="#F57F17" />
                <span style={{ color: '#F57F17', fontWeight: 600, fontSize: '0.9rem' }}>Pending review</span>
              </>
            )}
            {licenseStatus === 'missing' && (
              <>
                <UploadCloud size={20} color="#F57F17" />
                <span style={{ color: '#F57F17', fontWeight: 600, fontSize: '0.9rem' }}>Required</span>
              </>
            )}
          </div>
          {licenseStatus === 'pending' && (
            <p style={styles.pendingHint}>
              Your license is on file. Admin verification is required before pickup.
            </p>
          )}
          <div style={styles.licensePreview}>
            {isUploading ? (
              <Loader size={24} color="#0033FF" className="spin" />
            ) : (
              <>
                <FileText size={24} color="#0033FF" />
                <span style={{ color: '#333', fontSize: '0.85rem', fontWeight: 500 }}>
                  {licenseUrl ? licenseName : 'No document uploaded'}
                </span>
              </>
            )}
          </div>
          <p style={styles.uploadHint}>Accepted: PNG, JPG, PDF (max 5 MB)</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept={licenseAcceptAttribute}
          />
          <button type="button" style={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? 'Uploading...' : licenseUrl ? 'Re-upload License' : 'Upload License'}
          </button>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div style={{ ...styles.card, marginTop: '1.5rem', flex: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{...styles.cardTitle, marginBottom: 0}}>Edit Information</h3>
          {error && <span style={{ color: '#C62828', fontSize: '0.85rem', fontWeight: 500 }}>{error}</span>}
          {successMsg && <span style={{ color: '#2E7D32', fontSize: '0.85rem', fontWeight: 500 }}>{successMsg}</span>}
        </div>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={firstName}
              style={{ ...styles.input, ...(fieldErrors.firstName ? styles.inputError : {}) }}
              onChange={handleInputChange(setFirstName, 'firstName')}
              required
            />
            {fieldErrors.firstName && <span style={styles.fieldError}>{fieldErrors.firstName}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={lastName}
              style={{ ...styles.input, ...(fieldErrors.lastName ? styles.inputError : {}) }}
              onChange={handleInputChange(setLastName, 'lastName')}
              required
            />
            {fieldErrors.lastName && <span style={styles.fieldError}>{fieldErrors.lastName}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number <span style={styles.required}>*</span></label>
            <input
              type="tel"
              value={phone}
              style={{ ...styles.input, ...(fieldErrors.phone ? styles.inputError : {}) }}
              onChange={handleInputChange(setPhone, 'phone')}
              placeholder="+63 9XX XXX XXXX"
              required
            />
            {fieldErrors.phone && <span style={styles.fieldError}>{fieldErrors.phone}</span>}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email (read-only)</label>
            <input type="email" value={currentUser?.email || ''} style={{ ...styles.input, backgroundColor: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} readOnly />
          </div>
          <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Address <span style={styles.required}>*</span></label>
            <input
              type="text"
              value={address}
              style={{ ...styles.input, ...(fieldErrors.address ? styles.inputError : {}) }}
              onChange={handleInputChange(setAddress, 'address')}
              placeholder="City, province or full address"
              required
            />
            {fieldErrors.address && <span style={styles.fieldError}>{fieldErrors.address}</span>}
          </div>
        </div>
        <p style={styles.requiredNote}><span style={styles.required}>*</span> Required for booking a vehicle</p>
        <button 
          style={{ ...styles.saveBtn, ...((isModified || contactIncomplete) && !isSaving ? {} : styles.saveBtnDisabled) }}
          className={(isModified || contactIncomplete) && !isSaving ? 'btn-hover' : ''}
          disabled={(!isModified && !contactIncomplete) || isSaving}
          onClick={handleSaveChanges}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  title: { fontSize: '1.75rem', fontWeight: 600, color: '#111' },
  subtitle: { color: '#888', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: '2rem' },
  grid: { display: 'flex', gap: '1.5rem', alignItems: 'stretch' },
  card: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '2rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' },
  profileAvatar: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#0033FF', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, flexShrink: 0 },
  profileName: { fontSize: '1.25rem', fontWeight: 600, color: '#111' },
  roleBadge: { display: 'inline-block', marginTop: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: '#F0F4FF', color: '#0033FF', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' },
  infoList: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem', color: '#333' },
  cardTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#111', marginBottom: '1rem' },
  licenseStatus: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  licensePreview: { width: '100%', height: '100px', backgroundColor: '#F0F4FF', border: '1px solid #D6E4FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' },
  uploadHint: { fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' },
  pendingHint: { fontSize: '0.85rem', color: '#666', marginBottom: '1rem', lineHeight: 1.45 },
  uploadBtn: { backgroundColor: '#FFF', color: '#333', padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' },
  required: { color: '#C62828' },
  requiredNote: { fontSize: '0.8rem', color: '#888', marginBottom: '1rem' },
  fieldError: { fontSize: '0.75rem', color: '#C62828', marginTop: '0.15rem' },
  inputError: { border: '1px solid #C62828' },
  input: { padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E0E0E0', fontSize: '0.95rem', fontFamily: 'var(--font-primary)', outline: 'none', backgroundColor: '#FFF' },
  saveBtn: { backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 2rem', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease', alignSelf: 'flex-start' },
  saveBtnDisabled: { backgroundColor: '#E0E0E0', color: '#888', cursor: 'not-allowed' },
};

export default CustomerProfile;
