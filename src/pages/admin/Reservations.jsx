import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Search, Calendar, ChevronLeft, ChevronRight, X, Check, ArrowRight, Play, CheckCircle } from 'lucide-react';

import { collection, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  formatBookingDateRange,
  releaseVehicleForCompletedBooking,
  TERMINAL_BOOKING_STATUSES,
} from '../../utils/bookings';
import { releaseDriverAfterBookingById } from '../../utils/driverDutySync';
import { fetchAllBookings, updateBooking } from '../../utils/supabaseBookings';
import { canGenerateReceipt, downloadBookingReceipt, printBookingReceipt } from '../../utils/receipt';
import { applyPickupScheduleOnApprove, markBookingNoShow } from '../../utils/noShow';
import { formatPickupWindow, usesPickupGracePeriod } from '../../utils/pickupPolicy';
import PickupGraceCountdown from '../../components/PickupGraceCountdown';
import DriverTrackingPanel from '../../components/DriverTrackingPanel';
import { getRentalModeLabel, isWithDriverRentalMode } from '../../utils/rentalMode';
import { buildWithDriverApprovalFields } from '../../utils/withDriverDispatch';
import { findUserIdByDriverId, notifyDriverUser } from '../../utils/notifications';
import { useAdminSearch } from '../../contexts/AdminSearchContext';

const tabs = ['All', 'Pending', 'Approved', 'Active', 'Completed', 'Cancelled', 'No-Show'];

