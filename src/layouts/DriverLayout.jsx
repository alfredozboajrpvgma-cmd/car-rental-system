import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, User, LogOut, Menu, X, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LeaveSiteWarningModal from '../components/LeaveSiteWarningModal';
import NotificationBell from '../components/NotificationBell';
import DriverGpsTracker from '../components/DriverGpsTracker';
import { PORTAL } from '../utils/portalTheme';

const DriverLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const { currentUser, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/driver', icon: <LayoutDashboard size={20} /> },
    { name: 'My Trips', path: '/driver/trips', icon: <CalendarCheck size={20} /> },
    { name: 'Profile', path: '/driver/profile', icon: <User size={20} /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/driver') return location.pathname === '/driver';
    return location.pathname.startsWith(path);
  };

  return (
    <div style={styles.container}>
      {sidebarOpen && <div style={styles.overlay} onClick={() => setSidebarOpen(false)} role="presentation" />}

      <aside style={{ ...styles.sidebar, left: sidebarOpen ? '0' : undefined }} className="sidebar">
        <div style={styles.logo}>
          <button type="button" style={styles.logoBtn} onClick={() => setShowLeaveWarning(true)}>
            <span style={styles.logoMark}>//</span> DRIVE PH
          </button>
          <span style={styles.portalTag}>Chauffeur</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {}),
              }}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button type="button" style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <div style={styles.main} className="main-content">
        <header style={styles.header}>
          <button type="button" style={styles.menuBtn} className="mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={styles.headerRight}>
            <NotificationBell defaultLink="/driver/trips" />
            <Link to="/driver/profile" style={styles.userInfo} aria-label="Open profile">
              <span style={styles.userName}>{currentUser?.name || 'Driver'}</span>
              <div style={styles.avatar}>
                <Navigation size={16} />
              </div>
            </Link>
          </div>
        </header>
        <div style={styles.content}>
          <DriverGpsTracker />
          <Outlet />
        </div>
      </div>

      {showLeaveWarning && (
        <LeaveSiteWarningModal
          title="Leave chauffeur portal?"
          message="You are about to leave your driver dashboard and return to the public homepage."
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

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: PORTAL.pageBg,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 49,
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#FFF',
    borderRight: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    zIndex: 50,
  },
  logo: {
    padding: '1.25rem 1.75rem',
    borderBottom: '1px solid #E0E0E0',
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    letterSpacing: 'inherit',
    textTransform: 'inherit',
    textAlign: 'left',
  },
  logoMark: {
    color: '#0033FF',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontStyle: 'italic',
    marginRight: '0.35rem',
  },
  portalTag: {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: PORTAL.primaryHex,
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    color: '#666',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  navLinkActive: {
    backgroundColor: PORTAL.primaryBg,
    color: PORTAL.primaryHex,
    fontWeight: 600,
  },
  sidebarFooter: {
    marginTop: 'auto',
    padding: '1.25rem 1rem 1.5rem',
    borderTop: '1px solid #E0E0E0',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '8px',
    border: 'none',
    background: 'none',
    color: '#C62828',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '80px',
    backgroundColor: '#FFF',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#111',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginLeft: 'auto',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'inherit',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#555',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: PORTAL.primaryHex,
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
};

export default DriverLayout;
