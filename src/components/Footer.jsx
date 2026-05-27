import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, MessageSquare, Mail, MapPin, Phone, ChevronRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      {/* Top section */}
      <div className="container footer-grid" style={styles.topSection}>
        {/* Brand column */}
        <div style={styles.brandCol}>
          <div style={styles.brandName}>
            <span style={styles.brandMark}>//</span> DRIVE PH
          </div>
          <p style={styles.brandDesc}>
            Premium car rental service across the Philippines. 
            Reliable vehicles, exceptional service, unforgettable journeys.
          </p>
          <div style={styles.socialRow}>
            <a href="#" style={styles.socialIcon} className="footer-social-hover" aria-label="Website">
              <Globe size={18} />
            </a>
            <a href="#" style={styles.socialIcon} className="footer-social-hover" aria-label="Message">
              <MessageSquare size={18} />
            </a>
            <a href="#" style={styles.socialIcon} className="footer-social-hover" aria-label="Email">
              <Mail size={18} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div style={styles.linkCol}>
          <h4 style={styles.colTitle}>Quick Links</h4>
          <Link to="/" style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Home
          </Link>
          <Link to="/about" style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> About Us
          </Link>
          <Link to="/register" style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Browse Fleet
          </Link>
          <Link to="/login" style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Login
          </Link>
        </div>

        {/* Services */}
        <div style={styles.linkCol}>
          <h4 style={styles.colTitle}>Services</h4>
          <span style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Self-Drive Rentals
          </span>
          <span style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Chauffeur Service
          </span>
          <span style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Airport Transfers
          </span>
          <span style={styles.footerLink}>
            <ChevronRight size={14} style={{ opacity: 0.5 }} /> Long-Term Lease
          </span>
        </div>

        {/* Contact */}
        <div style={styles.linkCol}>
          <h4 style={styles.colTitle}>Contact</h4>
          <div style={styles.contactItem}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>123 Ayala Avenue, Makati City, Metro Manila</span>
          </div>
          <div style={styles.contactItem}>
            <Phone size={14} style={{ flexShrink: 0 }} />
            <span>+63 (2) 8888-DRIVE</span>
          </div>
          <div style={styles.contactItem}>
            <Mail size={14} style={{ flexShrink: 0 }} />
            <span>hello@driveph.com</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div className="container footer-bottom" style={styles.bottomContainer}>
          <div style={styles.copyright}>
            © 2026 DRIVE PH Rentals. All rights reserved.
          </div>
          <div style={styles.bottomLinks} className="footer-bottom-links">
            <a href="#" style={styles.bottomLink}>Privacy Policy</a>
            <a href="#" style={styles.bottomLink}>Terms of Service</a>
            <a href="#" style={styles.bottomLink}>Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    backgroundColor: '#0a0a0a',
    color: '#FAFAFA',
  },
  topSection: {
    gap: '3rem',
    paddingTop: '5rem',
    paddingBottom: '3rem',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    letterSpacing: '0.1em',
    fontWeight: 700,
  },
  brandMark: {
    background: 'linear-gradient(135deg, #0033FF, #4466FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: 'var(--font-primary)',
    fontWeight: 300,
  },
  brandDesc: {
    fontSize: '0.9rem',
    lineHeight: 1.7,
    color: '#a3a3a3',
    maxWidth: '300px',
  },
  socialRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  socialIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    transition: 'all 0.3s ease',
    textDecoration: 'none',
  },
  linkCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  colTitle: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '0.5rem',
  },
  footerLink: {
    fontSize: '0.88rem',
    color: '#a3a3a3',
    transition: 'color 0.3s ease',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    fontSize: '0.88rem',
    color: '#a3a3a3',
    lineHeight: 1.5,
  },
  bottomBar: {
    borderTop: '1px solid #1a1a1a',
    padding: '1.5rem 0',
  },
  bottomContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  copyright: {
    fontSize: '0.78rem',
    color: '#555',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  bottomLinks: {
    display: 'flex',
    gap: '2rem',
  },
  bottomLink: {
    fontSize: '0.78rem',
    color: '#555',
    transition: 'color 0.3s ease',
    textDecoration: 'none',
  },
};

// Inject hover styles
if (typeof document !== 'undefined') {
  const id = 'footer-hover-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .footer-social-hover:hover {
        background: linear-gradient(135deg, #0033FF, #4466FF) !important;
        border-color: #0033FF !important;
        color: #fff !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0,51,255,0.3);
      }
      footer a:hover {
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export default Footer;
