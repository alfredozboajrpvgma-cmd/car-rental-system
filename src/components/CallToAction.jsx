import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';

const CallToAction = () => {
  const navigate = useNavigate();
  const [reserveHover, setReserveHover] = useState(false);
  const [contactHover, setContactHover] = useState(false);

  return (
    <section style={styles.section}>
      {/* Decorative background elements */}
      <div style={styles.decorWrapper} aria-hidden="true">
        <div style={styles.circle1} />
        <div style={styles.circle2} />
        <div style={styles.circle3} />
        {/* Dot grid pattern */}
        <div style={styles.dotsGrid}>
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} style={styles.dot} />
          ))}
        </div>
        <div style={styles.dotsGridRight}>
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} style={styles.dot} />
          ))}
        </div>
      </div>

      <div className="container" style={styles.container}>
        <div style={styles.content} className="fade-in">
          <p style={styles.label}>START YOUR JOURNEY</p>
          <h2 style={styles.heading}>
            Ready to Join the Beta?
          </h2>
          <p style={styles.subtext}>
            Be among the first to experience the future of car rentals in the Philippines.
          </p>

          <div style={styles.actions}>
            <button
              type="button"
              style={{
                ...styles.btnPrimary,
                ...(reserveHover ? styles.btnPrimaryHover : {}),
              }}
              onMouseEnter={() => setReserveHover(true)}
              onMouseLeave={() => setReserveHover(false)}
              onClick={() => navigate('/register')}
            >
              Request Beta Access
              <ArrowRight
                size={18}
                style={{
                  transition: 'transform 0.3s ease',
                  transform: reserveHover ? 'translateX(4px)' : 'none',
                }}
              />
            </button>

            <button
              type="button"
              style={{
                ...styles.btnSecondary,
                ...(contactHover ? styles.btnSecondaryHover : {}),
              }}
              onMouseEnter={() => setContactHover(true)}
              onMouseLeave={() => setContactHover(false)}
              onClick={() => navigate('/about')}
            >
              <Phone size={16} />
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const styles = {
  section: {
    position: 'relative',
    padding: '6rem 0',
    background: 'linear-gradient(135deg, #0033FF 0%, #1a0066 100%)',
    overflow: 'hidden',
  },
  decorWrapper: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    top: '-200px',
    right: '-100px',
  },
  circle2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.03)',
    bottom: '-100px',
    left: '-50px',
  },
  circle3: {
    position: 'absolute',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    top: '50%',
    left: '15%',
    transform: 'translateY(-50%)',
  },
  dotsGrid: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 12px)',
    gridTemplateRows: 'repeat(6, 12px)',
    gap: '8px',
    opacity: 0.25,
  },
  dotsGridRight: {
    position: 'absolute',
    bottom: '15%',
    right: '6%',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 12px)',
    gridTemplateRows: 'repeat(6, 12px)',
    gap: '8px',
    opacity: 0.2,
  },
  dot: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  container: {
    position: 'relative',
    zIndex: 1,
  },
  content: {
    textAlign: 'center',
    maxWidth: '640px',
    margin: '0 auto',
  },
  label: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.25em',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: '1.25rem',
    fontFamily: 'var(--font-primary)',
  },
  heading: {
    fontSize: '3.5rem',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)',
    lineHeight: 1.1,
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  subtext: {
    fontSize: '1.15rem',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: '2.5rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.25rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    backgroundColor: '#ffffff',
    color: '#0033FF',
    padding: '1.1rem 2.5rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
  },
  btnPrimaryHover: {
    backgroundColor: '#f0f0f0',
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    color: '#ffffff',
    padding: '1.1rem 2.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderRadius: '8px',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
    fontFamily: 'var(--font-primary)',
  },
  btnSecondaryHover: {
    border: '1.5px solid rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: 'translateY(-2px)',
  },
};

export default CallToAction;
