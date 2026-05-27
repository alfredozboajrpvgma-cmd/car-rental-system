import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight, Shield, Clock, Star } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    const targets = [500, 50000, 98];
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount1(Math.floor(targets[0] * ease));
      setCount2(Math.floor(targets[1] * ease));
      setCount3(Math.floor(targets[2] * ease));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return (
    <section style={styles.section}>
      {/* Animated background elements */}
      <div style={styles.bgOrb1} className="float-orb" />
      <div style={styles.bgOrb2} className="float-orb-reverse" />
      <div style={styles.bgOrb3} className="float-orb-slow" />
      <div style={styles.gridOverlay} />

      <div className="container" style={styles.container}>
        {/* Badge */}
        <div style={styles.badge} className="fade-in">
          <Star size={14} style={{ color: '#FFB800' }} fill="#FFB800" />
          <span>Now in Private Beta — Limited Access</span>
        </div>

        {/* Main content */}
        <div style={styles.content} className="fade-in">
          <h1 style={styles.title} className="hero-title">
            <span style={styles.titleLine1}>
              <span style={styles.titleSerif} className="hero-title-serif">Drive</span>
            </span>
            <span style={styles.titleLine2}>with Confidence.</span>
          </h1>

          <p style={styles.subtitle}>
            Reliable, premium vehicles for the Philippine roads.
            Whether it's city driving, airport transfers, or out-of-town adventures
            — we've got you covered with 500+ vehicles across the archipelago.
          </p>

          <div style={styles.actions} className="hero-actions">
            <button
              type="button"
              style={styles.btnPrimary}
              className="btn-hover-glow"
              onClick={() => navigate('/register')}
            >
              <span>Join Beta Program</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              style={styles.btnSecondary}
              className="btn-outline-hover"
              onClick={() => navigate('/register')}
            >
              Explore Beta Fleet
            </button>
          </div>

          {/* Trust indicators */}
          <div style={styles.trustRow}>
            <div style={styles.trustItem}>
              <Shield size={16} style={{ color: 'var(--accent-color)' }} />
              <span>Fully Insured</span>
            </div>
            <div style={styles.trustDivider} />
            <div style={styles.trustItem}>
              <Clock size={16} style={{ color: 'var(--accent-color)' }} />
              <span>24/7 Support</span>
            </div>
            <div style={styles.trustDivider} />
            <div style={styles.trustItem}>
              <Star size={16} style={{ color: '#FFB800' }} fill="#FFB800" />
              <span>4.9 Rating</span>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={styles.statsBar} className="fade-in hero-stats-bar">
          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statNumber} className="hero-stat-number">{count1}+</div>
            <div style={styles.statLabel}>Premium Vehicles</div>
          </div>
          <div style={styles.statDivider} className="hero-stat-divider" />
          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statNumber} className="hero-stat-number">{count2.toLocaleString()}+</div>
            <div style={styles.statLabel}>Completed Trips</div>
          </div>
          <div style={styles.statDivider} className="hero-stat-divider" />
          <div style={styles.statCard} className="stat-card-hover">
            <div style={styles.statNumber} className="hero-stat-number">{count3}%</div>
            <div style={styles.statLabel}>Satisfaction Rate</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={styles.scrollIndicator} className="bounce-arrow">
        <ChevronDown size={24} style={{ color: '#999' }} />
      </div>
    </section>
  );
};

const styles = {
  section: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '5rem',
    paddingBottom: '3rem',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #FAFAFA 0%, #F0F2FF 50%, #FAFAFA 100%)',
  },
  bgOrb1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,51,255,0.08) 0%, transparent 70%)',
    top: '-10%',
    right: '-10%',
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,51,255,0.05) 0%, transparent 70%)',
    bottom: '-5%',
    left: '-10%',
    pointerEvents: 'none',
  },
  bgOrb3: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)',
    top: '40%',
    left: '30%',
    pointerEvents: 'none',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(0,51,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,51,255,0.05) 1px, transparent 1px)
    `,
    backgroundSize: '60px 60px',
    opacity: 0.6,
    pointerEvents: 'none',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 2,
    gap: '2rem',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1.25rem',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,51,255,0.1)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    color: '#444',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.75rem',
    maxWidth: '800px',
  },
  title: {
    fontFamily: 'var(--font-primary)',
    fontSize: '5.5rem',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  titleLine1: {},
  titleLine2: {
    background: 'linear-gradient(135deg, #111 0%, #333 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  titleSerif: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '6.5rem',
    background: 'linear-gradient(135deg, var(--accent-color) 0%, #4466FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.15rem',
    color: '#555',
    fontWeight: 400,
    maxWidth: '560px',
    lineHeight: 1.7,
  },
  actions: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #0033FF 0%, #0066FF 100%)',
    color: '#fff',
    padding: '1.1rem 2.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderRadius: '12px',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 4px 20px rgba(0,51,255,0.3)',
  },
  btnSecondary: {
    color: 'var(--text-color)',
    fontSize: '0.9rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '1.1rem 2.5rem',
    borderRadius: '12px',
    border: '2px solid #ddd',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    background: 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  trustRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#666',
  },
  trustDivider: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#ccc',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    marginTop: '2rem',
    padding: '2rem 3rem',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,51,255,0.08)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statCard: {
    padding: '0.5rem 2.5rem',
    textAlign: 'center',
    transition: 'transform 0.3s ease',
    cursor: 'default',
  },
  statDivider: {
    width: '1px',
    height: '48px',
    background: 'linear-gradient(to bottom, transparent, rgba(0,51,255,0.15), transparent)',
  },
  statNumber: {
    fontSize: '2.5rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent-color) 0%, #4466FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#888',
    fontWeight: 600,
    marginTop: '0.25rem',
  },
  scrollIndicator: {
    position: 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
  },
};

export default Hero;
