import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Heart, Zap, MapPin, Mail, Phone, ArrowLeft } from 'lucide-react';

const About = () => {
  const navigate = useNavigate();

  const stats = [
    { value: '500+', label: 'Vehicles' },
    { value: '50,000+', label: 'Trips Completed' },
    { value: '10+', label: 'Years of Service' },
    { value: '24/7', label: 'Customer Support' },
  ];

  const values = [
    {
      icon: Shield,
      title: 'Safety First',
      description:
        'We maintain our fleet to the highest safety standards. Every vehicle undergoes rigorous inspections before each rental, because your safety is non-negotiable.',
    },
    {
      icon: Heart,
      title: 'Customer-Centric',
      description:
        'Your satisfaction drives everything we do. From seamless booking to 24/7 roadside assistance, we go the extra mile so you never have to worry.',
    },
    {
      icon: Zap,
      title: 'Innovation',
      description:
        'GPS tracking, digital booking, and smart fleet management — we leverage cutting-edge technology to deliver a modern, frictionless rental experience.',
    },
  ];

  const team = [
    {
      name: 'Juan dela Cruz',
      role: 'CEO & Founder',
      initials: 'JC',
      color: '#0033FF',
      bio: 'A visionary entrepreneur who founded DRIVE PH with a mission to transform car rental in the Philippines through quality and reliability.',
    },
    {
      name: 'Maria Santos',
      role: 'Operations Director',
      initials: 'MS',
      color: '#6B21A8',
      bio: 'With over 15 years in logistics, Maria ensures every trip runs smoothly — from fleet scheduling to customer handoffs across all branches.',
    },
    {
      name: 'Carlos Reyes',
      role: 'Fleet Manager',
      initials: 'CR',
      color: '#0F766E',
      bio: 'Carlos oversees our 500+ vehicle fleet, ensuring every car meets our exacting maintenance and safety standards before hitting the road.',
    },
    {
      name: 'Ana Gonzales',
      role: 'Customer Relations Head',
      initials: 'AG',
      color: '#B45309',
      bio: 'Ana leads our customer experience team, turning feedback into action and building lasting relationships with every DRIVE PH client.',
    },
  ];

  const locations = [
    {
      city: 'Manila',
      tag: 'Main Office',
      address: '123 Ayala Avenue, Makati City',
      phone: '+63 2 8888 1234',
    },
    {
      city: 'Cebu',
      tag: null,
      address: 'IT Park, Cebu Business Park',
      phone: '+63 32 888 5678',
    },
    {
      city: 'Davao',
      tag: null,
      address: 'JP Laurel Ave, Bajada',
      phone: '+63 82 888 9012',
    },
  ];

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section style={styles.hero}>
        {/* Decorative line art */}
        <div style={styles.heroDecor}>
          <div style={styles.decorCircle1} />
          <div style={styles.decorCircle2} />
          <div style={styles.decorLine1} />
          <div style={styles.decorLine2} />
          <div style={styles.decorLine3} />
        </div>

        <div className="container" style={styles.heroContainer}>
          <div className="fade-in" style={{ animationDelay: '0.2s' }}>
            <p style={styles.heroTag}>ABOUT US</p>
            <h1 style={styles.heroTitle}>
              About{' '}
              <span style={styles.heroTitleSerif}>Drive</span> PH
            </h1>
            <p style={styles.heroSubtitle}>
              We're on a mission to redefine car rental in the Philippines —
              making premium mobility accessible, reliable, and effortless for
              every Filipino journey.
            </p>
          </div>
        </div>

        {/* Bottom fade line */}
        <div style={styles.heroBottomLine} />
      </section>

      {/* ───────────────────────── OUR STORY ───────────────────────── */}
      <section style={styles.storySection}>
        <div className="container" style={styles.storyGrid}>
          <div className="fade-in" style={{ animationDelay: '0.15s' }}>
            <p style={styles.sectionTag}>OUR STORY</p>
            <h2 style={styles.sectionHeading}>
              Our Story <span style={styles.headingAccent}>//</span>
            </h2>
            <p style={styles.storyParagraph}>
              DRIVE PH started in the heart of Manila with a simple idea: every
              Filipino deserves access to safe, well-maintained vehicles without
              the hassle of traditional car rental. What began as a small fleet of
              ten sedans has grown into the country's most trusted mobility
              platform.
            </p>
            <p style={styles.storyParagraph}>
              Over the past decade, we've expanded our reach across the entire
              archipelago — from the busy streets of Metro Manila to the scenic
              roads of Cebu and the growing cities of Mindanao. Our commitment to
              quality vehicles, transparent pricing, and genuine customer care has
              earned us the loyalty of thousands of travelers and businesses alike.
            </p>
            <p style={styles.storyParagraph}>
              Today, DRIVE PH operates a fleet of over 500 vehicles and has
              completed more than 50,000 trips. But we're just getting started.
              Every journey we power is a chance to prove that Philippine car
              rental can be world-class.
            </p>
          </div>

          {/* Stat Cards 2×2 */}
          <div
            className="fade-in responsive-grid-2-equal"
            style={{ animationDelay: '0.35s' }}
          >
            {stats.map((s) => (
              <div key={s.label} style={styles.statCard}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── OUR VALUES ───────────────────────── */}
      <section style={styles.valuesSection}>
        <div className="container">
          <div className="fade-in">
            <p style={styles.sectionTag}>WHAT WE STAND FOR</p>
            <h2 style={styles.sectionHeading}>
              Our Values <span style={styles.headingAccent}>//</span>
            </h2>
          </div>

          <div className="responsive-grid-3">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="fade-in"
                  style={{ ...styles.valueCard, animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  <div style={styles.valueGradientBar} />
                  <div style={styles.valueIconWrap}>
                    <Icon size={28} color="#0033FF" strokeWidth={1.5} />
                  </div>
                  <h3 style={styles.valueTitle}>{v.title}</h3>
                  <p style={styles.valueDesc}>{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────── OUR TEAM ───────────────────────── */}
      <section style={styles.teamSection}>
        <div className="container">
          <div className="fade-in">
            <p style={styles.sectionTag}>OUR PEOPLE</p>
            <h2 style={styles.sectionHeading}>
              The Team Behind{' '}
              <span style={styles.headingAccent}>DRIVE PH</span>
            </h2>
            <p style={styles.teamSubtitle}>
              Passionate professionals dedicated to keeping the Philippines
              moving.
            </p>
          </div>

          <div className="responsive-grid-4">
            {team.map((m, i) => (
              <div
                key={m.name}
                className="fade-in"
                style={{ ...styles.teamCard, animationDelay: `${0.2 + i * 0.12}s` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow =
                    '0 16px 48px rgba(0,0,0,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 2px 12px rgba(0,0,0,0.04)';
                }}
              >
                <div
                  style={{
                    ...styles.avatar,
                    backgroundColor: m.color,
                  }}
                >
                  {m.initials}
                </div>
                <h4 style={styles.teamName}>{m.name}</h4>
                <p style={styles.teamRole}>{m.role}</p>
                <p style={styles.teamBio}>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── OFFICE LOCATIONS ───────────────────────── */}
      <section style={styles.locationsSection}>
        <div className="container">
          <div className="fade-in">
            <p style={styles.sectionTag}>WHERE TO FIND US</p>
            <h2 style={styles.sectionHeading}>
              Office Locations <span style={styles.headingAccent}>//</span>
            </h2>
          </div>

          <div className="responsive-grid-3">
            {locations.map((loc, i) => (
              <div
                key={loc.city}
                className="fade-in"
                style={{
                  ...styles.locationCard,
                  animationDelay: `${0.2 + i * 0.15}s`,
                }}
              >
                <div style={styles.locationIconRow}>
                  <MapPin size={20} color="#0033FF" strokeWidth={1.5} />
                  <div>
                    <h4 style={styles.locationCity}>
                      {loc.city}
                      {loc.tag && (
                        <span style={styles.locationTag}>{loc.tag}</span>
                      )}
                    </h4>
                  </div>
                </div>
                <p style={styles.locationAddress}>{loc.address}</p>
                <div style={styles.locationPhone}>
                  <Phone size={14} color="#888" strokeWidth={1.5} />
                  <span>{loc.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── CONTACT CTA ───────────────────────── */}
      <section style={styles.ctaSection} className="fade-in">
        <div className="container" style={styles.ctaContainer}>
          <h2 style={styles.ctaHeading}>Have Questions?</h2>
          <p style={styles.ctaSubtext}>
            We'd love to hear from you. Reach out and our team will get back to
            you within 24 hours.
          </p>

          <div style={styles.ctaContactRow}>
            <div style={styles.ctaContactItem}>
              <Mail size={18} color="#FAFAFA" strokeWidth={1.5} />
              <span>hello@driveph.com</span>
            </div>
            <div style={styles.ctaDivider} />
            <div style={styles.ctaContactItem}>
              <Phone size={18} color="#FAFAFA" strokeWidth={1.5} />
              <span>+63 2 8888 1234</span>
            </div>
          </div>

          <button
            type="button"
            style={styles.ctaButton}
            className="btn-hover"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </div>
      </section>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */
/*  STYLES                                                                */
/* ─────────────────────────────────────────────────────────────────────── */

const styles = {
  /* ── Hero ────────────────────────────────────────────────────────── */
  hero: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#111',
    color: '#FAFAFA',
    overflow: 'hidden',
    paddingTop: '6rem',
  },
  heroContainer: {
    position: 'relative',
    zIndex: 2,
  },
  heroTag: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: '#888',
    marginBottom: '1.5rem',
  },
  heroTitle: {
    fontFamily: 'var(--font-primary)',
    fontSize: 'clamp(3rem, 8vw, 6rem)',
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    marginBottom: '2rem',
  },
  heroTitleSerif: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#0033FF',
  },
  heroSubtitle: {
    fontSize: '1.15rem',
    color: '#999',
    maxWidth: '520px',
    lineHeight: 1.7,
    fontWeight: 400,
  },
  heroBottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #333, transparent)',
  },

  /* Decorative elements */
  heroDecor: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
  },
  decorCircle1: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.06)',
    top: '50%',
    right: '10%',
    transform: 'translateY(-50%)',
  },
  decorCircle2: {
    position: 'absolute',
    width: '280px',
    height: '280px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.04)',
    top: '60%',
    right: '18%',
    transform: 'translateY(-50%)',
  },
  decorLine1: {
    position: 'absolute',
    width: '140%',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: '35%',
    left: '-20%',
    transform: 'rotate(-35deg)',
  },
  decorLine2: {
    position: 'absolute',
    width: '140%',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    top: '55%',
    left: '-20%',
    transform: 'rotate(-35deg)',
  },
  decorLine3: {
    position: 'absolute',
    width: '140%',
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.025)',
    top: '75%',
    left: '-20%',
    transform: 'rotate(-35deg)',
  },

  /* ── Our Story ──────────────────────────────────────────────────── */
  storySection: {
    padding: '8rem 0',
    backgroundColor: '#FAFAFA',
  },
  storyGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '5rem',
    alignItems: 'start',
  },
  sectionTag: {
    fontSize: '0.7rem',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: '#0033FF',
    marginBottom: '1rem',
  },
  sectionHeading: {
    fontFamily: 'var(--font-primary)',
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#111',
    marginBottom: '2rem',
    letterSpacing: '-0.02em',
  },
  headingAccent: {
    color: '#0033FF',
    fontStyle: 'italic',
  },
  storyParagraph: {
    fontSize: '1rem',
    lineHeight: 1.8,
    color: '#555',
    marginBottom: '1.5rem',
    maxWidth: '540px',
  },

  /* Stat cards */
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    alignSelf: 'center',
  },
  statCard: {
    border: '1px solid #E0E0E0',
    borderLeft: '3px solid #0033FF',
    padding: '2rem',
    backgroundColor: '#FFF',
    transition: 'all 0.3s ease',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.2rem',
    fontWeight: 600,
    color: '#111',
    lineHeight: 1.1,
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '0.8rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#888',
  },

  /* ── Values ─────────────────────────────────────────────────────── */
  valuesSection: {
    padding: '8rem 0',
    backgroundColor: '#F3F4F6',
  },
  valuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem',
    marginTop: '1rem',
  },
  valueCard: {
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    padding: '2.5rem 2rem',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  valueGradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, #0033FF, #5566FF)',
  },
  valueIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0,51,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  valueTitle: {
    fontFamily: 'var(--font-primary)',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#111',
    marginBottom: '0.75rem',
  },
  valueDesc: {
    fontSize: '0.9rem',
    lineHeight: 1.7,
    color: '#666',
  },

  /* ── Team ────────────────────────────────────────────────────────── */
  teamSection: {
    padding: '8rem 0',
    backgroundColor: '#FAFAFA',
  },
  teamSubtitle: {
    fontSize: '1.05rem',
    color: '#666',
    maxWidth: '420px',
    marginBottom: '1rem',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '2rem',
    marginTop: '3rem',
  },
  teamCard: {
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '2.5rem 2rem',
    textAlign: 'center',
    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    cursor: 'default',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFF',
    fontFamily: 'var(--font-primary)',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '0.05em',
    margin: '0 auto 1.25rem auto',
  },
  teamName: {
    fontFamily: 'var(--font-primary)',
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#111',
    marginBottom: '0.25rem',
  },
  teamRole: {
    fontSize: '0.8rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#0033FF',
    marginBottom: '1rem',
  },
  teamBio: {
    fontSize: '0.85rem',
    lineHeight: 1.65,
    color: '#666',
  },

  /* ── Locations ──────────────────────────────────────────────────── */
  locationsSection: {
    padding: '8rem 0',
    backgroundColor: '#F3F4F6',
  },
  locationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '2rem',
    marginTop: '1rem',
  },
  locationCard: {
    backgroundColor: '#FFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '2rem',
    transition: 'all 0.3s ease',
  },
  locationIconRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  locationCity: {
    fontFamily: 'var(--font-primary)',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#111',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  locationTag: {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#0033FF',
    backgroundColor: 'rgba(0,51,255,0.06)',
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
  },
  locationAddress: {
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '0.75rem',
  },
  locationPhone: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: '#888',
    fontFamily: 'monospace',
  },

  /* ── Contact CTA ────────────────────────────────────────────────── */
  ctaSection: {
    padding: '6rem 0',
    background: 'linear-gradient(135deg, #0033FF, #111)',
    color: '#FAFAFA',
    textAlign: 'center',
  },
  ctaContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  ctaHeading: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    fontWeight: 400,
    fontStyle: 'italic',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
  },
  ctaSubtext: {
    fontSize: '1.05rem',
    color: 'rgba(250,250,250,0.7)',
    maxWidth: '440px',
    lineHeight: 1.7,
    marginBottom: '2.5rem',
  },
  ctaContactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    marginBottom: '3rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaContactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.95rem',
    fontWeight: 500,
    letterSpacing: '0.02em',
  },
  ctaDivider: {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(250,250,250,0.2)',
  },
  ctaButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'transparent',
    color: '#FAFAFA',
    border: '1px solid rgba(250,250,250,0.3)',
    padding: '1rem 2.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'var(--transition)',
    borderRadius: '4px',
  },
};

export default About;
