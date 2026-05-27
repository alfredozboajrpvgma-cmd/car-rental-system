import React from 'react';
import { AlertTriangle } from 'lucide-react';

const LeaveSiteWarningModal = ({ title, message, onCancel, onConfirm }) => {
  return (
    <div style={styles.modalOverlay} onClick={onCancel}>
      <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={styles.iconWrapper}>
          <AlertTriangle size={32} color="#F57F17" />
        </div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.message}>{message}</p>
        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>
            Stay Here
          </button>
          <button type="button" style={styles.confirmBtn} onClick={onConfirm}>
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px',
    padding: '2rem',
    textAlign: 'center',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#FFF8E1',
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
  },
  message: {
    fontSize: '0.95rem',
    color: '#666',
    lineHeight: 1.5,
    marginBottom: '1.75rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: '#FFF',
    color: '#333',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
  },
  confirmBtn: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'var(--text-color)',
    color: '#FFF',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
  },
};

export default LeaveSiteWarningModal;
