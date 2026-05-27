import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ open, onClose, title, children, footer, maxWidth = '560px' }) => {
  if (!open) return null;

  return createPortal(
    <div style={styles.overlay} onClick={onClose} role="presentation">
      <div
        style={{ ...styles.dialog, maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div style={styles.header}>
          <h2 id="modal-title" style={styles.title}>{title}</h2>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div style={styles.body}>{children}</div>
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  dialog: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    width: '100%',
    maxHeight: 'min(90vh, 720px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.18)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
    display: 'flex',
    padding: '0.25rem',
  },
  body: {
    padding: '1.5rem',
    paddingBottom: '0.5rem',
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    padding: '1.15rem 1.5rem',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    flexShrink: 0,
    backgroundColor: '#FAFAFA',
  },
};

export default Modal;
