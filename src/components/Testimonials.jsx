import React, { useState } from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Maria Santos',
    location: 'Manila, NCR',
    initials: 'MS',
    color: '#0033FF',
    rating: 5,
    quote:
      'DRIVE PH made our Baguio road trip absolutely stress-free. The SUV was spotless, fully fueled, and the GPS tracking gave my family peace of mind the entire way. Will definitely book again!',
  },
  {
    name: 'James Reyes',
    location: 'Cebu City',
    initials: 'JR',
    color: '#6644FF',
    rating: 5,
    quote:
      'I needed a car for a week-long business trip around Visayas. The booking process took less than 5 minutes, and the 24/7 support was incredible when I needed to extend my rental. Top-notch service.',
  },
  {
    name: 'Angela Cruz',
    location: 'Davao City',
    initials: 'AC',
    color: '#0066CC',
    rating: 5,
    quote:
      'As a first-time renter, I was nervous — but DRIVE PH\'s team walked me through everything. The car was in perfect condition, the pricing was transparent, and the whole experience felt premium.',
  },
];

const Testimonials = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <section style={styles.section}>
      <div className="container">
        <div style={styles.header} className="fade-in">
          <p style={styles.label}>TESTIMONIALS</p>
          <h2 style={styles.heading}>
            What Our{' '}
            <span style={styles.headingAccent}>Drivers</span> Say
          </h2>
          <p style={styles.subheading}>
            Real stories from real customers across the Philippines.
          </p>
        </div>

        <div className="responsive-grid-3">
          {testimonials.map((t, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={t.name}
                className="fade-in"
                style={{
                  ...styles.card,
                  ...(isHovered ? styles.cardHover : {}),
                  borderLeftColor: t.color,
                  animationDelay: `${0.15 * index}s`,
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Quote icon */}
                <div style={styles.quoteIconWrap}>
                  <Quote size={20} color="rgba(0, 51, 255, 0.3)" strokeWidth={1.5} />
                </div>

                {/* Stars */}
                <div style={styles.stars}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      fill="#FFB800"
                      color="#FFB800"
                      strokeWidth={0}
                    />
                  ))}
                </div>

                {/* Quote text */}
                <p style={styles.quoteText}>"{t.quote}"</p>

                {/* Author */}
                <div style={styles.author}>
                  <div
                    style={{
                      ...styles.avatar,
                      backgroundColor: t.color,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p style={styles.authorName}>{t.name}</p>
                    <p style={styles.authorLocation}>{t.location}</p>
                  </div>
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
    backgroundColor: '#111111',
  },
  header: {
    textAlign: 'center',
    marginBottom: '4rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    color: 'rgba(0, 51, 255, 0.7)',
    marginBottom: '1rem',
    fontFamily: 'var(--font-primary)',
  },
  heading: {
    fontSize: '3rem',
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)',
    lineHeight: 1.15,
    marginBottom: '1rem',
  },
  headingAccent: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    color: '#6688FF',
  },
  subheading: {
    fontSize: '1.05rem',
    color: 'rgba(255, 255, 255, 0.45)',
    maxWidth: '440px',
    margin: '0 auto',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1.75rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '2.25rem 2rem',
    borderLeft: '3px solid',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
    height: '100%',
  },
  cardHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: 'translateY(-4px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3)',
  },
  quoteIconWrap: {
    marginBottom: '1rem',
  },
  stars: {
    display: 'flex',
    gap: '3px',
    marginBottom: '1.25rem',
  },
  quoteText: {
    fontSize: '0.95rem',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 1.7,
    marginBottom: '2rem',
    fontStyle: 'italic',
    flexGrow: 1,
  },
  author: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '1.25rem',
  },
  avatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    fontFamily: 'var(--font-primary)',
  },
  authorName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
    fontFamily: 'var(--font-primary)',
  },
  authorLocation: {
    fontSize: '0.78rem',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: '2px',
  },
};

export default Testimonials;
