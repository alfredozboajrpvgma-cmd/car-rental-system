import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarCheck, ChevronRight, Loader, Download } from 'lucide-react';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';
import ConfirmWarningModal from '../../components/ConfirmWarningModal';
import PickupGraceCountdown from '../../components/PickupGraceCountdown';
import DriverTrackingPanel from '../../components/DriverTrackingPanel';
import { isWithDriverRentalMode } from '../../utils/rentalMode';
import RescheduleModal from '../../components/RescheduleModal';
import {
  canCustomerCancel,
  fetchBookingsForUser,
  mapBookingForCustomerList,
  syncVehicleStatusForBooking,
  trySyncVehicleStatusForBooking,
} from '../../utils/bookings';
import { canGenerateReceipt, downloadBookingReceipt, printBookingReceipt } from '../../utils/receipt';
import { getBookingErrorMessage, updateBooking } from '../../utils/supabaseBookings';
import { canReschedulePickup, formatPickupWindow, usesPickupGracePeriod } from '../../utils/pickupPolicy';
import { formatEtaLabel } from '../../utils/travelTime';
import { createNotification } from '../../utils/notifications';
import { calculateBookingTotal, fetchVehicleDailyRate } from '../../utils/pricing';

const statusBadgeStyle = (status) => {
  const base = {
    display: 'inline-block',
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };
  if (status === 'Pending') return { ...base, backgroundColor: '#FFF8E1', color: '#F57F17' };
  if (status === 'Approved') return { ...base, backgroundColor: '#E3F2FD', color: '#1565C0' };
  if (status === 'Active' || status === 'Completed') return { ...base, backgroundColor: '#E8F5E9', color: '#2E7D32' };
  if (status === 'Cancelled') return { ...base, backgroundColor: '#FFEBEE', color: '#C62828' };
  if (status === 'No-Show') return { ...base, backgroundColor: '#FCE4EC', color: '#AD1457' };
  return { ...base, backgroundColor: '#F5F5F7', color: '#666' };
};

