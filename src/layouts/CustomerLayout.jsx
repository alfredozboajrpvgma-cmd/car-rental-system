import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Car, CalendarCheck, User, LogOut, Menu, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LeaveSiteWarningModal from '../components/LeaveSiteWarningModal';
import NotificationBell from '../components/NotificationBell';

const CustomerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const { currentUser, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/customer', icon: <Home size={20} /> },
    { name: 'Browse Fleet', path: '/customer/fleet', icon: <Car size={20} /> },
    { name: 'My Bookings', path: '/customer/bookings', icon: <CalendarCheck size={20} /> },
    { name: 'Roadside & Chat', path: '/customer/incidents', icon: <AlertTriangle size={20} /> },
    { name: 'My Profile', path: '/customer/profile', icon: <User size={20} /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/customer') return location.pathname === '/customer';
    return location.pathname.startsWith(path);
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
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.navLinkActive : {})
              }}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div style={styles.sidebarFooter}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={styles.main} className="main-content">
        <header style={styles.header}>
          <button style={styles.menuBtn} className="mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div style={styles.headerRight}>
            <NotificationBell defaultLink="/customer/bookings" />
            <Link
              to="/customer/profile"
              style={styles.userInfo}
              className="header-profile-link"
              aria-label="Open my profile"
            >
              <span style={styles.userName}>{currentUser?.name || 'Customer'}</span>
              <div style={styles.avatar}>{currentUser?.avatar || 'CU'}</div>
            </Link>
          </div>
        </header>
        <div style={styles.content} className="page-content">
          <Outlet />
        </div>
      </div>

      {showLeaveWarning && (
        <LeaveSiteWarningModal
          title="Leave your account?"
          message="You are about to leave your customer dashboard and return to the public homepage."
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
    backgroundColor: '#F5F5F7',
    fontFamily: 'var(--font-primary)',
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
    height: '100vh',
    zIndex: 50,
  },
  logo: {
    height: '80px',
    padding: '0 2rem',
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    borderBottom: '1px solid #E0E0E0',
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
    textTransform: 'inherit',
  },
  logoMark: {
    color: '#0033FF',
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
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    backgroundColor: '#F0F4FF',
    color: '#0033FF',
    fontWeight: 600,
  },
  sidebarFooter: {
    marginTop: 'auto',
    padding: '1.25rem 1rem 1.5rem',
    borderTop: '1px solid #E0E0E0',
    backgroundColor: '#FFF',
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
    transition: 'background-color 0.2s ease',
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
    justifyContent: 'flex-end',
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
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'inherit',
    padding: '0.35rem 0.5rem',
    margin: '-0.35rem -0.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
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
    backgroundColor: '#0033FF',
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
};

export default CustomerLayout;
