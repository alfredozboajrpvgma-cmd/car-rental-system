import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader, MapPin, PhoneCall } from 'lucide-react';
import Modal from './Modal';
import {
  ROADSIDE_ISSUE_TYPES,
  captureGeolocation,
  fetchRoadsideHotline,
  formatTelLink,
  getEligibleRoadsideBookings,
  ROADSIDE_INELIGIBLE_MESSAGE,
  submitRoadsideRequest,
} from '../utils/roadsideAssistance';
import { formatBookingDateRange } from '../utils/bookings';

const RoadsideAssistanceModal = ({ open, onClose, bookings, currentUser, onSubmitted }) => {
  const eligible = getEligibleRoadsideBookings(bookings);
  const [bookingId, setBookingId] = useState('');
  const [issueType, setIssueType] = useState(ROADSIDE_ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [hotline, setHotline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedId, setSubmittedId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSubmittedId(null);
    setSubmitError('');
    setDescription('');
    setLocation(null);
    setLocationError('');
    fetchRoadsideHotline().then(setHotline);
    const first = getEligibleRoadsideBookings(bookings)[0];
    setBookingId(first ? (first.docId || first.id) : '');
  }, [open, bookings]);

  const selectedBooking = eligible.find((b) => (b.docId || b.id) === bookingId);

  const handleShareLocation = async () => {
    setLocating(true);
    setLocationError('');
    try {
      const coords = await captureGeolocation();
      setLocation(coords);
    } catch (err) {
      setLocationError(
        err.code === 1
          ? 'Location permission denied. You can still call the hotline or submit without GPS.'
          : err.message || 'Could not get your location.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId || !description.trim()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const id = await submitRoadsideRequest({
        userId: currentUser?.id,
        userName: currentUser?.name,
        userPhone: currentUser?.phone,
        bookingId,
        vehicleName: selectedBooking?.vehicleName,
        issueType,
        description,
        location,
      });
      setSubmittedId(id);
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.message === ROADSIDE_INELIGIBLE_MESSAGE
          ? err.message
          : 'Could not send your request. Please try again or call the hotline.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const telHref = formatTelLink(hotline);

  if (submittedId) {
    const openChat = () => {
      onSubmitted?.({
        id: submittedId,
        issueType,
        description: description.trim(),
        vehicleName: selectedBooking?.vehicleName || '',
        status: 'Open',
        userId: currentUser?.id,
        userName: currentUser?.name,
      });
      onClose();
    };

    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Help is on the way"
        footer={(
          <>
            <button type="button" style={styles.secondaryBtn} onClick={onClose}>
              Done
            </button>
            <button type="button" style={styles.primaryBtn} onClick={openChat}>
              Open chat with support
            </button>
          </>
        )}
      >
        <p style={styles.successText}>
          Your roadside request was submitted. Chat with support for updates, or call the hotline.
        </p>
        <p style={styles.reference}>
          Reference: <strong>#{submittedId.slice(0, 8).toUpperCase()}</strong>
        </p>
        {telHref && (
          <a href={telHref} style={styles.callBtn}>
            <PhoneCall size={18} />
            Call hotline ({hotline})
          </a>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Roadside Assistance"
      maxWidth="520px"
      footer={(
        <>
          <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="roadside-form"
            style={styles.primaryBtn}
            disabled={submitting || eligible.length === 0 || !description.trim()}
          >
            {submitting ? 'Sending...' : 'Request help'}
          </button>
        </>
      )}
    >
      {eligible.length === 0 ? (
        <div style={styles.emptyState}>
          <AlertCircle size={28} color="#F57F17" />
          <p>{ROADSIDE_INELIGIBLE_MESSAGE}</p>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#888' }}>
            If your booking is still pending approval, wait until it is approved and your pickup time has passed.
          </p>
          {telHref && (
            <a href={telHref} style={styles.callBtn}>
              <PhoneCall size={18} />
              Call 24/7 hotline
            </a>
          )}
        </div>
      ) : (
        <form id="roadside-form" onSubmit={handleSubmit}>
          {telHref && (
            <a href={telHref} style={styles.callBanner}>
              <PhoneCall size={20} color="#C62828" />
              <div>
                <strong>Need help right now?</strong>
                <span style={styles.callSub}>Call {hotline}</span>
              </div>
            </a>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Related booking</label>
            <select
              style={styles.select}
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              required
            >
              {eligible.map((b) => {
                const id = b.docId || b.id;
                return (
                  <option key={id} value={id}>
                    {b.vehicleName} — {formatBookingDateRange(b.startDate, b.endDate)}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Issue type</label>
            <select
              style={styles.select}
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
            >
              {ROADSIDE_ISSUE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Describe the situation</label>
            <textarea
              style={styles.textarea}
              rows={4}
              placeholder="Where are you, what happened, and is anyone injured?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Your location (optional)</label>
            {location ? (
              <p style={styles.locText}>
                <MapPin size={16} />
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                {location.accuracy ? ` (±${Math.round(location.accuracy)}m)` : ''}
              </p>
            ) : (
              <button
                type="button"
                style={styles.locBtn}
                onClick={handleShareLocation}
                disabled={locating}
              >
                {locating ? <Loader size={16} className="spin" /> : <MapPin size={16} />}
                {locating ? 'Getting location...' : 'Share my GPS location'}
              </button>
            )}
            {locationError && <p style={styles.error}>{locationError}</p>}
          </div>

          {submitError && <p style={styles.error}>{submitError}</p>}
        </form>
      )}
    </Modal>
  );
};

const styles = {
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#444', marginBottom: '0.4rem' },
  select: {
    width: '100%',
    padding: '0.65rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.65rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  callBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#FFEBEE',
    border: '1px solid #FFCDD2',
    borderRadius: '8px',
    marginBottom: '1.25rem',
    textDecoration: 'none',
    color: '#111',
  },
  callSub: { display: 'block', fontSize: '0.85rem', color: '#C62828', marginTop: '0.15rem' },
  callBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#C62828',
    color: '#FFF',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  locBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    background: '#FAFAFA',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  locText: { display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#333' },
  emptyState: { textAlign: 'center', color: '#666', lineHeight: 1.6 },
  successText: { color: '#333', lineHeight: 1.6, marginBottom: '0.75rem' },
  reference: { fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' },
  error: { color: '#C62828', fontSize: '0.85rem', marginTop: '0.35rem' },
  primaryBtn: {
    backgroundColor: '#C62828',
    color: '#FFF',
    padding: '0.65rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  secondaryBtn: {
    backgroundColor: '#FFF',
    color: '#333',
    padding: '0.65rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};

export default RoadsideAssistanceModal;
