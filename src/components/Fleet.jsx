import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowRight, Fuel, Users, Gauge } from 'lucide-react';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=300&q=80';

const Fleet = () => {
  const navigate = useNavigate();
  const [fleetData, setFleetData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'vehicles'));
        const list = [];
        let index = 0;
        snap.forEach((d) => {
          const v = d.data();
          if (v.status === 'Available') {
            list.push({
              id: String(index + 1).padStart(2, '0'),
              brand: v.brand || 'Unknown',
              model: v.model || 'Model',
              seats: v.seats || '—',
              fuel: v.fuel || 'Gasoline',
              transmission: v.transmission || 'Automatic',
              image: v.image || DEFAULT_IMAGE,
            });
            index++;
          }
        });
        setFleetData(list.slice(0, 6));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section style={styles.section} id="fleet">
      <div className="container">
        {/* Section header */}
        <div style={styles.sectionHeader} className="fade-in">
          <div>
            <div style={styles.sectionTag}>OUR COLLECTION</div>
            <h2 style={styles.heading}>
              The <span style={styles.headingAccent}>Fleet</span>
            </h2>
          </div>
          <p style={styles.sectionDesc}>
            Explore our curated selection of premium vehicles, from compact city cars
            to luxury SUVs — all meticulously maintained for your comfort.
          </p>
        </div>

        {loading && (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <span>Loading fleet...</span>
          </div>
        )}

        {!loading && fleetData.length === 0 && (
          <div style={styles.emptyState} className="fade-in">
            <p style={{ color: '#888', fontSize: '1.1rem' }}>
              Fleet coming soon — register to browse all vehicles.
            </p>
            <button
              type="button"
              style={styles.emptyBtn}
              onClick={() => navigate('/register')}
            >
              Get Started <ArrowRight size={16} />
            </button>
          </div>
        )}

        <div style={styles.list}>
          {fleetData.map((car, index) => (
            <div
              key={car.id}
              style={{ ...styles.carRow, animationDelay: `${0.15 * index}s` }}
              className="fade-in fleet-row-hover landing-car-row"
            >
              <div style={styles.idBadge}>
                <span style={styles.idText}>{car.id}</span>
              </div>

              <div style={styles.thumbnail}>
                <img src={car.image} alt={car.model} style={styles.thumbImage} />
              </div>

              <div style={styles.details}>
                <div style={styles.brand}>{car.brand}</div>
                <div style={styles.model}>{car.model}</div>
              </div>

              <div style={styles.specsGroup} className="landing-car-specs">
                <div style={styles.specItem}>
                  <Users size={14} style={{ color: 'var(--accent-color)' }} />
                  <span>{car.seats} Seats</span>
                </div>
                <div style={styles.specItem}>
                  <Fuel size={14} style={{ color: 'var(--accent-color)' }} />
                  <span>{car.fuel}</span>
                </div>
                <div style={styles.specItem}>
                  <Gauge size={14} style={{ color: 'var(--accent-color)' }} />
                  <span>{car.transmission}</span>
                </div>
              </div>

              <button
                type="button"
                style={styles.reserveBtn}
                className="fleet-book-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/register');
                }}
              >
                Request Access
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>

        {!loading && fleetData.length > 0 && (
          <div style={styles.viewAll} className="fade-in">
            <button
              type="button"
              style={styles.viewAllBtn}
              className="btn-hover-glow"
              onClick={() => navigate('/register')}
            >
              View All Vehicles
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const styles = {
  section: {
    padding: '7rem 0',
    background: '#fff',
    position: 'relative',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '4rem',
    gap: '2rem',
    flexWrap: 'wrap',
  },
  sectionTag: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: 'var(--accent-color)',
    fontWeight: 700,
    marginBottom: '0.75rem',
  },
  heading: {
    fontSize: '3rem',
    fontWeight: 800,
    color: '#111',
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  headingAccent: {
    fontFamily: 'var(--font-display)',
    fontStyle: 'italic',
    fontWeight: 400,
    fontSize: '3.2rem',
    background: 'linear-gradient(135deg, #0033FF, #4466FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  sectionDesc: {
    fontSize: '1rem',
    color: '#777',
    maxWidth: '380px',
    lineHeight: 1.7,
    textAlign: 'right',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    justifyContent: 'center',
    padding: '4rem 0',
    color: '#888',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #eee',
    borderTop: '2px solid var(--accent-color)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  emptyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #0033FF, #1a0066)',
    color: '#fff',
    padding: '0.9rem 2rem',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  carRow: {
    display: 'grid',
    gridTemplateColumns: '60px 100px 1.5fr 1fr auto',
    alignItems: 'center',
    padding: '1.75rem 1.5rem',
    borderBottom: '1px solid #f0f0f0',
    gap: '2rem',
    transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
    borderRadius: '12px',
    margin: '0 -1.5rem',
  },
  idBadge: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #f0f2ff, #e8ecff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idText: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: 'var(--accent-color)',
    fontWeight: 700,
  },
  thumbnail: {
    width: '100px',
    height: '60px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f5f5f7',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  details: {},
  brand: {
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: '#999',
    marginBottom: '0.2rem',
    fontWeight: 600,
  },
  model: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#111',
    letterSpacing: '-0.01em',
  },
  specsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  specItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.82rem',
    color: '#666',
    fontWeight: 500,
  },
  reserveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'transparent',
    border: '2px solid #e0e0e0',
    color: '#333',
    padding: '0.7rem 1.5rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    borderRadius: '10px',
  },
  viewAll: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '3rem',
  },
  viewAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'linear-gradient(135deg, #0033FF, #1a0066)',
    color: '#fff',
    padding: '1rem 2.5rem',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    boxShadow: '0 4px 20px rgba(0,51,255,0.25)',
    transition: 'all 0.3s ease',
  },
};

// Inject row hover styles
if (typeof document !== 'undefined') {
  const id = 'fleet-row-hover-styles';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .fleet-row-hover:hover {
        background: linear-gradient(135deg, #f8f9ff, #f0f2ff) !important;
        transform: translateX(8px);
        box-shadow: 0 4px 20px rgba(0,51,255,0.06);
      }
      .fleet-row-hover:hover .fleet-book-btn {
        background: linear-gradient(135deg, #0033FF, #0066FF) !important;
        border-color: #0033FF !important;
        color: #fff !important;
        box-shadow: 0 4px 15px rgba(0,51,255,0.3);
      }
      .btn-hover-glow:hover {
        box-shadow: 0 6px 30px rgba(0,51,255,0.4) !important;
        transform: translateY(-2px);
      }
      @media (max-width: 768px) {
        .landing-car-row {
          grid-template-columns: 1fr !important;
          gap: 1.25rem !important;
          padding: 1.5rem !important;
        }
        .landing-car-row > div:nth-child(1) {
          display: none !important;
        }
        .landing-car-row > div:nth-child(2) {
          width: 100% !important;
          height: 180px !important;
        }
        .landing-car-specs {
          flex-wrap: wrap !important;
          gap: 1rem !important;
        }
        .fleet-book-btn {
          width: 100% !important;
          justify-content: center !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Fleet;
