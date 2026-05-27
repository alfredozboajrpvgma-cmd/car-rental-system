import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, MoreHorizontal, PhoneCall, MapPin, Camera, MessageSquare } from 'lucide-react';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import SlaBadge from '../../components/SlaBadge';
import { useAuth } from '../../contexts/AuthContext';
import { notifyAdmins } from '../../utils/notifications';
import IncidentChat from '../../components/IncidentChat';

const _removedMock = [
  {
    id: 'INC-2401',
    vehicle: 'Toyota Vios 1.5 G',
    plate: 'ABC 1234',
    bookingId: '#RES-4092',
    date: 'Oct 15, 2025',
    type: 'Scratch / Dent',
    severity: 'Minor',
    status: 'Open',
    reportedBy: 'Juan Dela Cruz (Customer)',
    description: 'Deep scratch on the rear right bumper noticed during return.',
  },
  {
    id: 'INC-2402',
    vehicle: 'Mitsubishi Montero Sport',
    plate: 'XYZ 9876',
    bookingId: '#RES-4088',
    date: 'Oct 12, 2025',
    type: 'Collision',
    severity: 'Major',
    status: 'Under Repair',
    reportedBy: 'Admin Hub',
    description: 'Front left fender collision. Vehicle currently at Quezon City Garage.',
  },
  {
    id: 'INC-2403',
    vehicle: 'Toyota Innova',
    plate: 'DEF 5678',
    bookingId: '#RES-4050',
    date: 'Sep 28, 2025',
    type: 'Mechanical Failure',
    severity: 'Critical',
    status: 'Resolved',
    reportedBy: 'Eduardo Manalo (Driver)',
    description: 'Engine overheating on highway. Towed to Hub. Radiator replaced.',
  },
];

