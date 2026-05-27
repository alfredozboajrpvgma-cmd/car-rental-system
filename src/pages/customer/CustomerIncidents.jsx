import React, { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Clock, Plus, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import IncidentChat from '../../components/IncidentChat';
import RoadsideAssistanceModal from '../../components/RoadsideAssistanceModal';
import { fetchBookingsForUser } from '../../utils/bookings';

const CustomerIncidents = () => {
  const { currentUser } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showRoadsideModal, setShowRoadsideModal] = useState(false);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const loadBookings = async () => {
      if (!currentUser?.id) return;
      try {
        const list = await fetchBookingsForUser(currentUser.id);
        setBookings(list.map((b) => ({ id: b.docId, ...b })));
      } catch (err) {
        console.error(err);
      }
    };
    loadBookings();
  }, [currentUser?.id]);

  const {
    items: roadsideRequests,
    loading,
    error,
  } = useFirestoreCollection('roadsideAssistance', {
    realtime: true,
    enabled: Boolean(currentUser?.id),
    queryFilters: currentUser?.id ? [['userId', '==', currentUser.id]] : [],
  });

  const sortedRequests = useMemo(
    () => [...roadsideRequests].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [roadsideRequests]
  );

  const formatRequestTime = (ts) => {
    if (!ts) return 'Unknown date';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Roadside Assistance</h1>
          <p style={styles.subtitle}>Track requests and chat with support in real time.</p>
        </div>
        <button type="button" style={styles.primaryBtn} onClick={() => setShowRoadsideModal(true)}>
          <Plus size={18} />
          New Request
        </button>
      </div>

      {loading && <p style={{ color: '#888' }}>Loading requests…</p>}
      {error && (
        <p style={{ color: '#C62828' }}>
          Could not load requests. Please refresh or try again later.
        </p>
      )}

      {!loading && !error && sortedRequests.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}><AlertTriangle size={32} color="#888" /></div>
          <h3>No requests yet</h3>
          <p>Submit roadside help during an active rental, then use chat to follow up with support.</p>
        </div>
      )}

      <div style={styles.grid}>
        {sortedRequests.map((req) => (
          <div key={req.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.issueType}>{req.issueType}</h3>
                <p style={styles.vehicle}>{req.vehicleName}</p>
              </div>
              <span style={{
                ...styles.badge,
                ...(req.status === 'Resolved' ? styles.badgeSuccess
                  : req.status === 'Open' ? styles.badgeDanger : styles.badgeInfo),
              }}
              >
                {req.status}
              </span>
            </div>

            <p style={styles.desc}>{req.description}</p>

            <div style={styles.meta}>
              <Clock size={14} />
              <span>Reported {formatRequestTime(req.createdAt)}</span>
            </div>

            <div style={styles.footer}>
              <button
                type="button"
                style={styles.btn}
                onClick={() => setSelectedChat(req)}
              >
                <MessageSquare size={16} />
                {req.status === 'Resolved' ? 'View chat history' : 'Open chat'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedChat && (
        <div style={styles.modalOverlay} onClick={() => setSelectedChat(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="fade-in">
            <IncidentChat
              request={selectedChat}
              currentUser={currentUser}
              isSupport={false}
              onClose={() => setSelectedChat(null)}
            />
          </div>
        </div>
      )}

      <RoadsideAssistanceModal
        open={showRoadsideModal}
        onClose={() => setShowRoadsideModal(false)}
        bookings={bookings}
        currentUser={currentUser}
        onSubmitted={(newRequest) => {
          setShowRoadsideModal(false);
          if (newRequest) setSelectedChat(newRequest);
        }}
      />
    </div>
  );
};

const styles = {
  header: {
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: { fontSize: '1.75rem', fontWeight: 600, margin: 0, color: '#111' },
  subtitle: { color: '#666', marginTop: '0.5rem' },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#0033FF',
    color: '#FFF',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: '12px',
    border: '1px solid #E0E0E0',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  issueType: { fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#111' },
  vehicle: { fontSize: '0.85rem', color: '#666', marginTop: '0.2rem' },
  desc: {
    fontSize: '0.9rem',
    color: '#333',
    lineHeight: 1.5,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  meta: { display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#888', fontSize: '0.8rem', marginTop: 'auto' },
  badge: { padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' },
  badgeDanger: { backgroundColor: '#FFEBEE', color: '#C62828' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  badgeInfo: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  footer: {
    borderTop: '1px solid #EEE',
    paddingTop: '1rem',
    marginTop: '0.5rem',
  },
  btn: {
    width: '100%',
    backgroundColor: '#0033FF',
    color: '#FFF',
    border: 'none',
    padding: '0.75rem',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  empty: {
    padding: '4rem',
    backgroundColor: '#FFF',
    borderRadius: '12px',
    border: '1px solid #E0E0E0',
    textAlign: 'center',
    color: '#666',
  },
  emptyIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#F5F5F7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    backgroundColor: '#FFF',
    borderRadius: '12px',
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    zIndex: 201,
    overflow: 'hidden',
  },
};

export default CustomerIncidents;