const Reservations = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const customerFilter = location.state?.customerFilter ?? null;
  const [activeTab, setActiveTab] = useState('All');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const { query: adminSearchQuery } = useAdminSearch();
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleReceipt = async (booking, action) => {
    setReceiptLoading(true);
    try {
      if (action === 'print') {
        await printBookingReceipt(booking);
      } else {
        await downloadBookingReceipt(booking);
      }
    } catch (err) {
      console.error(err);
      alert('Could not generate receipt.');
    } finally {
      setReceiptLoading(false);
    }
  };

  React.useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const rows = await fetchAllBookings();
      const fetched = rows.map((data) => ({
        docId: data.docId,
        id: `#${data.docId.slice(0, 8).toUpperCase()}`,
        userId: data.userId,
        vehicleId: data.vehicleId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        vehicleName: data.vehicleName,
        plate: data.plate,
        location: data.location,
        dateRange: formatBookingDateRange(data.startDate, data.endDate),
        days: `${data.days} Day${data.days > 1 ? 's' : ''}`,
        total: data.total,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        pickupWindowStart: data.pickupWindowStart,
        pickupWindowEnd: data.pickupWindowEnd,
        gracePeriodEndsAt: data.gracePeriodEndsAt,
        rentalMode: data.rentalMode,
        driverId: data.driverId,
        driverName: data.driverName,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        hubName: data.hubName,
        hubLat: data.hubLat,
        hubLng: data.hubLng,
        estimatedArrivalMinutes: data.estimatedArrivalMinutes,
        estimatedArrivalAt: data.estimatedArrivalAt,
        paymentStatus: data.paymentStatus || 'Unpaid',
        paymentMethod: data.paymentMethod || '',
        paidAt: data.paidAt || null,
      }));
      setReservations(fetched);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const releaseBookingResources = async (booking, newStatus) => {
    if (!TERMINAL_BOOKING_STATUSES.includes(newStatus)) return;

    if (booking.vehicleId && newStatus !== 'No-Show') {
      try {
        await releaseVehicleForCompletedBooking(booking.vehicleId);
      } catch (syncErr) {
        console.error('Vehicle status sync failed:', syncErr);
        if (newStatus === 'Completed') {
          alert(
            'Booking was updated, but the fleet record could not be synced. '
            + 'Check Firestore permissions or update the vehicle in Fleet.'
          );
        }
      }
    }

    if (booking.driverId) {
      try {
        await releaseDriverAfterBookingById(booking.driverId, booking.docId, {
          incrementCompleted: newStatus === 'Completed',
        });
      } catch (driverErr) {
        console.error('Driver release failed:', driverErr);
      }
    }
  };

  const updateStatus = async (booking, newStatus) => {
    try {
      if (newStatus === 'No-Show') {
        await markBookingNoShow(booking);
      } else {
        const payload = { status: newStatus };
        if (newStatus === 'Approved' && booking.startDate?.toDate) {
          Object.assign(
            payload,
            applyPickupScheduleOnApprove(booking, booking.startDate.toDate()),
            buildWithDriverApprovalFields(booking)
          );
        }
        await updateBooking(booking.docId, payload);
      }

      await releaseBookingResources(booking, newStatus);
      if (booking.userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: booking.userId,
          title: `Booking ${newStatus}`,
          message: `Your reservation for ${booking.vehicleName} is now ${newStatus}.`,
          link: '/customer/bookings',
          read: false,
          createdAt: Timestamp.fromDate(new Date()),
        });
      }
      if (
        newStatus === 'Approved'
        && booking.driverId
        && isWithDriverRentalMode(booking.rentalMode)
      ) {
        try {
          const driverUserId = await findUserIdByDriverId(booking.driverId);
          if (driverUserId) {
            await notifyDriverUser({
              userId: driverUserId,
              title: 'Trip approved — ready to start',
              message: `${booking.vehicleName} is approved. Open the trip when you are en route.`,
              link: `/driver/trips/${booking.docId}`,
              type: 'booking_approved',
            });
          }
        } catch (notifyErr) {
          console.warn('Driver approval notification skipped:', notifyErr);
        }
      }
      fetchReservations();
      if (selectedBooking?.docId === booking.docId) {
        setSelectedBooking((prev) => ({ ...prev, status: newStatus }));
      }
      setActiveDropdown(null);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const updatePayment = async (booking, paymentStatus, paymentMethod = '') => {
    try {
      const updates = {
        paymentStatus,
        paymentMethod: paymentMethod || '',
        paidAt: paymentStatus === 'Paid' ? new Date() : null,
      };
      await updateBooking(booking.docId, updates);
      fetchReservations();
      if (selectedBooking?.docId === booking.docId) {
        setSelectedBooking((prev) => ({ ...prev, ...updates }));
      }
      setActiveDropdown(null);
    } catch (err) {
      console.error('Failed to update payment:', err);
      alert('Could not update payment status. Please try again.');
    }
  };

  // Filter logic
  const customerBookings = customerFilter
    ? reservations.filter((r) => r.userId === customerFilter.id)
    : reservations;

  const tabCounts = useMemo(() => {
    const counts = { All: customerBookings.length };
    tabs.slice(1).forEach((tab) => {
      counts[tab] = customerBookings.filter((r) => r.status === tab).length;
    });
    return counts;
  }, [customerBookings]);

  const filteredData = activeTab === 'All'
    ? customerBookings
    : customerBookings.filter((r) => r.status === activeTab);

  const searchedData = useMemo(() => {
    const q = (adminSearchQuery || '').trim().toLowerCase();
    if (!q) return filteredData;
    return filteredData.filter((r) =>
      [
        r.id,
        r.docId,
        r.customerName,
        r.customerEmail,
        r.vehicleName,
        r.plate,
        r.location,
        r.status,
      ].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [filteredData, adminSearchQuery]);

  React.useEffect(() => {
    setPage(0);
  }, [activeTab, adminSearchQuery, customerFilter?.id]);

  const totalPages = Math.max(1, Math.ceil(searchedData.length / pageSize));
  const pagedData = searchedData.slice(page * pageSize, page * pageSize + pageSize);

  const clearCustomerFilter = () => {
    navigate('/admin/reservations', { replace: true, state: null });
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const openDetails = async (booking) => {
    setActiveDropdown(null);
    let licenseUrl = null;
    let licenseName = '';
    if (booking.userId) {
      try {
        const userSnap = await getDoc(doc(db, 'users', booking.userId));
        if (userSnap.exists()) {
          licenseUrl = userSnap.data().licenseUrl || null;
          licenseName = userSnap.data().licenseName || '';
        }
      } catch (err) {
        console.error('Could not load license:', err);
      }
    }
    setSelectedBooking({ ...booking, licenseUrl, licenseName });
  };

  const closeDetails = () => {
    setSelectedBooking(null);
  };

  return (
    <>
      <div className="fade-in">
        <div style={styles.pageHeader}>
        <div style={styles.titleArea}>
          <h1 style={styles.pageTitle}>Reservations</h1>
          <span style={styles.counter}>
            {activeTab === 'All'
              ? `${searchedData.length} total bookings`
              : `${searchedData.length} ${activeTab.toLowerCase()} booking${searchedData.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {customerFilter && (
        <div style={styles.customerFilterBanner}>
          <span>
            Showing bookings for <strong>{customerFilter.name}</strong>
            {customerFilter.email ? ` (${customerFilter.email})` : ''}
          </span>
          <button type="button" style={styles.clearFilterBtn} onClick={clearCustomerFilter}>
            Clear filter
          </button>
        </div>
      )}

      <div style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab !== 'All' && (
              <span style={styles.tabCount}>{tabCounts[tab] ?? 0}</span>
            )}
          </button>
        ))}
      </div>

      <div style={styles.tableContainer}>
        {searchedData.length === 0 ? (
          <div style={styles.emptyState} className="fade-in">
            <div style={styles.emptyIconWrapper}><Calendar size={48} color="#ccc" /></div>
            <h3 style={styles.emptyTitle}>No reservations found</h3>
            <p style={styles.emptySubtitle}>
              {customerFilter
                ? `${customerFilter.name} has no bookings yet.`
                : 'When customers book a vehicle, their rental details will appear here.'}
            </p>
          </div>
        ) : (
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Duration</th>
                  <th style={{textAlign: 'right'}}>Total Payment</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan="8" style={{textAlign: 'center', padding: '2rem'}}>Loading reservations...</td></tr>}
                {!loading && pagedData.map((res) => (
                  <tr key={res.docId}>
                    <td style={styles.idCell}>{res.id}</td>
                    <td>
                      <div style={styles.primaryText}>{res.customerName}</div>
                      <div style={styles.secondaryText}>{res.customerEmail}</div>
                    </td>
                    <td>
                      <div style={styles.primaryText}>{res.vehicleName}</div>
                      <div style={styles.secondaryText}>Plate: {res.plate} · {getRentalModeLabel(res.rentalMode)}</div>
                    </td>
                    <td>
                      <div style={styles.primaryText}>{res.dateRange}</div>
                      <div style={styles.secondaryText}>{res.days}</div>
                    </td>
                    <td style={{...styles.monoCell, textAlign: 'right', fontWeight: 600}}>₱{res.total.toLocaleString()}</td>
                    <td>
                      <span style={{
                        ...styles.badge,
                        ...(res.paymentStatus === 'Paid' ? styles.badgeSuccess : styles.badgeWarning),
                      }}>
                        {res.paymentStatus || 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        ...styles.badge,
                        ...(res.status === 'Pending' ? styles.badgeWarning : 
                            res.status === 'Approved' ? styles.badgeInfo : 
                            res.status === 'Active' ? styles.badgeSuccess : 
                            res.status === 'No-Show' ? styles.badgeDanger :
                            res.status === 'Cancelled' ? styles.badgeDanger :
                            styles.badgeNeutral)
                      }}>
                        {res.status}
                      </span>
                    </td>
                    <td style={styles.actionCell}>
                      <div style={{ position: 'relative' }}>
                        <button style={styles.iconBtn} onClick={() => toggleDropdown(res.docId)}>
                          <MoreHorizontal size={18} />
                        </button>
                        
                        {activeDropdown === res.docId && (
                          <div style={styles.dropdownMenu} className="fade-in">
                            <button style={styles.dropdownItem} onClick={() => openDetails(res)}>View Details</button>
                            {res.paymentStatus !== 'Paid' && (
                              <button style={{...styles.dropdownItem, color: '#2E7D32'}} onClick={() => updatePayment(res, 'Paid', 'Manual')}>
                                Mark Paid
                              </button>
                            )}
                            {res.paymentStatus === 'Paid' && (
                              <button style={{...styles.dropdownItem, color: '#AD1457'}} onClick={() => updatePayment(res, 'Unpaid', '')}>
                                Mark Unpaid
                              </button>
                            )}
                            {res.status === 'Pending' && <button style={{...styles.dropdownItem, color: '#2E7D32'}} onClick={() => updateStatus(res, 'Approved')}>Approve</button>}
                            {res.status === 'Pending' && <button style={{...styles.dropdownItem, color: '#C62828'}} onClick={() => updateStatus(res, 'Cancelled')}>Reject</button>}
                            {res.status === 'Approved' && <button style={{...styles.dropdownItem, color: '#1565C0'}} onClick={() => updateStatus(res, 'Active')}>Mark Picked Up</button>}
                            {res.status === 'Approved' && (
                              <button style={{...styles.dropdownItem, color: '#C62828'}} onClick={() => updateStatus(res, 'Cancelled')}>Cancel booking</button>
                            )}
                            {res.status === 'Approved' && usesPickupGracePeriod(res) && (
                              <button style={{...styles.dropdownItem, color: '#AD1457'}} onClick={() => updateStatus(res, 'No-Show')}>Mark No-Show</button>
                            )}
                            {res.status === 'Active' && <button style={{...styles.dropdownItem, color: '#2E7D32'}} onClick={() => updateStatus(res, 'Completed')}>Mark Returned</button>}
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
        
        {/* Pagination */}
        {searchedData.length > 0 && (
          <div style={styles.pagination}>
            <div style={styles.pageInfo}>
              Showing <strong>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, searchedData.length)}</strong> of{' '}
              <strong>{searchedData.length}</strong> bookings
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
        )}
      </div>

      </div>

      {/* Slide-over Modal for Details */}
      {selectedBooking && (
        <>
          <div style={styles.modalOverlay} onClick={closeDetails}></div>
          <div style={styles.slideOver} className="slide-in">
            <div style={styles.slideHeader}>
              <h2 style={styles.slideTitle}>Booking {selectedBooking.id}</h2>
              <button style={styles.closeBtn} onClick={closeDetails}><X size={24} /></button>
            </div>
            <div style={styles.slideContent}>
              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Customer Details</h4>
                <p><strong>Name:</strong> {selectedBooking.customerName}</p>
                <p><strong>Contact:</strong> {selectedBooking.customerEmail}</p>
                {selectedBooking.licenseUrl ? (
                  <a href={selectedBooking.licenseUrl} target="_blank" rel="noreferrer" style={styles.licenseLink}>
                    View license: {selectedBooking.licenseName || 'document'}
                  </a>
                ) : (
                  <div style={styles.licensePlaceholder}>
                    <span style={{ color: '#888' }}>No license uploaded yet</span>
                  </div>
                )}
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Vehicle Details</h4>
                <p><strong>Model:</strong> {selectedBooking.vehicleName}</p>
                <p><strong>Plate No:</strong> {selectedBooking.plate}</p>
                <p><strong>Rental Type:</strong> {getRentalModeLabel(selectedBooking.rentalMode)}</p>
              </div>

              <div style={styles.detailSection}>
                <h4 style={styles.detailTitle}>Rental Terms</h4>
                <p><strong>Duration:</strong> {selectedBooking.dateRange} ({selectedBooking.days})</p>
                <p><strong>Pickup hub:</strong> {selectedBooking.location || '—'}</p>
                {isWithDriverRentalMode(selectedBooking.rentalMode) && (
                  <DriverTrackingPanel booking={selectedBooking} compact />
                )}
                {selectedBooking.status === 'Approved' && usesPickupGracePeriod(selectedBooking) && (
                  <>
                    <p><strong>Pickup window:</strong> {formatPickupWindow(selectedBooking)}</p>
                    <PickupGraceCountdown booking={selectedBooking} />
                  </>
                )}
                <p><strong>Total Due:</strong> ₱{selectedBooking.total.toLocaleString()}</p>
              </div>
            </div>
            
            <div style={styles.slideFooter}>
              {selectedBooking.status === 'Pending' && (
                <>
                  <button style={styles.btnDanger} onClick={() => updateStatus(selectedBooking, 'Cancelled')}>Reject</button>
                  <button style={styles.btnSuccess} onClick={() => updateStatus(selectedBooking, 'Approved')}><Check size={18} /> Approve</button>
                </>
              )}
              {selectedBooking.status === 'Approved' && (
                <button style={styles.btnPrimary} onClick={() => updateStatus(selectedBooking, 'Active')}><Play size={18} /> Mark as Picked Up</button>
              )}
              {selectedBooking.status === 'Active' && (
                <button style={styles.btnPrimary} onClick={() => updateStatus(selectedBooking, 'Completed')}><CheckCircle size={18} /> Mark as Returned</button>
              )}
              {canGenerateReceipt(selectedBooking.status) && (
                <>
                  <button
                    type="button"
                    style={styles.btnSecondary}
                    disabled={receiptLoading}
                    onClick={() => handleReceipt(selectedBooking, 'download')}
                  >
                    {receiptLoading ? 'Generating...' : 'Download receipt'}
                  </button>
                  <button
                    type="button"
                    style={styles.btnSecondary}
                    disabled={receiptLoading}
                    onClick={() => handleReceipt(selectedBooking, 'print')}
                  >
                    Print / PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 600,
    color: '#111',
  },
  counter: {
    fontSize: '0.9rem',
    color: '#888',
  },
  customerFilterBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    backgroundColor: '#F0F4FF',
    border: '1px solid #D6E4FF',
    borderRadius: '8px',
    padding: '0.85rem 1.25rem',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: '#333',
  },
  clearFilterBtn: {
    backgroundColor: '#FFF',
    color: '#0033FF',
    border: '1px solid #D6E4FF',
    borderRadius: '6px',
    padding: '0.45rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabsContainer: {
    display: 'flex',
    gap: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '2rem',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.75rem 0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#888',
    cursor: 'pointer',
    transition: 'var(--transition)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tabBtnActive: {
    color: '#111',
    borderBottom: '2px solid #111',
  },
  tabCount: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    backgroundColor: '#F0F0F0',
    borderRadius: '10px',
    padding: '0.1rem 0.45rem',
    minWidth: '1.25rem',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '400px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
  },
  emptyIconWrapper: {
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111',
    marginBottom: '0.5rem',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: '0.95rem',
    maxWidth: '400px',
    textAlign: 'center',
  },
  tableScroll: {
    overflowX: 'auto',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    minWidth: '900px',
  },
  idCell: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#333',
    fontSize: '0.9rem',
  },
  primaryText: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: '#111',
  },
  secondaryText: {
    fontSize: '0.8rem',
    color: '#888',
    marginTop: '0.2rem',
  },
  monoCell: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  badge: {
    padding: '0.35rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  badgeWarning: {
    backgroundColor: '#FFF8E1',
    color: '#F57F17',
  },
  badgeInfo: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
  },
  badgeSuccess: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  badgeNeutral: {
    backgroundColor: '#F5F5F7',
    color: '#666',
  },
  actionCell: {
    textAlign: 'right',
    paddingRight: '1.5rem',
  },
  iconBtn: {
    color: '#888',
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  dropdownMenu: {
    position: 'absolute',
    right: '2rem',
    top: '50%',
    backgroundColor: '#FFF',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    minWidth: '160px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: '#333',
    cursor: 'pointer',
    borderBottom: '1px solid #F0F0F0',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px',
  },
  pageInfo: {
    fontSize: '0.85rem',
    color: '#666',
  },
  pageControls: {
    display: 'flex',
    gap: '0.5rem',
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: '#FFF',
    fontSize: '0.85rem',
    cursor: 'pointer',
    color: '#333',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200,
  },
  slideOver: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '100%',
    maxWidth: '500px',
    height: '100vh',
    backgroundColor: '#FFF',
    zIndex: 201,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  slideHeader: {
    padding: '2rem',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
  },
  slideContent: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  detailSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    fontSize: '0.95rem',
  },
  detailTitle: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#888',
    marginBottom: '0.5rem',
  },
  licensePlaceholder: {
    marginTop: '1rem',
    width: '100%',
    height: '150px',
    backgroundColor: '#F5F5F7',
    border: '1px dashed #ccc',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  licenseLink: {
    marginTop: '1rem',
    display: 'inline-block',
    color: '#0033FF',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  slideFooter: {
    padding: '2rem',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  btnPrimary: {
    backgroundColor: 'var(--text-color)',
    color: '#FFF',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  btnSecondary: {
    backgroundColor: '#FFF',
    color: 'var(--text-color)',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnSuccess: {
    backgroundColor: '#2E7D32',
    color: '#FFF',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  btnDanger: {
    backgroundColor: '#FFF',
    color: '#C62828',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: '1px solid #FFCDD2',
    fontWeight: 500,
    cursor: 'pointer',
  }
};

export default Reservations;