const formatRequestTime = (timestamp) => {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const Incidents = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const { items: incidents, loading, save } = useFirestoreCollection('incidents');
  const { items: roadsideRequests, loading: roadsideLoading, save: saveRoadside } = useFirestoreCollection('roadsideAssistance');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoggingIncident, setIsLoggingIncident] = useState(false);
  const [newIncident, setNewIncident] = useState({
    vehicle: '',
    plate: '',
    bookingId: '',
    type: 'Scratch / Dent',
    severity: 'Minor',
    description: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All Severities');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  const [messageTarget, setMessageTarget] = useState(null);
  const [statusEdit, setStatusEdit] = useState('Open');

  const isSupport = currentUser?.role === 'staff' && currentUser?.staffType === 'support';
  const canMessageCustomer = isSupport || isAdmin;

  const openIncidentDetail = (inc) => {
    setSelectedIncident(inc);
    setStatusEdit(inc.status || 'Open');
  };

  const updateIncidentStatus = async (inc, status) => {
    await save({ ...inc, status });
    if (selectedIncident?.id === inc.id) {
      setSelectedIncident({ ...inc, status });
      setStatusEdit(status);
    }
  };

  const filteredIncidents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return incidents.filter((inc) => {
      const matchesSearch = !q || [
        inc.id,
        inc.plate,
        inc.bookingId,
        inc.type,
        inc.vehicle,
        inc.reportedBy,
      ].some((field) => String(field || '').toLowerCase().includes(q));

      const matchesSeverity = severityFilter === 'All Severities' || inc.severity === severityFilter;
      const matchesStatus = statusFilter === 'All Statuses' || inc.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  const openRoadside = [...roadsideRequests]
    .filter((r) => r.status === 'Open' || r.status === 'Dispatched')
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  const updateRoadsideStatus = async (request, status) => {
    await saveRoadside({ ...request, status });
  };

  const handleLogIncidentSubmit = async (e) => {
    e.preventDefault();
    const id = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    await save({
      id,
      vehicle: newIncident.vehicle || 'Unknown',
      plate: newIncident.plate || 'Unknown',
      bookingId: newIncident.bookingId || '—',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: newIncident.type,
      severity: newIncident.severity,
      status: 'Open',
      reportedBy: currentUser?.name || 'Support Staff',
      description: newIncident.description,
    });

    if (newIncident.severity === 'Major' || newIncident.severity === 'Critical') {
      await notifyAdmins({
        title: 'Major Incident Reported',
        message: `Incident ${id} (${newIncident.type}) was reported with ${newIncident.severity} severity. Please dispatch maintenance or towing.`,
        type: 'urgent',
      });
    }

    setIsLoggingIncident(false);
    setNewIncident({
      vehicle: '',
      plate: '',
      bookingId: '',
      type: 'Scratch / Dent',
      severity: 'Minor',
      description: '',
    });
  };

  return (
    <>
      <div className="fade-in">
        <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Incident Reports</h1>
          <span style={styles.counter}>{incidents.length} logs</span>
        </div>
        {!isAdmin && (
          <button type="button" style={styles.addBtn} className="btn-hover" onClick={() => setIsLoggingIncident(true)}>
            <Plus size={18} /> <span>Log New Incident</span>
          </button>
        )}
      </div>

      <div style={styles.roadsideSection}>
        <div style={styles.roadsideHeader}>
          <PhoneCall size={20} color="#C62828" />
          <h2 style={styles.roadsideTitle}>Roadside assistance requests</h2>
          <span style={styles.counter}>{openRoadside.length} open</span>
        </div>
        {roadsideLoading ? (
          <p style={styles.roadsideEmpty}>Loading requests...</p>
        ) : openRoadside.length === 0 ? (
          <p style={styles.roadsideEmpty}>No open roadside requests.</p>
        ) : (
          <div style={styles.roadsideList}>
            {openRoadside.map((req) => (
              <div key={req.id} style={styles.roadsideCard}>
                <div style={styles.roadsideCardBody}>
                  <div style={styles.roadsideCardLeft}>
                    <div style={styles.roadsideCardHeader}>
                      <h3 style={styles.roadsideIssueTitle}>{req.issueType}</h3>
                      <span style={{
                        ...styles.badge,
                        ...(req.status === 'Open' ? styles.badgeDanger : styles.badgeWarning),
                      }}
                      >
                        {req.status}
                      </span>
                      <SlaBadge request={req} />
                    </div>
                    <p style={styles.roadsideDesc}>{req.description}</p>
                    <div style={styles.roadsideLinks}>
                      {req.location?.lat != null && (
                        <a
                          href={`https://www.google.com/maps?q=${req.location.lat},${req.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.mapLink}
                        >
                          <MapPin size={14} />
                          View on map
                        </a>
                      )}
                      {req.userPhone && (
                        <a href={`tel:${req.userPhone.replace(/\D/g, '')}`} style={styles.mapLink}>
                          <PhoneCall size={14} />
                          {req.userPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={styles.roadsideCardMeta}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Customer</span>
                      <span style={styles.metaValue}>{req.userName || 'Customer'}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Vehicle</span>
                      <span style={styles.metaValue}>{req.vehicleName || '—'}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>Reported</span>
                      <span style={styles.metaValue}>{formatRequestTime(req.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div style={styles.roadsideCardFooter}>
                  {canMessageCustomer && (
                    <button
                      type="button"
                      style={{
                        ...styles.roadsideBtnOutline,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        marginRight: req.status !== 'Resolved' ? 'auto' : undefined,
                      }}
                      onClick={() => setMessageTarget(req)}
                    >
                      <MessageSquare size={16} />
                      {req.status === 'Resolved' ? 'View chat' : 'Message customer'}
                    </button>
                  )}
                  {req.status !== 'Resolved' && (
                    <>
                      <button
                        type="button"
                        style={styles.roadsideBtnOutline}
                        onClick={() => updateRoadsideStatus(req, 'Resolved')}
                      >
                        Resolve
                      </button>
                      {req.status === 'Open' && (
                        <button
                          type="button"
                          style={styles.roadsideBtnPrimary}
                          onClick={() => updateRoadsideStatus(req, 'Dispatched')}
                        >
                          Mark dispatched
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBar}>
          <Search size={18} color="#888" />
          <input
            type="text"
            placeholder="Search by Plate, Booking ID, or type..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={styles.filterGroup}>
          <select
            style={styles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option>All Severities</option>
            <option>Minor</option>
            <option>Major</option>
            <option>Critical</option>
          </select>
          <select
            style={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Statuses</option>
            <option>Open</option>
            <option>Under Repair</option>
            <option>Resolved</option>
          </select>
        </div>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <p style={styles.tableEmpty}>Loading incident logs...</p>
        ) : filteredIncidents.length === 0 ? (
          <div style={styles.tableEmpty}>
            <AlertTriangle size={40} color="#D1D5DB" strokeWidth={1.5} />
            <p style={styles.tableEmptyTitle}>No incident logs found</p>
            <p style={styles.tableEmptyDesc}>
              {incidents.length === 0
                ? 'Log a new incident to start tracking damage and repairs.'
                : 'No incident logs found matching your filters.'}
            </p>
          </div>
        ) : (
        <div style={styles.tableScroll} className="table-scroll">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID & Date</th>
                <th>Vehicle & Booking</th>
                <th>Incident Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => openIncidentDetail(inc)}>
                  <td>
                    <div style={styles.primaryText}>{inc.id}</div>
                    <div style={styles.secondaryText}>{inc.date}</div>
                  </td>
                  <td>
                    <div style={styles.primaryText}>{inc.vehicle} ({inc.plate})</div>
                    <div style={styles.secondaryText}>Ref: {inc.bookingId}</div>
                  </td>
                  <td style={styles.primaryText}>{inc.type}</td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      ...(inc.severity === 'Minor' ? styles.badgeInfo : 
                          inc.severity === 'Major' ? styles.badgeWarning : styles.badgeDanger)
                    }}>
                      {inc.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      ...(inc.status === 'Open' ? styles.badgeDanger : 
                          inc.status === 'Under Repair' ? styles.badgeWarning : styles.badgeSuccess)
                    }}>
                      {inc.status}
                    </span>
                  </td>
                  <td style={styles.actionCell}>
                    <div style={styles.actionCellInner}>
                      <button
                        type="button"
                        className="incident-row-menu-btn"
                        style={styles.iconBtn}
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === inc.id ? null : inc.id); }}
                        aria-label="Row actions"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {activeDropdown === inc.id && (
                        <div style={styles.dropdownMenu} className="fade-in">
                          <button style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); openIncidentDetail(inc); setActiveDropdown(null); }}>View Details</button>
                          <button
                            style={styles.dropdownItem}
                            onClick={async (e) => {
                              e.stopPropagation();
                              setActiveDropdown(null);
                              const next = inc.status === 'Open' ? 'Under Repair' : inc.status === 'Under Repair' ? 'Resolved' : 'Open';
                              await updateIncidentStatus(inc, next);
                            }}
                          >
                            Cycle status
                          </button>
                          {isAdmin && inc.status === 'Open' && (
                            <button
                              style={{ ...styles.dropdownItem, color: '#C62828', fontWeight: 600 }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                await save({ ...inc, status: 'Under Repair' });
                                alert(`Maintenance/Towing team dispatched for ${inc.id}`);
                              }}
                            >
                              Dispatch Team
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      </div>

      {isLoggingIncident && (
        <div style={styles.modalOverlay} onClick={() => setIsLoggingIncident(false)}>
          <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Log New Incident</h2>
            </div>
            <form onSubmit={handleLogIncidentSubmit}>
              <div style={styles.modalContent}>
                <div style={styles.detailRow}>
                  <div style={styles.detailCol}>
                    <label style={styles.label}>Vehicle Model</label>
                    <input required style={styles.input} placeholder="e.g. Toyota Vios" value={newIncident.vehicle} onChange={(e) => setNewIncident({...newIncident, vehicle: e.target.value})} />
                  </div>
                  <div style={styles.detailCol}>
                    <label style={styles.label}>Plate Number</label>
                    <input required style={styles.input} placeholder="e.g. ABC 1234" value={newIncident.plate} onChange={(e) => setNewIncident({...newIncident, plate: e.target.value})} />
                  </div>
                </div>

                <div style={styles.detailRow}>
                  <div style={styles.detailCol}>
                    <label style={styles.label}>Booking ID (Optional)</label>
                    <input style={styles.input} placeholder="e.g. #RES-4092" value={newIncident.bookingId} onChange={(e) => setNewIncident({...newIncident, bookingId: e.target.value})} />
                  </div>
                  <div style={styles.detailCol}>
                    <label style={styles.label}>Type</label>
                    <select style={styles.input} value={newIncident.type} onChange={(e) => setNewIncident({...newIncident, type: e.target.value})}>
                      <option>Scratch / Dent</option>
                      <option>Collision</option>
                      <option>Mechanical Failure</option>
                      <option>Tire Puncture</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                
                <div style={styles.detailRow}>
                  <div style={styles.detailCol}>
                    <label style={styles.label}>Severity</label>
                    <select style={styles.input} value={newIncident.severity} onChange={(e) => setNewIncident({...newIncident, severity: e.target.value})}>
                      <option>Minor</option>
                      <option>Major</option>
                      <option>Critical</option>
                    </select>
                  </div>
                  <div style={styles.detailCol}>
                  </div>
                </div>

                <div style={{ ...styles.detailCol, marginBottom: '1.5rem' }}>
                  <label style={styles.label}>Description</label>
                  <textarea required style={{...styles.input, minHeight: '80px', resize: 'vertical'}} placeholder="Describe the incident..." value={newIncident.description} onChange={(e) => setNewIncident({...newIncident, description: e.target.value})} />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" style={styles.btnSecondary} onClick={() => setIsLoggingIncident(false)}>Cancel</button>
                <button type="submit" style={styles.btnPrimary}>Submit Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {messageTarget && (
        <div style={styles.modalOverlay} onClick={() => setMessageTarget(null)}>
          <div style={{ ...styles.modal, maxWidth: '600px', padding: 0 }} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <IncidentChat request={messageTarget} currentUser={currentUser} isSupport={canMessageCustomer} onClose={() => setMessageTarget(null)} />
          </div>
        </div>
      )}

      {selectedIncident && (
        <div style={styles.modalOverlay} onClick={() => setSelectedIncident(null)}>
          <div style={styles.modal} className="fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Incident Details - {selectedIncident.id}</h2>
            </div>
            <div style={styles.modalContent}>
              <div style={styles.detailRow}>
                <div style={styles.detailCol}>
                  <label style={styles.label}>Vehicle</label>
                  <p style={styles.value}>{selectedIncident.vehicle} ({selectedIncident.plate})</p>
                </div>
                <div style={styles.detailCol}>
                  <label style={styles.label}>Related Booking</label>
                  <p style={{...styles.value, fontFamily: 'monospace', color: '#0033FF'}}>{selectedIncident.bookingId}</p>
                </div>
              </div>

              <div style={styles.detailRow}>
                <div style={styles.detailCol}>
                  <label style={styles.label}>Reported By</label>
                  <p style={styles.value}>{selectedIncident.reportedBy}</p>
                </div>
                <div style={styles.detailCol}>
                  <label style={styles.label}>Date Reported</label>
                  <p style={styles.value}>{selectedIncident.date}</p>
                </div>
              </div>

              <div style={{ ...styles.detailCol, marginBottom: '1.5rem' }}>
                <label style={styles.label}>Description of Damage/Incident</label>
                <div style={styles.descBox}>{selectedIncident.description}</div>
              </div>

              <div style={styles.detailCol}>
                <label style={styles.label}>Status</label>
                <select
                  className="location-field location-field-select"
                  value={statusEdit}
                  onChange={(e) => setStatusEdit(e.target.value)}
                >
                  <option>Open</option>
                  <option>Under Repair</option>
                  <option>Resolved</option>
                </select>
              </div>

              <div style={styles.detailCol}>
                <label style={styles.label}>Photographic evidence</label>
                <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
                  Photo uploads coming soon. Add details in the description when logging the incident.
                </p>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnSecondary} onClick={() => setSelectedIncident(null)}>Close</button>
              <button
                type="button"
                style={styles.btnPrimary}
                onClick={async () => {
                  await updateIncidentStatus(selectedIncident, statusEdit);
                  setSelectedIncident(null);
                }}
              >
                Save status
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  counter: { fontSize: '0.9rem', color: '#888' },
  addBtn: { backgroundColor: 'var(--text-color)', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500, transition: 'var(--transition)', border: 'none', cursor: 'pointer' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', width: '100%', flexWrap: 'wrap' },
  searchBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: '1 1 0', minWidth: '200px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--font-primary)', width: '100%', minWidth: 0 },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: 'auto' },
  filterSelect: { padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', backgroundColor: '#FFF', cursor: 'pointer', whiteSpace: 'nowrap' },
  tableEmpty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', gap: '0.75rem' },
  tableEmptyTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#111', margin: 0 },
  tableEmptyDesc: { fontSize: '0.9rem', color: '#888', margin: 0, maxWidth: '360px' },
  tableContainer: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' },
  tableScroll: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  primaryText: { fontWeight: 600, fontSize: '0.95rem', color: '#111' },
  secondaryText: { fontSize: '0.85rem', color: '#888', marginTop: '0.2rem' },
  badge: { padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeInfo: { backgroundColor: '#E3F2FD', color: '#1565C0' },
  badgeWarning: { backgroundColor: '#FFF8E1', color: '#F57F17' },
  badgeDanger: { backgroundColor: '#FFEBEE', color: '#C62828' },
  badgeSuccess: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  actionCell: { textAlign: 'right', padding: '1rem 1.5rem', verticalAlign: 'middle', width: '56px' },
  actionCellInner: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minHeight: '48px' },
  iconBtn: { color: '#888', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', right: '2rem', top: '50%', backgroundColor: '#FFF', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '160px', overflow: 'hidden' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', width: '100%', textAlign: 'left', fontSize: '0.85rem', color: '#333', cursor: 'pointer', borderBottom: '1px solid #F0F0F0' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: '#FFF', width: '100%', maxWidth: '600px', borderRadius: '12px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)', zIndex: 201, overflow: 'hidden' },
  modalHeader: { padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#FAFAFA' },
  modalTitle: { fontSize: '1.25rem', fontWeight: 600 },
  modalContent: { padding: '2rem' },
  detailRow: { display: 'flex', gap: '2rem', marginBottom: '1.5rem' },
  detailCol: { flex: 1 },
  label: { fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' },
  value: { fontSize: '1rem', fontWeight: 500, color: '#111' },
  descBox: { backgroundColor: '#F5F5F7', padding: '1rem', borderRadius: '8px', fontSize: '0.95rem', color: '#333', lineHeight: 1.5 },
  photoGrid: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  photoPlaceholder: { width: '100px', height: '100px', backgroundColor: '#F5F5F7', borderRadius: '8px', border: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderAdd: { width: '100px', height: '100px', backgroundColor: '#FFF', borderRadius: '8px', border: '1px dashed #0033FF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  modalFooter: { padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' },
  btnSecondary: { backgroundColor: '#FFF', color: 'var(--text-color)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 500, cursor: 'pointer' },
  btnPrimary: { backgroundColor: '#0033FF', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer' },
  input: { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.9rem', backgroundColor: '#FFF', boxSizing: 'border-box' },
  roadsideSection: { marginBottom: '2rem', backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' },
  roadsideHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  roadsideTitle: { fontSize: '1.1rem', fontWeight: 600, margin: 0, flex: 1 },
  roadsideEmpty: { color: '#888', fontSize: '0.9rem', margin: 0 },
  roadsideList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  roadsideCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.25rem 1.5rem 1.5rem',
    border: '1px solid #E8E8E8',
    borderRadius: '10px',
    backgroundColor: '#FAFAFA',
  },
  roadsideCardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  roadsideCardLeft: { flex: 1, minWidth: '220px' },
  roadsideCardHeader: { display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.65rem' },
  roadsideIssueTitle: { fontSize: '1.05rem', fontWeight: 600, color: '#111', margin: 0 },
  roadsideDesc: { fontSize: '0.9rem', color: '#444', margin: '0 0 0.75rem', lineHeight: 1.55, maxWidth: '520px' },
  roadsideLinks: { display: 'flex', flexWrap: 'wrap', gap: '1rem' },
  mapLink: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: '#0033FF', textDecoration: 'none' },
  roadsideCardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
    minWidth: '160px',
    paddingLeft: '1.5rem',
    borderLeft: '1px solid #E8E8E8',
  },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  metaLabel: { fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metaValue: { fontSize: '0.9rem', fontWeight: 500, color: '#111' },
  roadsideCardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 0 0',
    marginTop: '0.25rem',
    borderTop: '1px solid #EEEEEE',
  },
  roadsideBtnPrimary: {
    backgroundColor: '#0033FF',
    color: '#FFF',
    border: '1px solid #0033FF',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    height: '36px',
    whiteSpace: 'nowrap',
  },
  roadsideBtnOutline: {
    backgroundColor: '#FFF',
    color: '#333',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    height: '36px',
    whiteSpace: 'nowrap',
  },
};

export default Incidents;
