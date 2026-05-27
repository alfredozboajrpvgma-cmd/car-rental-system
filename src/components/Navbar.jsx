import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const useDark = isHome && !scrolled && !mobileOpen;

  return (
    <>
      <header
        style={{
          ...styles.header,
          ...(scrolled || !isHome ? styles.headerScrolled : {}),
          ...(useDark ? { color: '#111' } : { color: '#111' }),
        }}
        className="fade-in"
      >
        <div className="container" style={styles.container}>
          <div style={styles.logo}>
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={styles.logoMark}>//</span>
              <span style={styles.logoText}>DRIVE PH</span>
              <span style={styles.betaBadge}>BETA</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav style={styles.nav}>
            <Link
              to="/"
              style={{
                ...styles.link,
                ...(location.pathname === '/' ? styles.linkActive : {}),
              }}
            >
              Home
            </Link>
            <Link
              to="/about"
              style={{
                ...styles.link,
                ...(location.pathname === '/about' ? styles.linkActive : {}),
              }}
            >
              About
            </Link>
            <Link
              to="/register"
              style={{
                ...styles.link,
                ...(location.pathname === '/register' ? styles.linkActive : {}),
              }}
            >
              Fleet
            </Link>
            <Link to="/login" style={styles.loginBtn} className="nav-login-hover">
              Login
            </Link>
          </nav>

          {/* Mobile burger */}
          <button
            style={styles.burger}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={styles.mobileMenu}>
            <Link to="/" style={styles.mobileLink}>Home</Link>
            <Link to="/about" style={styles.mobileLink}>About</Link>
            <Link to="/register" style={styles.mobileLink}>Fleet</Link>
            <Link to="/login" style={{ ...styles.mobileLink, ...styles.mobileCta }}>Login</Link>
          </div>
        )}
      </header>
    </>
  );
};

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    padding: '1.25rem 0',
    zIndex: 1000,
    transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
    background: 'transparent',
  },
  headerScrolled: {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 1px 20px rgba(0,0,0,0.06)',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
  },
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.4rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  logoMark: {
    background: 'linear-gradient(135deg, var(--accent-color) 0%, #4466FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: 'var(--font-primary)',
    fontWeight: 300,
    fontSize: '1.5rem',
  },
  logoText: {
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  betaBadge: {
    backgroundColor: 'var(--accent-color)',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 800,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    marginLeft: '0.2rem',
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    gap: '2rem',
    alignItems: 'center',
  },
  link: {
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    padding: '0.4rem 0',
    borderBottom: '2px solid transparent',
    color: '#555',
  },
  linkActive: {
    color: 'var(--accent-color)',
    borderBottom: '2px solid var(--accent-color)',
  },
  loginBtn: {
    fontSize: '0.82rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
    padding: '0.6rem 1.5rem',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0033FF 0%, #1a0066 100%)',
    color: '#fff',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 12px rgba(0,51,255,0.2)',
    textDecoration: 'none',
  },
  burger: {
    display: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    padding: '0.5rem',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 5%',
    gap: '0.25rem',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(0,0,0,0.05)',
  },
  mobileLink: {
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: 600,
    padding: '1rem 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    color: '#333',
    textDecoration: 'none',
  },
  mobileCta: {
    color: 'var(--accent-color)',
    borderBottom: 'none',
    marginTop: '0.5rem',
  },
};

// Inject responsive styles for mobile burger
if (typeof document !== 'undefined') {
  const id = 'navbar-responsive-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 768px) {
        header nav { display: none !important; }
        header button[aria-label="Toggle menu"] { display: flex !important; }
      }
      .nav-login-hover:hover {
        box-shadow: 0 4px 20px rgba(0,51,255,0.35) !important;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }
}

export default Navbar;
