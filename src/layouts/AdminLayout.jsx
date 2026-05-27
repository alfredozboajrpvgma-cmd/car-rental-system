import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Car, CalendarCheck, Users, BarChart3, Settings, LogOut, Search, Menu, X,
  IdCard, MapPin, AlertTriangle, Wrench, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LeaveSiteWarningModal from '../components/LeaveSiteWarningModal';
import NotificationBell from '../components/NotificationBell';
import { useNoShowMonitor } from '../hooks/useNoShowMonitor';
import { AdminSearchProvider, useAdminSearch } from '../contexts/AdminSearchContext';
import { canStaffAccessPath, getStaffTypeLabel, isAdminUser } from '../utils/roles';

const AdminHeader = ({ onOpenSidebar, avatarText }) => {
  const { query, setQuery } = useAdminSearch();

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <button type="button" style={styles.menuBtn} onClick={onOpenSidebar} className="mobile-only">
          <Menu size={24} />
        </button>

        <div style={styles.globalSearch} className="global-search">
          <Search size={18} color="#888" />
          <input
            type="text"
            placeholder="Search bookings, plates..."
            style={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.headerRight}>
        <select style={styles.timeFilter}>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
          <option>Year to Date</option>
        </select>

        <NotificationBell defaultLink="/admin/reservations" />
        <div style={styles.avatar}>{avatarText}</div>
      </div>
    </header>
  );
};

