import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const NotificationBell = ({ defaultLink = '/customer/bookings' }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });
        setNotifications(list);
      },
      (err) => console.error('Notifications error:', err)
    );

    return unsubscribe;
  }, [currentUser?.id]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      if (
        panelRef.current?.contains(e.target) ||
        bellRef.current?.contains(e.target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    setOpen(false);
    navigate(notification.link || defaultLink);
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const date = timestamp.toDate();
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={styles.wrapper}>
      <button
        ref={bellRef}
        type="button"
        style={styles.bellBtn}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={styles.bellBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} style={styles.panel} role="menu">
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            {unreadCount > 0 && (
              <span style={styles.unreadLabel}>{unreadCount} unread</span>
            )}
          </div>
          <div style={styles.list}>
            {notifications.length === 0 ? (
              <p style={styles.empty}>No notifications yet</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  role="menuitem"
                  style={{
                    ...styles.item,
                    ...(n.read ? styles.itemRead : styles.itemUnread),
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8EEFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = n.read ? '#FFF' : '#F0F4FF';
                  }}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div style={styles.itemTitle}>{n.title}</div>
                  <div style={styles.itemMessage}>{n.message}</div>
                  <div style={styles.itemTime}>{formatTime(n.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    position: 'relative',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#FF3B30',
    color: '#FFF',
    fontSize: '0.6rem',
    fontWeight: 600,
    minWidth: '14px',
    height: '14px',
    padding: '0 3px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    width: '320px',
    maxHeight: '400px',
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    borderBottom: '1px solid #E0E0E0',
  },
  panelTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#111',
  },
  unreadLabel: {
    fontSize: '0.75rem',
    color: '#0033FF',
    fontWeight: 500,
  },
  list: {
    overflowY: 'auto',
    maxHeight: '340px',
  },
  item: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '0.85rem 1rem',
    border: 'none',
    borderBottom: '1px solid #F0F0F0',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s ease',
  },
  itemUnread: {
    backgroundColor: '#F0F4FF',
  },
  itemRead: {
    backgroundColor: '#FFF',
  },
  itemTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#111',
    marginBottom: '0.2rem',
  },
  itemMessage: {
    fontSize: '0.8rem',
    color: '#666',
    lineHeight: 1.4,
    marginBottom: '0.35rem',
  },
  itemTime: {
    fontSize: '0.7rem',
    color: '#999',
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: '#888',
    fontSize: '0.85rem',
    margin: 0,
  },
};

export default NotificationBell;
