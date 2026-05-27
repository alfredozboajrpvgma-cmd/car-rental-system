import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import {
  formatCountdown,
  formatPickupWindow,
  getGraceRemainingMs,
  usesPickupGracePeriod,
} from '../utils/pickupPolicy';

const PickupGraceCountdown = ({ booking, compact = false }) => {
  const [remainingMs, setRemainingMs] = useState(() => getGraceRemainingMs(booking));

  useEffect(() => {
    const tick = () => setRemainingMs(getGraceRemainingMs(booking));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);

  if (!usesPickupGracePeriod(booking)) return null;
  if (booking.status !== 'Approved') return null;

  const urgent = remainingMs > 0 && remainingMs < 15 * 60 * 1000;
  const ended = remainingMs === 0;

  if (compact) {
    return (
      <span style={{
        ...styles.compact,
        ...(urgent ? styles.compactUrgent : {}),
        ...(ended ? styles.compactEnded : {}),
      }}>
        <Clock size={12} />
        {ended ? 'Grace ended' : formatCountdown(remainingMs)}
      </span>
    );
  }

  return (
    <div style={{
      ...styles.box,
      ...(urgent ? styles.boxUrgent : {}),
      ...(ended ? styles.boxEnded : {}),
    }}>
      <div style={styles.row}>
        <Clock size={18} />
        <strong style={styles.title}>
          {ended ? 'Grace period ended' : 'Pickup grace period'}
        </strong>
      </div>
      <p style={styles.window}>
        Pickup window: {formatPickupWindow(booking)}
      </p>
      <p style={styles.countdown}>
        {ended
          ? 'If you have not picked up the vehicle, it may be marked as no-show and released.'
          : formatCountdown(remainingMs)}
      </p>
    </div>
  );
};

const styles = {
  box: {
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    backgroundColor: '#F0F4FF',
    border: '1px solid #D6E4FF',
    marginBottom: '0.85rem',
  },
  boxUrgent: {
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFE082',
  },
  boxEnded: {
    backgroundColor: '#FFEBEE',
    border: '1px solid #FFCDD2',
  },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' },
  title: { fontSize: '0.9rem', color: '#111' },
  window: { fontSize: '0.8rem', color: '#555', margin: '0 0 0.25rem' },
  countdown: { fontSize: '0.85rem', fontWeight: 600, color: '#0033FF', margin: 0 },
  compact: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#1565C0',
    backgroundColor: '#E3F2FD',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  compactUrgent: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  compactEnded: { backgroundColor: '#FFEBEE', color: '#C62828' },
};

export default PickupGraceCountdown;
