import React, { useState } from 'react';
import { Search, CheckCircle, Navigation } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Choose Your Car',
    description:
      'Browse our curated fleet of premium vehicles. Filter by type, seats, or budget to find your perfect ride.',
  },
  {
    number: '02',
    icon: CheckCircle,
    title: 'Book & Confirm',
    description:
      'Select your dates, pick-up location, and confirm in seconds. No hidden fees, no surprises — just transparent pricing.',
  },
  {
    number: '03',
    icon: Navigation,
    title: 'Hit The Road',
    description:
      'Pick up your car and explore the Philippines your way. GPS-tracked, fully insured, and ready to go.',
  },
];

const HowItWorks = () => {
  const [hoveredStep, setHoveredStep] = useState(null);

  return (
    <section style={styles.section}>
      <div className="container">
        <div style={styles.header} className="fade-in">
          <p style={styles.label}>HOW IT WORKS</p>
          <h2 style={styles.heading}>
            Three Steps to{' '}
            <span style={styles.headingAccent}>Freedom</span>
          </h2>
          <p style={styles.subheading}>
            Getting behind the wheel has never been easier. Here's how DRIVE PH
            works.
          </p>
        </div>

        <div className="responsive-grid-3" style={{ gap: '2rem', alignItems: 'start', position: 'relative' }}>
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isHovered = hoveredStep === index;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.number}
                style={styles.stepWrapper}
                className="fade-in"
              >
                <div
                  style={{
                    ...styles.stepCard,
                    ...(isHovered ? styles.stepCardHover : {}),
                    animationDelay: `${0.2 * index}s`,
                  }}
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {/* Large background number */}
                  <span
                    style={{
                      ...styles.bgNumber,
                      ...(isHovered ? styles.bgNumberHover : {}),
                    }}
                  >
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div
                    style={{
                      ...styles.iconWrapper,
                      ...(isHovered ? styles.iconWrapperHover : {}),
                    }}
                  >
                    <Icon
                      size={28}
                      color={isHovered ? '#ffffff' : '#0033FF'}
                      strokeWidth={1.8}
                    />
                  </div>

                  <h3 style={styles.stepTitle}>{step.title}</h3>
                  <p style={styles.stepDesc}>{step.description}</p>
                </div>

                {/* Connector dashed line */}
                {!isLast && <div className="how-it-works-connector" style={styles.connector} />}
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
    background: 'linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '4.5rem',
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
    maxWidth: '480px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  stepsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0',
    alignItems: 'start',
    position: 'relative',
  },
  stepWrapper: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  stepCard: {
    position: 'relative',
    flex: 1,
    textAlign: 'center',
    padding: '3rem 2rem',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '1px solid #f0f0f0',
    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
  },
  stepCardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 30px rgba(0, 51, 255, 0.06)',
    border: '1px solid rgba(0, 51, 255, 0.1)',
  },
  bgNumber: {
    position: 'absolute',
    top: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '8rem',
    fontWeight: 900,
    fontFamily: 'var(--font-primary)',
    color: 'rgba(0, 51, 255, 0.04)',
    lineHeight: 1,
    pointerEvents: 'none',
    transition: 'color 0.4s ease',
    userSelect: 'none',
  },
  bgNumberHover: {
    color: 'rgba(0, 51, 255, 0.08)',
  },
  iconWrapper: {
    position: 'relative',
    zIndex: 1,
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(0, 51, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  iconWrapperHover: {
    background: 'var(--accent-color)',
    transform: 'scale(1.1)',
    boxShadow: '0 8px 30px rgba(0, 51, 255, 0.3)',
  },
  stepTitle: {
    position: 'relative',
    zIndex: 1,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--text-color)',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-primary)',
  },
  stepDesc: {
    position: 'relative',
    zIndex: 1,
    fontSize: '0.9rem',
    color: '#888',
    lineHeight: 1.65,
    maxWidth: '280px',
    margin: '0 auto',
  },
  connector: {
    position: 'absolute',
    left: '50%',
    top: '80px',
    width: 'calc(100% + 2rem)',
    height: '1px',
    borderTop: '2px dashed rgba(0, 51, 255, 0.15)',
    zIndex: 0,
  },
};

// Inject responsive styles
if (typeof document !== 'undefined') {
  const id = 'how-it-works-responsive';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 1024px) {
        .how-it-works-connector { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}

export default HowItWorks;
