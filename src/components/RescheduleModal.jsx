import React, { useEffect, useState } from 'react';
import { Calendar, Car } from 'lucide-react';
import Modal from './Modal';
import { findAlternativeVehicles, findNextAvailableSlot } from '../utils/reschedule';
import { buildPickupSchedule } from '../utils/pickupPolicy';
import { calculateBookingTotal, fetchVehicleDailyRate } from '../utils/pricing';

const RescheduleModal = ({
  open,
  booking,
  onClose,
  onConfirm,
  saving = false,
}) => {
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [suggestedSlot, setSuggestedSlot] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dailyRate, setDailyRate] = useState(null);
  const [quoteTotal, setQuoteTotal] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;

    const load = async () => {
      setLoading(true);
      try {
        const days = booking.days || 1;
        const slot = await findNextAvailableSlot(booking.vehicleId, new Date(), days);
        setSuggestedSlot(slot);
        if (slot) {
          const toLocal = (d) => {
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          };
          setPickupDate(toLocal(slot.start));
          const end = slot.end;
          setReturnDate(toLocal(end));
        }
        const alts = await findAlternativeVehicles(booking.location, booking.vehicleId);
        setAlternatives(alts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, booking]);

  useEffect(() => {
    if (!open || !booking?.vehicleId) {
      setDailyRate(null);
      return undefined;
    }
    let cancelled = false;
    fetchVehicleDailyRate(booking.vehicleId).then((rate) => {
      if (!cancelled) {
        setDailyRate(rate ?? (booking.total / Math.max(1, booking.days || 1)));
      }
    });
    return () => { cancelled = true; };
  }, [open, booking?.vehicleId, booking?.total, booking?.days]);

  useEffect(() => {
    if (!pickupDate || !returnDate || !dailyRate) {
      setQuoteTotal(null);
      return undefined;
    }
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) {
      setQuoteTotal(null);
      return undefined;
    }
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    let cancelled = false;
    setQuoteLoading(true);
    calculateBookingTotal({ baseDailyRate: dailyRate, days, pickupDate: start })
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
  }, [pickupDate, returnDate, dailyRate]);

  const applySuggested = () => {
    if (!suggestedSlot) return;
    const toLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setPickupDate(toLocal(suggestedSlot.start));
    setReturnDate(toLocal(suggestedSlot.end));
  };

  const handleSubmit = () => {
    if (!pickupDate || !returnDate) return;
    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    if (end <= start) return;
    const schedule = buildPickupSchedule(start);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    onConfirm({ start, end, days, schedule });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule pickup"
      maxWidth="520px"
      footer={
        <>
          <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" style={styles.primaryBtn} onClick={handleSubmit} disabled={saving || !pickupDate}>
            {saving ? 'Saving…' : 'Confirm reschedule'}
          </button>
        </>
      }
    >
      <p style={styles.intro}>
        Avoid a no-show penalty by choosing a new pickup time for <strong>{booking?.vehicle}</strong>.
      </p>

      {loading ? (
        <p style={styles.muted}>Finding available slots…</p>
      ) : (
        <>
          {suggestedSlot && (
            <div style={styles.suggestionBox}>
              <div style={styles.suggestionHeader}>
                <Calendar size={18} color="#0033FF" />
                <span style={styles.suggestionTitle}>Suggested next slot</span>
              </div>
              <p style={styles.suggestionText}>
                {suggestedSlot.start.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {' → '}
                {suggestedSlot.end.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
              <button type="button" style={styles.linkBtn} onClick={applySuggested}>
                Use this slot
              </button>
            </div>
          )}

          <label style={styles.label}>New pickup</label>
          <input
            type="datetime-local"
            style={styles.input}
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />

          <label style={styles.label}>New return</label>
          <input
            type="datetime-local"
            style={styles.input}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />

          {pickupDate && returnDate && new Date(returnDate) > new Date(pickupDate) && (
            <div style={styles.quoteBox}>
              <div style={styles.quoteRow}>
                <span>Updated total (peak/off-peak and long-term rules)</span>
                <strong>
                  {quoteLoading ? 'Calculating…' : quoteTotal != null ? `₱${quoteTotal.toLocaleString()}` : '—'}
                </strong>
              </div>
              {dailyRate != null && (
                <p style={styles.muted}>
                  Base rate ₱{dailyRate.toLocaleString()}/day from fleet pricing settings.
                </p>
              )}
            </div>
          )}

          {alternatives.length > 0 && (
            <div style={styles.altSection}>
              <p style={styles.altTitle}>
                <Car size={16} /> Other vehicles at {booking?.location || 'your hub'}
              </p>
              <ul style={styles.altList}>
                {alternatives.map((v) => (
                  <li key={v.id} style={styles.altItem}>
                    {v.name}
                    {v.availableNow && <span style={styles.nowBadge}>Available now</span>}
                    <span style={styles.altPrice}>₱{v.price?.toLocaleString()}/day</span>
                  </li>
                ))}
              </ul>
              <p style={styles.muted}>Book an alternative from Browse Fleet if your preferred car is unavailable.</p>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

const styles = {
  intro: { fontSize: '0.9rem', color: '#555', lineHeight: 1.5, margin: '0 0 1rem' },
  muted: { fontSize: '0.8rem', color: '#888', margin: 0 },
  suggestionBox: {
    backgroundColor: '#F0F4FF',
    border: '1px solid #D6E4FF',
    borderRadius: '8px',
    padding: '0.85rem 1rem',
    marginBottom: '1rem',
  },
  suggestionHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' },
  suggestionTitle: { fontWeight: 600, fontSize: '0.85rem', color: '#111' },
  suggestionText: { fontSize: '0.85rem', color: '#444', margin: '0 0 0.5rem' },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#0033FF',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: 0,
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.35rem',
    marginTop: '0.75rem',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
  },
  quoteBox: {
    marginTop: '1rem',
    padding: '0.85rem 1rem',
    backgroundColor: '#F0F4FF',
    border: '1px solid #D6E4FF',
    borderRadius: '8px',
  },
  quoteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.9rem',
    color: '#333',
  },
  altSection: { marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #EEE' },
  altTitle: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' },
  altList: { listStyle: 'none', padding: 0, margin: '0 0 0.5rem' },
  altItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    padding: '0.4rem 0',
    color: '#333',
  },
  nowBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
  },
  altPrice: { marginLeft: 'auto', color: '#888', fontSize: '0.8rem' },
  secondaryBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0033FF',
    color: '#FFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default RescheduleModal;
