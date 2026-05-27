import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, AlertTriangle, PhoneCall, Clock, ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAllBookings } from '../../utils/analytics';
import { SUPPORT_THEME } from '../../utils/staffPortalThemes';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { getEffectiveRoadsideSla, getSlaStatus } from '../../utils/sla';
import SlaBadge from '../../components/SlaBadge';

const cardStyle = {
  background: '#FFF',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  padding: '1.5rem',
};

const SupportDashboard = () => {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { items: roadside, loading: roadsideLoading } = useFirestoreCollection('roadsideAssistance');
  const { items: incidents, loading: incidentsLoading } = useFirestoreCollection('incidents');

  useEffect(() => {
    fetchAllBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending = bookings.filter((b) => b.status === 'Pending').length;
  const active = bookings.filter((b) => b.status === 'Active').length;
  const openRoadside = roadside.filter((r) => r.status === 'Open').length;
  const openIncidents = incidents.filter((i) => i.status === 'Open' || i.status === 'Under Repair').length;

  const recentPending = bookings
    .filter((b) => b.status === 'Pending')
    .slice(0, 5);

  const enrichRoadside = (r) => {
    const sla = getEffectiveRoadsideSla(r);
    return { ...r, slaRespondBy: sla.respondBy, slaResolveBy: sla.resolveBy };
  };

  const openRoadsideList = roadside.filter((r) => r.status === 'Open' || r.status === 'Dispatched');
  const slaAlerts = openRoadsideList
    .map(enrichRoadside)
    .filter((r) => getSlaStatus(r).level !== 'ok')
    .slice(0, 5);

  const theme = SUPPORT_THEME;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          Support dashboard
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Hello, {currentUser?.name || 'team'} — manage bookings, customers, and roadside help.
        </p>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}
      >
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><Clock size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '…' : pending}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Pending approvals</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><CalendarCheck size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '…' : active}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Active rentals</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><PhoneCall size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{roadsideLoading ? '…' : openRoadside}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Open roadside requests</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><AlertTriangle size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{incidentsLoading ? '…' : openIncidents}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Open incidents</div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
      }}
      >
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/support/reservations" style={actionLink(theme)}>Review reservations <ArrowRight size={16} /></Link>
            <Link to="/support/customers" style={actionLink(theme)}>Customer accounts <ArrowRight size={16} /></Link>
            <Link to="/support/incidents" style={actionLink(theme)}>Incidents & roadside chat <ArrowRight size={16} /></Link>
            <Link to="/support/locations" style={actionLink(theme)}>Hub locations <ArrowRight size={16} /></Link>
            <Link to="/support/faq" style={actionLink(theme)}>FAQ & playbook <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>SLA attention (roadside)</h2>
          {roadsideLoading && <p style={{ color: '#888' }}>Loading…</p>}
          {!roadsideLoading && slaAlerts.length === 0 && (
            <p style={{ color: '#888' }}>All open roadside requests are on track.</p>
          )}
          {!roadsideLoading && slaAlerts.map((r) => (
            <div key={r.id} style={{
              padding: '0.75rem 0',
              borderBottom: '1px solid #F0F0F0',
            }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.issueType || 'Roadside'}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.35rem' }}>
                {r.userName || 'Customer'}
                {' · '}
                {r.status}
              </div>
              <SlaBadge request={r} />
            </div>
          ))}
          {!roadsideLoading && slaAlerts.length > 0 && (
            <Link to="/support/incidents" style={{ ...actionLink(theme), marginTop: '1rem', display: 'inline-flex' }}>
              Open incidents <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Pending reservations</h2>
          {loading && <p style={{ color: '#888' }}>Loading…</p>}
          {!loading && recentPending.length === 0 && (
            <p style={{ color: '#888' }}>No pending bookings right now.</p>
          )}
          {!loading && recentPending.map((b) => (
            <div key={b.docId} style={{
              padding: '0.75rem 0',
              borderBottom: '1px solid #F0F0F0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{b.vehicleName || 'Vehicle'}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{b.customerName || b.userId}</div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: theme.primaryHex,
                background: theme.primaryBg,
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
              >
                {b.status}
              </span>
            </div>
          ))}
          {!loading && recentPending.length > 0 && (
            <Link to="/support/reservations" style={{ ...actionLink(theme), marginTop: '1rem', display: 'inline-flex' }}>
              View all <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const actionLink = (theme) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.85rem 1rem',
  borderRadius: '8px',
  backgroundColor: theme.primaryBg,
  color: theme.primaryHex,
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
});

export default SupportDashboard;
