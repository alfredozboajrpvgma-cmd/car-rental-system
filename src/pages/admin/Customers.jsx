import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight, X, ShieldCheck, ShieldAlert, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { fetchAllBookings, fetchAllUsers, aggregateCustomerStats } from '../../utils/analytics';
import { createNotification } from '../../utils/notifications';
import { useAdminSearch } from '../../contexts/AdminSearchContext';

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { query: adminSearchQuery } = useAdminSearch();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const [users, bookings] = await Promise.all([fetchAllUsers(), fetchAllBookings()]);
      setCustomers(aggregateCustomerStats(users, bookings));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const verifyCustomer = async (customer) => {
    if (!customer.licenseUrl) return;
    try {
      await updateDoc(doc(db, 'users', customer.id), { verified: true });
      await createNotification({
        userId: customer.id,
        title: 'License verified',
        message: 'Your driver\'s license has been verified. You\'re cleared for pickup.',
        link: '/customer/profile',
        type: 'verification',
      });
      await loadCustomers();
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...customer, verified: true });
      }
    } catch (err) {
      console.error(err);
    }
    setActiveDropdown(null);
  };

  const viewBookingHistory = (customer) => {
    setSelectedCustomer(null);
    setActiveDropdown(null);
    navigate('/admin/reservations', {
      state: {
        customerFilter: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      },
    });
  };

  const filtered = customers
    .filter((c) => {
      if (filter === 'verified') return c.verified;
      if (filter === 'unverified') return !c.verified;
      return true;
    })
    .filter((c) => {
      const combined = `${searchQuery || ''} ${adminSearchQuery || ''}`.trim().toLowerCase();
      if (!combined) return true;
      return (
        c.name.toLowerCase().includes(combined)
        || c.email.toLowerCase().includes(combined)
        || String(c.id || '').toLowerCase().includes(combined)
      );
    });

  useEffect(() => {
    setPage(0);
  }, [searchQuery, adminSearchQuery, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <>
      <div className="fade-in">
        <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Customers</h1>
          <span style={styles.counter}>{customers.length} registered</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{customers.length}</div>
          <div style={styles.summaryLabel}>Total Customers</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{customers.filter(c => c.verified).length}</div>
          <div style={styles.summaryLabel}>Verified</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{customers.filter(c => !c.verified).length}</div>
          <div style={styles.summaryLabel}>Pending Verification</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>₱{(customers.reduce((acc, c) => acc + c.totalSpent, 0) / 1000).toFixed(0)}k</div>
          <div style={styles.summaryLabel}>Lifetime Revenue</div>
        </div>
      </div>

      {/* Search */}
      <div style={styles.toolbar}>
        <div style={styles.searchBar}>
          <Search size={18} color="#888" />
          <input type="text" placeholder="Search by name, email, or ID..." style={styles.searchInput} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select style={styles.filterSelect} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Customers</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Location</th>
                <th>Bookings</th>
                <th style={{ textAlign: 'right' }}>Total Spent</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading customers...</td></tr>}
              {!loading && paged.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCustomer(c)}>
                  <td>
                    <div style={styles.customerCell}>
                      <div style={styles.avatar}>{c.avatar}</div>
                      <div>
                        <div style={styles.primaryText}>{c.name}</div>
                        <div style={styles.secondaryText}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.secondaryText}>{c.location}</td>
                  <td>
                    <span style={styles.bookingCount}>{c.totalBookings}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>₱{c.totalSpent.toLocaleString()}</td>
                  <td>
                    {c.verified ? (
                      <span style={styles.verifiedBadge}><ShieldCheck size={14} /> Verified</span>
                    ) : (
                      <span style={styles.unverifiedBadge}><ShieldAlert size={14} /> Unverified</span>
                    )}
                  </td>
                  <td style={styles.secondaryText}>{c.joinDate}</td>
                  <td style={styles.actionCell}>
                    <div style={{ position: 'relative' }}>
                      <button style={styles.iconBtn} onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === c.id ? null : c.id); }}>
                        <MoreHorizontal size={18} />
                      </button>
                      {activeDropdown === c.id && (
                        <div style={styles.dropdownMenu} className="fade-in">
                          <button style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); setActiveDropdown(null); }}>View Profile</button>
                          {!c.verified && c.licenseUrl && (
                            <button style={{ ...styles.dropdownItem, color: '#2E7D32' }} onClick={(e) => { e.stopPropagation(); verifyCustomer(c); }}>
                              Verify License
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

        <div style={styles.pagination}>
          <div style={styles.pageInfo}>
            Showing <strong>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)}</strong> of{' '}
            <strong>{filtered.length}</strong> customers
          </div>
          <div style={styles.pageControls}>
            <button
              type="button"
              style={styles.pageBtn}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              style={styles.pageBtn}
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Customer Detail Slide-over */}
      {selectedCustomer && (
        <>
          <div style={styles.modalOverlay} onClick={() => setSelectedCustomer(null)}></div>
          <div style={styles.slideOver} className="slide-in">
            <div style={styles.slideHeader}>
              <h2 style={styles.slideTitle}>Customer Profile</h2>
              <button style={styles.closeBtn} onClick={() => setSelectedCustomer(null)}><X size={24} /></button>
            </div>
            <div style={styles.slideContent}>
              <div style={styles.profileHeader}>
                <div style={styles.profileAvatar}>{selectedCustomer.avatar}</div>
                <div>
                  <h3 style={styles.profileName}>{selectedCustomer.name}</h3>
                  <div style={styles.profileId}>{selectedCustomer.id}</div>
                </div>
                {selectedCustomer.verified ? (
                  <span style={styles.verifiedBadge}><ShieldCheck size={14} /> Verified</span>
                ) : (
                  <span style={styles.unverifiedBadge}><ShieldAlert size={14} /> Unverified</span>
                )}
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Contact Information</h4>
                <div style={styles.infoRow}><Mail size={16} color="#888" /> {selectedCustomer.email}</div>
                <div style={styles.infoRow}><Phone size={16} color="#888" /> {selectedCustomer.phone}</div>
                <div style={styles.infoRow}><MapPin size={16} color="#888" /> {selectedCustomer.location}</div>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Rental Activity</h4>
                <div style={styles.activityGrid}>
                  <div style={styles.activityCard}>
                    <div style={styles.activityValue}>{selectedCustomer.totalBookings}</div>
                    <div style={styles.activityLabel}>Total Bookings</div>
                  </div>
                  <div style={styles.activityCard}>
                    <div style={styles.activityValue}>₱{selectedCustomer.totalSpent.toLocaleString()}</div>
                    <div style={styles.activityLabel}>Total Spent</div>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Driver's License</h4>
                {selectedCustomer.licenseUrl ? (
                  <a
                    href={selectedCustomer.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.licenseLink}
                  >
                    <FileText size={18} />
                    View license: {selectedCustomer.licenseName || 'document'}
                  </a>
                ) : (
                  <div style={styles.licensePlaceholder}>
                    <span style={{ color: '#888' }}>Document not uploaded</span>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.slideFooter}>
              {!selectedCustomer.verified && selectedCustomer.licenseUrl && (
                <button
                  type="button"
                  style={styles.btnSuccess}
                  onClick={() => verifyCustomer(selectedCustomer)}
                >
                  <ShieldCheck size={18} /> Verify License
                </button>
              )}
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={() => viewBookingHistory(selectedCustomer)}
              >
                View Booking History
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const styles = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  titleArea: { display: 'flex', alignItems: 'baseline', gap: '1rem' },
  pageTitle: { fontSize: '2rem', fontWeight: 600, color: '#111' },
  counter: { fontSize: '0.9rem', color: '#888' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' },
  summaryCard: { backgroundColor: '#FFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  summaryValue: { fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem' },
  summaryLabel: { color: '#666', fontSize: '0.85rem' },
  toolbar: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  searchBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#FFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1, maxWidth: '400px' },
  searchInput: { border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'var(--font-primary)', width: '100%' },
  filterSelect: { padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', backgroundColor: '#FFF', cursor: 'pointer' },
  tableContainer: { backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', minHeight: '400px' },
  tableScroll: { overflowX: 'auto', flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' },
  customerCell: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#111', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 },
  primaryText: { fontWeight: 600, fontSize: '0.95rem', color: '#111' },
  secondaryText: { fontSize: '0.8rem', color: '#888', marginTop: '0.1rem' },
  bookingCount: { fontFamily: 'monospace', fontWeight: 600, fontSize: '0.95rem' },
  verifiedBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#E8F5E9', color: '#2E7D32' },
  unverifiedBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#FFF8E1', color: '#F57F17' },
  actionCell: { textAlign: 'right', paddingRight: '1.5rem' },
  iconBtn: { color: '#888', padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer' },
  dropdownMenu: { position: 'absolute', right: '2rem', top: '50%', backgroundColor: '#FFF', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '160px', overflow: 'hidden' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', border: 'none', background: 'none', width: '100%', textAlign: 'left', fontSize: '0.85rem', color: '#333', cursor: 'pointer', borderBottom: '1px solid #F0F0F0' },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#FAFAFA', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
  pageInfo: { fontSize: '0.85rem', color: '#666' },
  pageControls: { display: 'flex', gap: '0.5rem' },
  pageBtn: { display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFF', fontSize: '0.85rem', cursor: 'pointer', color: '#333' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 200 },
  slideOver: { position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '500px', height: '100vh', backgroundColor: '#FFF', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' },
  slideHeader: { padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  slideTitle: { fontSize: '1.5rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888' },
  slideContent: { flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  profileAvatar: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#111', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 600 },
  profileName: { fontSize: '1.25rem', fontWeight: 600 },
  profileId: { fontSize: '0.8rem', color: '#888', fontFamily: 'monospace' },
  detailSection: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  detailTitle: { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#888', marginBottom: '0.25rem' },
  infoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' },
  activityGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  activityCard: { backgroundColor: '#F5F5F7', padding: '1.25rem', borderRadius: '8px' },
  activityValue: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' },
  activityLabel: { fontSize: '0.8rem', color: '#666' },
  licensePlaceholder: { width: '100%', height: '120px', backgroundColor: '#F5F5F7', border: '1px dashed #ccc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  licenseLink: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0033FF', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none' },
  slideFooter: { padding: '2rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#FAFAFA', display: 'flex', gap: '1rem', justifyContent: 'flex-end' },
  btnSuccess: { backgroundColor: '#2E7D32', color: '#FFF', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  btnSecondary: { backgroundColor: '#FFF', color: 'var(--text-color)', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 500, cursor: 'pointer' },
};

export default Customers;
