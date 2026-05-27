import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardPath } from '../utils/userProfile';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const location = useLocation();
  const isRegisterPage = location.pathname === '/register';
  const [isLogin, setIsLogin] = useState(!isRegisterPage);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register, resetPassword } = useAuth();

  useEffect(() => {
    setIsLogin(location.pathname !== '/register');
    setError('');
    setInfo('');
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      let profile = { role: 'customer' };
      if (isLogin) {
        const result = await login(email, password);
        profile = result.profile || { role: result.role };
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }
        const result = await register(email, password, name.trim());
        profile = { role: result.role };
      }
      navigate(getDashboardPath(profile));
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try signing in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address first, then click Forgot password.');
      return;
    }
    setError('');
    setInfo('');
    try {
      await resetPassword(email.trim());
      setInfo('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err.message || 'Could not send reset email.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="fade-in">
        <div style={styles.logoArea}>
          <span style={styles.logoMark}>//</span> DRIVE PH
        </div>

        <h2 style={styles.title}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
        <p style={styles.subtitle}>
          {isLogin ? 'Enter your credentials to access the dashboard' : 'Register as a customer to book vehicles'}
        </p>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div style={styles.infoBox}>
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={18} color="#888" />
                <input
                  type="text"
                  placeholder="Juan Dela Cruz"
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#888" />
              <input
                type="email"
                placeholder="you@email.com"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#888" />
              <input
                type="password"
                placeholder="••••••••"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {isLogin && (
              <button type="button" style={styles.forgotBtn} onClick={handleForgotPassword}>
                Forgot password?
              </button>
            )}
          </div>

          <button type="submit" style={styles.submitBtn} className="btn-hover" disabled={loading}>
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'} <span style={styles.arrow}>→</span>
              </>
            )}
          </button>
        </form>

        <div style={styles.toggleArea}>
          <span style={{ color: '#666', fontSize: '0.85rem' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            style={styles.toggleBtn}
            onClick={() => navigate(isLogin ? '/register' : '/login')}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#FFF',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  logoArea: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#111',
  },
  logoMark: {
    color: '#0033FF',
    fontFamily: 'var(--font-primary)',
    fontWeight: 600,
    fontStyle: 'italic',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#111',
    textAlign: 'center',
    marginBottom: '-0.5rem',
  },
  subtitle: {
    color: '#888',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1rem',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    backgroundColor: '#FAFAFA',
    transition: 'border-color 0.2s ease',
    position: 'relative',
  },
  input: {
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-primary)',
    backgroundColor: 'transparent',
    width: '100%',
    color: '#111',
  },
  forgotBtn: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    color: '#0033FF',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '0.25rem 0 0',
  },
  submitBtn: {
    backgroundColor: '#111',
    color: '#FFF',
    padding: '1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '0.5rem',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
  },
  arrow: {
    transition: 'transform 0.3s ease',
    fontSize: '1.1rem',
  },
  spinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#FFF',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  toggleArea: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    borderTop: '1px solid #F0F0F0',
    paddingTop: '1.5rem',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#0033FF',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: 0,
  },
};

export default Login;
