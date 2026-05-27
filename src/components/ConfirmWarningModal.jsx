import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

const ConfirmWarningModal = ({
  open,
  title,
  message,
  consequences = [],
  cancelLabel = 'Keep Booking',
  confirmLabel = 'Yes, Cancel Booking',
  confirmingLabel = 'Cancelling...',
  onCancel,
  onConfirm,
  confirming = false,
}) => {
  if (!open) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onCancel} role="presentation">
      <div
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warning-title"
        aria-describedby="warning-desc"
      >
        <div style={styles.iconWrapper}>
          <AlertTriangle size={32} color="#C62828" />
        </div>
        <h2 id="warning-title" style={styles.title}>{title}</h2>
        {message && <p id="warning-desc" style={styles.message}>{message}</p>}
        {consequences.length > 0 && (
          <ul style={styles.list}>
            {consequences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button type="button" style={styles.confirmBtn} onClick={onConfirm} disabled={confirming}>
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  dialog: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    padding: '2rem',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#FFEBEE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111',
    marginBottom: '0.75rem',
    textAlign: 'center',
  },
  message: {
    fontSize: '0.95rem',
    color: '#666',
    lineHeight: 1.5,
    marginBottom: '1rem',
    textAlign: 'center',
  },
  list: {
    margin: '0 0 1.5rem',
    padding: '0 0 0 1.25rem',
    fontSize: '0.9rem',
    color: '#444',
    lineHeight: 1.6,
    textAlign: 'left',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
    color: '#333',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmBtn: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#C62828',
    color: '#FFF',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

export default ConfirmWarningModal;
