import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LeaveSiteWarningModal from '../components/LeaveSiteWarningModal';
import NotificationBell from '../components/NotificationBell';
import { AdminSearchProvider, useAdminSearch } from '../contexts/AdminSearchContext';

/**
 * Shared shell for internal staff portals (support, workshop).
 */
const StaffPortalLayout = ({
  portalTag,
  theme,
  navItems,
  defaultNotificationLink,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const indexPath = navItems[0]?.path;
  const isActive = (path) => {
    if (path === indexPath) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const styles = buildStyles(theme);

  const HeaderSearch = () => {
    const { query, setQuery } = useAdminSearch();
    return (
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
    );
  };

  return (
    <AdminSearchProvider>
    <div style={styles.container}>
      {sidebarOpen && (
        <div style={styles.overlay} onClick={() => setSidebarOpen(false)} role="presentation" />
      )}

      <aside style={{ ...styles.sidebar, left: sidebarOpen ? '0' : undefined }} className="sidebar">
        <div style={styles.logo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" style={styles.logoBtn} onClick={() => setShowLeaveWarning(true)}>
              <span style={styles.logoMark}>//</span> DRIVE PH
            </button>
            <span style={styles.portalTag}>{portalTag}</span>
          </div>
          <button style={styles.closeBtn} onClick={() => setSidebarOpen(false)} className="mobile-only">
            <X size={20} />
          </button>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
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

      <div style={styles.main} className="portal-main">
        <header style={styles.header} className="portal-header">
            <div style={styles.headerLeft}>
              <button type="button" className="mobile-only portal-menu-btn" style={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <HeaderSearch />
            </div>
          <div style={styles.headerRight}>
            <NotificationBell defaultLink={defaultNotificationLink} />
            <div style={styles.userInfo}>
              <span style={styles.userName} className="portal-user-name">{currentUser?.name || 'Staff'}</span>
              <div style={styles.avatar}>{currentUser?.avatar || 'ST'}</div>
            </div>
          </div>
        </header>
        <div style={styles.content} className="portal-content page-content">
          <Outlet />
        </div>
      </div>

      {showLeaveWarning && (
        <LeaveSiteWarningModal
          title={`Leave ${portalTag.toLowerCase()} portal?`}
          message="You are about to leave your staff dashboard and return to the public homepage."
          onCancel={() => setShowLeaveWarning(false)}
          onConfirm={() => {
            setShowLeaveWarning(false);
            navigate('/');
          }}
        />
      )}
    </div>
    </AdminSearchProvider>
  );
};

const buildStyles = (theme) => ({
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: theme.pageBg,
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
    padding: '1.5rem 1.75rem',
    borderBottom: '1px solid #E0E0E0',
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: theme.primaryHex,
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontStyle: 'italic',
    marginRight: '0.35rem',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
  },
  portalTag: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    color: theme.primaryHex,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.primaryHex}`,
    padding: '0.15rem 0.6rem',
    borderRadius: '16px',
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
    backgroundColor: theme.primaryBg,
    color: theme.primaryHex,
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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  globalSearch: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#FAFAFA',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid #E0E0E0',
    width: '100%',
    maxWidth: '420px', // Expanded width to better align with content
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
    gap: '1.25rem',
    marginLeft: 'auto',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
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
    backgroundColor: theme.primaryHex,
    color: '#FFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  content: {
    flex: 1,
    padding: '2rem',
  },
});

export default StaffPortalLayout;
