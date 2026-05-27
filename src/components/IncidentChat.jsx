import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, User, ShieldAlert, CheckCircle, X } from 'lucide-react';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { notifyStaff, createNotification } from '../utils/notifications';
import { staffIncidentsLink } from '../hooks/useStaffPortal';

const IncidentChat = ({ request, currentUser, isSupport = false, onClose }) => {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [loadError, setLoadError] = useState('');
  const bottomRef = useRef(null);

  const senderId = currentUser?.id;
  const isResolved = request?.status === 'Resolved';
  const staffLink = staffIncidentsLink(
    location.pathname.startsWith('/support') ? 'support' : 'admin'
  );

  useEffect(() => {
    if (!request?.id) return undefined;

    setLoadError('');
    const q = query(
      collection(db, 'roadsideAssistance', request.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...d.data() });
        });
        setMessages(msgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (err) => {
        console.error(err);
        setLoadError('Could not load messages. Check your connection and try again.');
      }
    );

    return () => unsubscribe();
  }, [request?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !request?.id || !senderId) return;

    setSending(true);
    setSendError('');
    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'roadsideAssistance', request.id, 'messages'), {
        text,
        senderId,
        senderName: currentUser.name || (isSupport ? 'Support' : 'Customer'),
        senderRole: isSupport ? 'support' : 'customer',
        createdAt: serverTimestamp(),
      });

      try {
        await updateDoc(doc(db, 'roadsideAssistance', request.id), {
          lastMessageAt: serverTimestamp(),
          lastMessagePreview: text.slice(0, 120),
        });
      } catch (metaErr) {
        console.warn('Could not update request preview fields', metaErr);
      }

      if (isSupport) {
        await createNotification({
          userId: request.userId,
          title: 'New message from support',
          message: `Regarding your ${request.issueType} request: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`,
          link: '/customer/incidents',
          type: 'support_message',
        });
      } else {
        await notifyStaff({
          title: 'Customer replied on roadside chat',
          message: `${currentUser.name || 'Customer'} — ${request.issueType}`,
          link: staffLink,
          type: 'roadside',
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setSendError('Message could not be sent. Please try again.');
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!request?.id) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>{request.issueType}</h3>
          <p style={styles.subtitle}>
            {request.vehicleName}
            {' '}
            • #
            {request.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <span style={{
          ...styles.badge,
          ...(isResolved ? styles.badgeSuccess : styles.badgeDanger),
          marginRight: onClose ? '1rem' : 0,
        }}
        >
          {request.status}
        </span>
        {onClose && (
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close chat">
            <X size={20} />
          </button>
        )}
      </div>

      <div style={styles.chatArea}>
        {loadError && <p style={styles.errorBanner}>{loadError}</p>}
        {!loadError && messages.length === 0 && (
          <div style={styles.empty}>
            <p>No messages yet.</p>
            <p style={{ fontSize: '0.85rem' }}>
              {isSupport
                ? 'Send a message to coordinate with the customer.'
                : 'Send a message — support will reply here.'}
            </p>
          </div>
        )}
        {!loadError && messages.map((msg) => {
          const isMe = msg.senderId === senderId;
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageWrapper,
                alignItems: isMe ? 'flex-end' : 'flex-start',
                alignSelf: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMe && (
                <div style={{
                  ...styles.avatar,
                  backgroundColor: msg.senderRole === 'support' ? '#0033FF' : '#9CA3AF',
                }}
                >
                  {msg.senderRole === 'support'
                    ? <ShieldAlert size={14} color="#FFF" />
                    : <User size={14} color="#FFF" />}
                </div>
              )}
              <div style={styles.messageContent}>
                {!isMe && <div style={styles.senderName}>{msg.senderName}</div>}
                <div style={{
                  ...styles.messageBubble,
                  ...(isMe ? styles.myBubble : styles.theirBubble),
                }}
                >
                  {msg.text}
                </div>
                <div style={{ ...styles.timestamp, textAlign: isMe ? 'right' : 'left' }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isResolved ? (
        <div style={styles.resolvedBanner}>
          <CheckCircle size={18} color="#2E7D32" />
          This conversation is closed because the request was resolved.
        </div>
      ) : (
        <>
          {sendError && <p style={styles.sendError}>{sendError}</p>}
          <form onSubmit={handleSend} style={styles.inputArea}>
            <input
              type="text"
              style={styles.input}
              placeholder={isSupport ? 'Message customer…' : 'Message support…'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending || !senderId}
            />
            <button
              type="submit"
              style={styles.sendBtn}
              disabled={!newMessage.trim() || sending || !senderId}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '400px',
    maxHeight: '600px',
    backgroundColor: '#FAFAFA',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.25rem',
    backgroundColor: '#FFF',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: '1.05rem', fontWeight: 600, margin: 0, color: '#111' },
  subtitle: { fontSize: '0.85rem', color: '#666', margin: '0.15rem 0 0' },
  badge: {
    padding: '0.25rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  badgeDanger: { backgroundColor: '#FFEBEE', color: '#C62828' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    marginLeft: 'auto',
  },
  chatArea: {
    flex: 1,
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  empty: {
    margin: 'auto',
    textAlign: 'center',
    color: '#888',
  },
  errorBanner: {
    color: '#C62828',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: 0,
  },
  messageWrapper: {
    display: 'flex',
    gap: '0.75rem',
    maxWidth: '85%',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1.25rem',
    flexShrink: 0,
  },
  messageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  senderName: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    marginLeft: '0.25rem',
  },
  messageBubble: {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    fontSize: '0.9rem',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  myBubble: {
    backgroundColor: '#0033FF',
    color: '#FFF',
    borderBottomRightRadius: '4px',
  },
  theirBubble: {
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    color: '#111',
    borderBottomLeftRadius: '4px',
  },
  timestamp: {
    fontSize: '0.7rem',
    color: '#AAA',
    marginTop: '0.1rem',
  },
  resolvedBanner: {
    padding: '1rem',
    backgroundColor: '#E8F5E9',
    color: '#1B5E20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    borderTop: '1px solid #C8E6C9',
  },
  sendError: {
    margin: 0,
    padding: '0.5rem 1rem',
    fontSize: '0.8rem',
    color: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  inputArea: {
    padding: '1rem',
    backgroundColor: '#FFF',
    borderTop: '1px solid #E0E0E0',
    display: 'flex',
    gap: '0.75rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    borderRadius: '24px',
    border: '1px solid #E0E0E0',
    fontSize: '0.95rem',
    outline: 'none',
  },
  sendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#0033FF',
    color: '#FFF',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};

export default IncidentChat;
