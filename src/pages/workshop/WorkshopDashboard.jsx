import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Car, Wrench, CheckCircle, Clock, ArrowRight, Gauge,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import { resolveFleetVehicleStatus } from '../../utils/bookings';
import { fetchVehicleReservationMap } from '../../utils/supabaseBookings';
import { WORKSHOP_THEME } from '../../utils/staffPortalThemes';
import { isServiceDueSoon, kmUntilService, getVehicleOdometer } from '../../utils/vehicleMaintenance';
import { checklistProgress } from '../../utils/maintenanceChecklist';

const cardStyle = {
  background: '#FFF',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  padding: '1.5rem',
};

const WorkshopDashboard = () => {
  const { currentUser } = useAuth();
  const { items: tasks, loading: tasksLoading } = useFirestoreCollection('maintenance');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [snap, reservationMap] = await Promise.all([
          getDocs(collection(db, 'vehicles')),
          fetchVehicleReservationMap().catch(() => ({ reserved: new Set(), pending: new Set() })),
        ]);
        const fleet = [];
        snap.forEach((d) => {
          const data = d.data();
          fleet.push({
            id: d.id,
            ...data,
            status: resolveFleetVehicleStatus(d.id, data.status, reservationMap.reserved),
          });
        });
        setVehicles(fleet);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const inMaintenance = vehicles.filter((v) => v.status === 'Maintenance').length;
  const available = vehicles.filter((v) => v.status === 'Available').length;
  const inShop = tasks.filter((t) => t.status === 'In Shop').length;
  const dueSoon = tasks.filter((t) => t.status === 'Due Soon').length;

  const urgentTasks = tasks
    .filter((t) => t.status === 'In Shop' || t.status === 'Due Soon')
    .slice(0, 5);

  const serviceDueVehicles = vehicles
    .filter((v) => isServiceDueSoon(v))
    .slice(0, 5);

  const theme = WORKSHOP_THEME;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          Workshop dashboard
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Hello, {currentUser?.name || 'team'} — fleet health, service tasks, and vehicle incidents.
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
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><Car size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '…' : vehicles.length}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Total fleet</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><CheckCircle size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '…' : available}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Available units</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><Wrench size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{loading ? '…' : inMaintenance}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>In maintenance</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: theme.primaryHex, marginBottom: '0.5rem' }}><Clock size={22} /></div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{tasksLoading ? '…' : inShop + dueSoon}</div>
          <div style={{ color: '#666', fontSize: '0.85rem' }}>Open service tasks</div>
        </div>
      </div>

      {serviceDueVehicles.length > 0 && (
        <div style={{
          ...cardStyle,
          marginBottom: '1.5rem',
          borderLeft: `4px solid ${theme.primaryHex}`,
        }}
        >
          <h2 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
          >
            <Gauge size={20} color={theme.primaryHex} />
            Service mileage alerts
          </h2>
          {serviceDueVehicles.map((v) => (
            <div key={v.id} style={{
              padding: '0.65rem 0',
              borderBottom: '1px solid #F0F0F0',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{v.name || v.model || v.id}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  {getVehicleOdometer(v).toLocaleString()} km on clock
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C62828' }}>
                {kmUntilService(v) === 0 ? 'Due now' : `${kmUntilService(v).toLocaleString()} km to service`}
              </span>
            </div>
          ))}
          <Link to="/workshop/tasks" style={{ ...actionLink(theme), marginTop: '1rem', display: 'inline-flex' }}>
            Schedule service <ArrowRight size={16} />
          </Link>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
      }}
      >
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Workshop tools</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/workshop/fleet" style={actionLink(theme)}>Fleet status <ArrowRight size={16} /></Link>
            <Link to="/workshop/tasks" style={actionLink(theme)}>Maintenance tasks <ArrowRight size={16} /></Link>
            <Link to="/workshop/incidents" style={actionLink(theme)}>Vehicle incidents <ArrowRight size={16} /></Link>
            <Link to="/workshop/locations" style={actionLink(theme)}>Hub locations <ArrowRight size={16} /></Link>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Priority service tasks</h2>
          {tasksLoading && <p style={{ color: '#888' }}>Loading…</p>}
          {!tasksLoading && urgentTasks.length === 0 && (
            <p style={{ color: '#888' }}>No open tasks — fleet is up to date.</p>
          )}
          {!tasksLoading && urgentTasks.map((t) => {
            const insp = t.status === 'In Shop' ? checklistProgress(t.inspectionChecklist) : null;
            return (
              <div key={t.id} style={{
                padding: '0.75rem 0',
                borderBottom: '1px solid #F0F0F0',
              }}
              >
                <div style={{ fontWeight: 600 }}>{t.vehicle || t.vehicleName || t.vehicleId}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{t.serviceType || t.type}</div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: theme.primaryHex,
                }}
                >
                  {t.status}
                  {insp && ` · Checklist ${insp.done}/${insp.total}`}
                </span>
              </div>
            );
          })}
          {!tasksLoading && urgentTasks.length > 0 && (
            <Link to="/workshop/tasks" style={{ ...actionLink(theme), marginTop: '1rem', display: 'inline-flex' }}>
              All tasks <ArrowRight size={16} />
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

export default WorkshopDashboard;