const CustomerBookings = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  const handleReceipt = async (action) => {
    if (!selected) return;
    setReceiptLoading(true);
    try {
      const payload = {
        id: `#${selected.id}`,
        docId: selected.docId,
        customerName: selected.customerName || currentUser?.name,
        customerEmail: currentUser?.email,
        vehicleName: selected.vehicle,
        plate: selected.plate,
        dateRange: selected.date,
        location: selected.location,
        status: selected.status,
        total: selected.total,
        days: selected.days,
        daysLabel: selected.daysLabel,
      };
      if (action === 'print') {
        await printBookingReceipt(payload);
      } else {
        await downloadBookingReceipt(payload);
      }
    } catch (err) {
      console.error(err);
      alert('Could not generate receipt. Please try again.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const getCancelConsequences = (booking) => {
    const base = [
      'Your reservation will be marked as cancelled and cannot be restored.',
      'The vehicle will be released and may be booked by another customer.',
      'You will need to submit a new booking if you still want to rent this vehicle.',
    ];
    if (booking.status === 'Approved') {
      return [
        ...base,
        'Because this booking was already approved, the same dates and vehicle are not guaranteed if you book again.',
        'Late cancellations may be subject to fees per rental policy.',
      ];
    }
    return [
      ...base,
      'No payment has been processed yet, but your reserved dates will no longer be held.',
    ];
  };

  const fetchBookings = async () => {
    const userId = auth.currentUser?.uid ?? currentUser?.id;
    if (!userId) return;

    setLoading(true);
    setLoadError('');
    try {
      const rows = await fetchBookingsForUser(userId);
      setBookings(rows.map(mapBookingForCustomerList));
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoadError('Could not load your bookings. Please refresh the page.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [currentUser?.id]);

  useEffect(() => {
    const openId = location.state?.openBookingId;
    if (!openId || bookings.length === 0) return;
    const match = bookings.find((b) => b.docId === openId);
    if (match) setSelected(match);
  }, [location.state, bookings]);

  const handleRescheduleConfirm = async ({ start, end, days, schedule }) => {
    if (!selected) return;
    setRescheduling(true);
    try {
      const baseDailyRate =
        (await fetchVehicleDailyRate(selected.vehicleId))
        ?? (selected.total / Math.max(1, selected.days || 1));
      const { total: newTotal } = await calculateBookingTotal({
        baseDailyRate,
        days,
        pickupDate: start,
      });
      await updateBooking(selected.docId, {
        startDate: start,
        endDate: end,
        days,
        total: newTotal,
        pickupWindowStart: schedule.pickupWindowStart,
        pickupWindowEnd: schedule.pickupWindowEnd,
        gracePeriodEndsAt: schedule.gracePeriodEndsAt,
      });
      await createNotification({
        userId: auth.currentUser?.uid ?? currentUser?.id,
        title: 'Pickup rescheduled',
        message: `Your pickup for ${selected.vehicle} was moved to ${start.toLocaleString()}.`,
        link: '/customer/bookings',
        type: 'reschedule',
      });
      setShowReschedule(false);
      setSelected(null);
      await fetchBookings();
    } catch (err) {
      console.error('Reschedule failed:', err);
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!selected || !canCustomerCancel(selected.status)) return;
    setCancelling(true);
    setCancelError('');
    setCancelSuccess('');
    try {
      await updateBooking(selected.docId, { status: 'Cancelled' });
      await trySyncVehicleStatusForBooking(selected.vehicleId, 'Cancelled');
      await createNotification({
        userId: auth.currentUser?.uid ?? currentUser?.id,
        title: 'Booking cancelled',
        message: `Your reservation for ${selected.vehicle} was cancelled.`,
        link: '/customer/bookings',
        type: 'cancel',
      });
      setShowCancelWarning(false);
      setSelected(null);
      setCancelSuccess('Your booking was cancelled successfully.');
      await fetchBookings();
      setTimeout(() => setCancelSuccess(''), 4000);
    } catch (err) {
      console.error('Cancel failed:', err);
      setCancelError(getBookingErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Bookings</h1>
          <p style={styles.subtitle}>{bookings.length} total reservations</p>
        </div>
      </div>

      {loadError && (
        <p style={styles.errorText}>{loadError}</p>
      )}
      {cancelSuccess && (
        <p style={styles.successText}>{cancelSuccess}</p>
      )}
      {cancelError && (
        <p style={styles.errorText}>{cancelError}</p>
      )}

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Vehicle</th>
              <th>Duration</th>
              <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr
                key={b.docId}
                className="booking-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(b)}
              >
                <td style={styles.monoText}>#{b.id}</td>
                <td>
                  <div style={styles.primaryText}>{b.vehicle}</div>
                  <div style={styles.secondaryText}>Plate: {b.plate}</div>
                </td>
                <td>
                  <div style={styles.primaryText}>{b.date}</div>
                  <div style={styles.secondaryText}>{b.daysLabel}</div>
                </td>
                <td style={{ textAlign: 'right', paddingRight: '2rem', fontFamily: 'monospace', fontWeight: 600 }}>
                  ₱{b.total.toLocaleString()}
                </td>
                <td>
                  <span style={{
                    ...styles.badge,
                    ...(b.status === 'Pending' ? styles.badgeWarning :
                        b.status === 'Approved' ? styles.badgeInfo :
                        b.status === 'Completed' || b.status === 'Active' ? styles.badgeSuccess :
                        b.status === 'Cancelled' || b.status === 'No-Show' ? styles.badgeDanger : styles.badgeNeutral)
                  }}>
                    {b.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right', color: '#CCC' }}>
                  <ChevronRight size={20} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && !loadError && bookings.length === 0 && (
        <div style={styles.emptyState}>
          <CalendarCheck size={48} color="#ccc" />
          <h3 style={{ marginTop: '1rem', color: '#111' }}>No bookings yet</h3>
          <p style={{ color: '#888' }}>When you book a vehicle, your reservation details will appear here.</p>
        </div>
      )}
      {loading && (
        <div style={{ ...styles.emptyState, padding: '4rem 2rem' }}>
          <Loader size={32} color="#0033FF" className="spin" />
          <p style={{ color: '#888', marginTop: '1rem' }}>Loading your reservations...</p>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => {
          setShowCancelWarning(false);
          setShowReschedule(false);
          setSelected(null);
        }}
        title={selected ? `Booking #${selected.id}` : ''}
        maxWidth="480px"
        footer={
          selected && (
            canGenerateReceipt(selected.status)
            || canCustomerCancel(selected.status)
            || canReschedulePickup(selected)
          ) ? (
            <>
              {canReschedulePickup(selected) && (
                <button
                  type="button"
                  style={styles.rescheduleBtn}
                  onClick={() => setShowReschedule(true)}
                  disabled={rescheduling}
                >
                  Reschedule pickup
                </button>
              )}
              {canGenerateReceipt(selected.status) && (
                <>
                  <button
                    type="button"
                    style={styles.receiptBtn}
                    onClick={() => handleReceipt('download')}
                    disabled={receiptLoading}
                  >
                    <Download size={16} />
                    {receiptLoading ? 'Generating...' : 'Download receipt'}
                  </button>
                  <button
                    type="button"
                    style={styles.receiptBtnOutline}
                    onClick={() => handleReceipt('print')}
                    disabled={receiptLoading}
                  >
                    Print / PDF
                  </button>
                </>
              )}
              {canCustomerCancel(selected.status) && (
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowCancelWarning(true)}
                  disabled={cancelling}
                >
                  Cancel Booking
                </button>
              )}
            </>
          ) : null
        }
      >
        {selected && (
          <div style={styles.detailGrid}>
            {selected.status === 'Approved' && !isWithDriverRentalMode(selected.rentalMode) && (
              <p style={styles.approvedNote}>
                Your reservation is confirmed. Present a valid license at pickup.
              </p>
            )}
            {selected.status === 'Approved' && isWithDriverRentalMode(selected.rentalMode) && (
              <p style={styles.approvedNote}>
                Your chauffeur will travel from {selected.hubName || 'the nearest hub'} to your pinned address.
                Estimated drive time: {formatEtaLabel(selected.estimatedArrivalMinutes)}.
              </p>
            )}
            {isWithDriverRentalMode(selected.rentalMode)
              && ['Approved', 'Active', 'Pending'].includes(selected.status) && (
              <DriverTrackingPanel booking={selected} />
            )}
            {selected.status === 'Approved' && usesPickupGracePeriod(selected) && (
              <>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Pickup window</span>
                  <span style={{ fontSize: '0.85rem', textAlign: 'right' }}>{formatPickupWindow(selected)}</span>
                </div>
                <PickupGraceCountdown booking={selected} />
              </>
            )}
            {selected.status === 'No-Show' && (
              <p style={styles.noShowNote}>
                This booking was marked as no-show. You can book again from Browse Fleet.
              </p>
            )}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status</span>
              <span style={statusBadgeStyle(selected.status)}>{selected.status}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Vehicle</span>
              <span>{selected.vehicle}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Plate</span>
              <span>{selected.plate}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Dates</span>
              <span>{selected.date}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Duration</span>
              <span>{selected.daysLabel}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Pickup</span>
              <span>{selected.location || '—'}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Total</span>
              <span style={styles.totalValue}>₱{selected.total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      <RescheduleModal
        open={showReschedule && !!selected}
        booking={selected}
        onClose={() => setShowReschedule(false)}
        onConfirm={handleRescheduleConfirm}
        saving={rescheduling}
      />

      <ConfirmWarningModal
        open={showCancelWarning && !!selected}
        title="Cancel this booking?"
        message={
          selected
            ? `You are about to cancel your reservation for ${selected.vehicle} (${selected.date}). Please review the following:`
            : ''
        }
        consequences={selected ? getCancelConsequences(selected) : []}
        cancelLabel="Keep Booking"
        confirmLabel="Yes, Cancel Booking"
        onCancel={() => setShowCancelWarning(false)}
        onConfirm={handleCancelConfirm}
        confirming={cancelling}
      />
    </div>
  );
};

const styles = {
  header: { marginBottom: '2rem' },
  title: { fontSize: '1.75rem', fontWeight: 600, color: '#111' },
  subtitle: { color: '#888', fontSize: '0.9rem', marginTop: '0.25rem' },
  errorText: { color: '#C62828', fontSize: '0.9rem', marginBottom: '1rem' },
  successText: { color: '#2E7D32', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 },
  tableContainer: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E0E0E0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  monoText: { fontFamily: 'monospace', fontWeight: 600, fontSize: '0.9rem', color: '#333' },
  primaryText: { fontWeight: 600, fontSize: '0.95rem', color: '#111' },
  secondaryText: { fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.15rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeInfo: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeWarning: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  badgeNeutral: { backgroundColor: '#F5F5F7', color: '#666' },
  badgeDanger: { backgroundColor: '#FFEBEE', color: '#C62828' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' },
  detailGrid: { display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  detailLabel: { color: '#888', fontWeight: 500, flexShrink: 0 },
  totalValue: { fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem' },
  approvedNote: {
    margin: '0 0 0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#E8F5E9',
    borderRadius: '8px',
    color: '#2E7D32',
    fontSize: '0.85rem',
    lineHeight: 1.45,
  },
  rescheduleBtn: {
    padding: '0.75rem 1.25rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#0033FF',
    color: '#FFF',
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: 'auto',
  },
  noShowNote: {
    margin: '0 0 0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#FCE4EC',
    borderRadius: '8px',
    color: '#AD1457',
    fontSize: '0.85rem',
    lineHeight: 1.45,
  },
  cancelBtn: { padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#C62828', color: '#FFF', fontWeight: 600, cursor: 'pointer' },
  receiptBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #E0E0E0', backgroundColor: '#FFF', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' },
  receiptBtnOutline: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #0033FF', backgroundColor: '#FFF', color: '#0033FF', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' },
};

export default CustomerBookings;