const AdminLayoutInner = () => {
  useNoShowMonitor();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const { currentUser, logout } = useAuth();
  
  const staffNavChildren = [
    { name: 'Drivers', path: '/admin/staff/drivers' },
    { name: 'Contact and Support', path: '/admin/staff/support' },
    { name: 'Maintenance staff', path: '/admin/staff/maintenance' },
  ];

  const allNavItems = [
    { name: 'Overview', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Fleet', path: '/admin/fleet', icon: <Car size={20} /> },
    { name: 'Reservations', path: '/admin/reservations', icon: <CalendarCheck size={20} /> },
    { name: 'Customers', path: '/admin/customers', icon: <Users size={20} /> },
    { name: 'Locations', path: '/admin/locations', icon: <MapPin size={20} /> },
    { name: 'Incidents', path: '/admin/incidents', icon: <AlertTriangle size={20} /> },
    { name: 'Maintenance', path: '/admin/maintenance', icon: <Wrench size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChart3 size={20} />, adminOnly: true },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} />, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly && !isAdminUser(currentUser)) return false;
    if (isAdminUser(currentUser)) return true;
    return canStaffAccessPath(currentUser, item.path);
  });

  const showStaffNav = isAdminUser(currentUser);
  const staffSectionActive = staffNavChildren.some(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
  );
  const [staffNavOpen, setStaffNavOpen] = useState(staffSectionActive);

  useEffect(() => {
    if (staffSectionActive) setStaffNavOpen(true);
  }, [staffSectionActive]);

  const staffTypeLabel = currentUser?.staffType
    ? getStaffTypeLabel(currentUser.staffType)
    : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      {/* Mobile Overlay */}
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)}></div>}
      
      {/* Sidebar */}
      <aside style={{...styles.sidebar, left: sidebarOpen ? '0' : undefined}} className="sidebar">
        <div style={styles.logo}>
          <button
            type="button"
            style={styles.logoBtn}
            onClick={() => setShowLeaveWarning(true)}
          >
            <span style={styles.logoMark}>//</span> DRIVE PH
          </button>
          <button style={styles.closeBtn} onClick={() => setSidebarOpen(false)} className="mobile-only">
            <X size={20} />
          </button>
        </div>
        
        <nav style={styles.nav}>
          {navItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}

          {showStaffNav && (
            <div style={styles.navGroup}>
              <button
                type="button"
                onClick={() => setStaffNavOpen((open) => !open)}
                style={{
                  ...styles.navGroupToggle,
                  ...(staffSectionActive ? styles.navGroupLabelActive : {}),
                }}
                aria-expanded={staffNavOpen}
                aria-controls="admin-staff-nav"
              >
                <span style={styles.navGroupToggleMain}>
                  <IdCard size={20} />
                  <span>Staff</span>
                </span>
                {staffNavOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {staffNavOpen && (
                <div id="admin-staff-nav" style={styles.navSubList}>
                  {staffNavChildren.map((item) => {
                    const isActive = location.pathname === item.path
                      || location.pathname.startsWith(`${item.path}/`);
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        style={{
                          ...styles.navItem,
                          ...styles.navSubItem,
                          ...(isActive ? styles.navItemActive : {}),
                        }}
                      >
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {navItems.slice(4).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                }}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div style={styles.sidebarFooter}>
          {staffTypeLabel && (
            <div style={styles.staffBadge}>{staffTypeLabel}</div>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.main} className="main-content">
        <AdminHeader
          onOpenSidebar={() => setSidebarOpen(true)}
          avatarText={currentUser?.avatar || 'AD'}
        />
        <div style={styles.content} className="page-content portal-content">
          <Outlet />
        </div>
      </main>

      {showLeaveWarning && (
        <LeaveSiteWarningModal
          title="Leave admin dashboard?"
          message="You are about to leave the admin panel and return to the public homepage. Any unsaved work may be lost."
          onCancel={() => setShowLeaveWarning(false)}
          onConfirm={() => {
            setShowLeaveWarning(false);
            navigate('/');
          }}
        />
      )}
    </div>
  );
};

const AdminLayout = () => (
  <AdminSearchProvider>
    <AdminLayoutInner />
  </AdminSearchProvider>
);

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#F5F5F7',
    fontFamily: 'var(--font-primary)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#FFFFFF',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    zIndex: 100,
    transition: 'left 0.3s ease',
  },
  logo: {
    height: '80px',
    padding: '0 2rem',
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
  },
  logoMark: {
    color: 'var(--accent-color)',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontStyle: 'italic',
    marginRight: '0.2rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
  },
  nav: {
    flex: 1,
    padding: '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'var(--transition)',
  },
  navItemActive: {
    backgroundColor: '#F0F4FF',
    color: 'var(--accent-color)',
    fontWeight: 600,
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    margin: '0.25rem 0',
  },
  navGroupToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: '0.5rem',
    padding: '0.85rem 1rem',
    border: 'none',
    borderRadius: '8px',
    background: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#666',
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
    transition: 'var(--transition)',
  },
  navGroupToggleMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navGroupLabelActive: {
    color: 'var(--accent-color)',
    backgroundColor: '#F0F4FF',
  },
  navSubList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  navSubItem: {
    paddingLeft: '2.75rem',
    fontSize: '0.85rem',
  },
  sidebarFooter: {
    padding: '2rem 1rem',
    borderTop: '1px solid var(--border-color)',
  },
  staffBadge: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#555',
    backgroundColor: '#F0F0F0',
    borderRadius: '6px',
    padding: '0.35rem 0.65rem',
    marginBottom: '0.75rem',
    textAlign: 'center',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.85rem 1rem',
    color: '#FF3B30',
    width: '100%',
    textAlign: 'left',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  header: {
    height: '80px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    gap: '1rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#111',
  },
  globalSearch: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#FAFAFA',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    width: '100%',
    maxWidth: '320px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-primary)',
    width: '100%',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  timeFilter: {
    padding: '0.4rem 0.75rem',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
    fontFamily: 'var(--font-primary)',
    fontSize: '0.85rem',
    backgroundColor: '#FAFAFA',
    color: '#333',
    outline: 'none',
    cursor: 'pointer',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--text-color)',
    color: 'var(--bg-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  content: {
    flex: 1,
    padding: '2rem',
    overflowY: 'auto',
  }
};

export default AdminLayout;
