import React, { useState } from 'react';
import { Headset, CalendarDays, Car, MapPin } from 'lucide-react';

const features = [
  {
    icon: Headset,
    title: '24/7 Support',
    description:
      'Round-the-clock assistance wherever you are in the Philippines. Our dedicated team is always one call away.',
    gradient: 'linear-gradient(135deg, #0033FF 0%, #3366FF 100%)',
  },
  {
    icon: CalendarDays,
    title: 'Flexible Booking',
    description:
      'Change dates, extend trips, or cancel hassle-free. We adapt to your schedule, not the other way around.',
    gradient: 'linear-gradient(135deg, #0033FF 0%, #6644FF 100%)',
  },
  {
    icon: Car,
    title: 'Premium Fleet',
    description:
      'From compact sedans to luxury SUVs — every vehicle is meticulously maintained and fully insured.',
    gradient: 'linear-gradient(135deg, #0033FF 0%, #0066CC 100%)',
  },
  {
    icon: MapPin,
    title: 'GPS Tracking',
    description:
      'Real-time vehicle tracking for your safety and peace of mind. Navigate unfamiliar roads with confidence.',
    gradient: 'linear-gradient(135deg, #0033FF 0%, #1a0066 100%)',
  },
];

const WhyChooseUs = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <section style={styles.section}>
      <div className="container">
        <div style={styles.header} className="fade-in">
          <p style={styles.label}>WHY DRIVE PH</p>
          <h2 style={styles.heading}>
            Built for the{' '}
            <span style={styles.headingAccent}>Filipino Driver</span>
          </h2>
          <p style={styles.subheading}>
            Everything you need for a seamless car rental experience — from
            booking to the open road.
          </p>
        </div>

        <div className="responsive-grid-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={feature.title}
                className="fade-in"
                style={{
                  ...styles.card,
                  ...(isHovered ? styles.cardHover : {}),
                  animationDelay: `${0.15 * index}s`,
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Gradient accent bar */}
                <div
                  style={{
                    ...styles.accentBar,
                    background: feature.gradient,
                  }}
                />

                <div style={styles.cardContent}>
                  {/* Icon circle */}
                  <div
                    style={{
                      ...styles.iconCircle,
                      ...(isHovered ? styles.iconCircleHover : {}),
                    }}
                  >
                    <Icon
                      size={24}
                      color={isHovered ? '#ffffff' : '#0033FF'}
                      strokeWidth={1.5}
                    />
                  </div>

                  <h3 style={styles.cardTitle}>{feature.title}</h3>
                  <p style={styles.cardDesc}>{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const styles = {
  section: {
    padding: '7rem 0',
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: '4rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'var(--accent-color)',
    marginBottom: '1rem',
    fontFamily: 'var(--font-primary)',
  },
  heading: {
    fontSize: '3rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    fontFamily: 'var(--font-primary)',
    lineHeight: 1.15,
    marginBottom: '1rem',
  },
  headingAccent: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    color: 'var(--accent-color)',
  },
  subheading: {
    fontSize: '1.05rem',
    color: '#888',
    maxWidth: '520px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.75rem',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(224, 224, 224, 0.5)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 51, 255, 0.08)',
    border: '1px solid rgba(0, 51, 255, 0.15)',
  },
  accentBar: {
    height: '4px',
    width: '100%',
  },
  cardContent: {
    padding: '2rem 1.75rem 2.25rem',
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'rgba(0, 51, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  iconCircleHover: {
    background: 'var(--accent-color)',
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-primary)',
  },
  cardDesc: {
    fontSize: '0.9rem',
    color: '#777',
    lineHeight: 1.65,
    fontWeight: 400,
  },
};

export default WhyChooseUs;
