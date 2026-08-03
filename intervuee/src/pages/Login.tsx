import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const initialize = useAuthStore((s) => s.initialize);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    await initialize();
    navigate('/dashboard');
  };

  return (
    <div style={styles.root}>
      {/* Hero gradient */}
      <div style={styles.heroBg} />

      {/* Back button */}
      <Link to="/" style={styles.backBtn}>
        <ArrowLeft size={18} />
      </Link>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.logoChip}>
          <Sparkles size={16} color="#fff" />
          <span style={styles.logoText}>Intervuee</span>
        </div>
        <h1 style={styles.heroTitle}>Welcome Back! 👋</h1>
        <p style={styles.heroSub}>Login to continue your interview prep</p>
      </div>

      {/* Bottom sheet */}
      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />
        <h2 style={styles.sheetTitle}>Log In</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
            />
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.fieldLabel}>Password</label>
              <span style={styles.forgotLink}>Forgot password?</span>
            </div>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: '48px' }}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.ctaBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
          >
            {loading ? 'Logging in...' : 'Log In →'}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Google button placeholder */}
        <button style={styles.googleBtn} disabled>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google (Coming Soon)
        </button>

        <p style={styles.signupLink}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.signupLinkAnchor}>Sign Up Free</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100dvh',
    backgroundColor: '#0f0f1a',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #7c3aed 100%)',
    borderRadius: '0 0 40px 40px',
    zIndex: 0,
  },
  backBtn: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 10,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    textDecoration: 'none',
    backdropFilter: 'blur(8px)',
  },
  hero: {
    position: 'relative',
    zIndex: 1,
    paddingTop: '64px',
    paddingBottom: '24px',
    textAlign: 'center',
    paddingLeft: '24px',
    paddingRight: '24px',
  },
  logoChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    padding: '6px 14px',
    marginBottom: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  logoText: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 'clamp(26px, 6vw, 32px)',
    fontWeight: '800',
    margin: '0 0 8px 0',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '14px',
    margin: 0,
  },
  sheet: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '28px 28px 0 0',
    marginTop: '8px',
    padding: '16px 20px 40px',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
    overflowY: 'auto',
  },
  sheetHandle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    margin: '0 auto 20px',
  },
  sheetTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '0 0 20px 0',
    letterSpacing: '-0.3px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: '12px',
    padding: '10px 12px',
    color: '#be123c',
    fontSize: '13px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#6366f1',
    fontWeight: '600',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '15px',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
    WebkitAppearance: 'none',
  },
  inputFocus: {
    borderColor: '#6366f1',
    backgroundColor: '#fff',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.1)',
  },
  inputBlur: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    boxShadow: 'none',
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  ctaBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '15px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    letterSpacing: '0.2px',
    transition: 'opacity 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: '500',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '13px',
    borderRadius: '14px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  signupLink: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#64748b',
    marginTop: '20px',
  },
  signupLinkAnchor: {
    color: '#4f46e5',
    fontWeight: '700',
    textDecoration: 'none',
  },
};
