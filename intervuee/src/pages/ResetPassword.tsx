import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

type PageStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'invalid_link';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Supabase email link click fires PASSWORD_RECOVERY event
  // Hash sets session automatically
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is authenticated, allow password update
        setPageStatus('ready');
      } else if (event === 'SIGNED_IN' && session) {
        // SIGNED_IN also fires in some recovery flows
        setPageStatus('ready');
      }
    });

    // Check if URL has valid hash/token
    // If no hash/token, user landed directly on the page
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    
    if (!hash && !params.get('token') && !params.get('code')) {
      // Wait briefly for auth state
      const timer = setTimeout(() => {
        // If not ready within 3 seconds, show invalid link
        setPageStatus((prev) => prev === 'loading' ? 'invalid_link' : prev);
      }, 3000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please try again.');
      return;
    }

    setPageStatus('submitting');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setPageStatus('ready');
      return;
    }

    // Sign out user so they log in fresh with the new password
    await supabase.auth.signOut();
    setPageStatus('success');

    // Redirect to login after 3 seconds
    setTimeout(() => navigate('/login'), 3000);
  };

  // Password strength checker
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '#e2e8f0', width: '0%' };
    if (pwd.length < 6) return { label: 'Very Weak', color: '#ef4444', width: '20%' };
    if (pwd.length < 8) return { label: 'Weak', color: '#f97316', width: '40%' };
    if (pwd.length < 12) return { label: 'Good', color: '#eab308', width: '65%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) {
      return { label: 'Strong 💪', color: '#22c55e', width: '100%' };
    }
    return { label: 'Strong', color: '#3b82f6', width: '85%' };
  };

  const strength = getPasswordStrength(password);

  return (
    <div style={styles.root}>
      <div style={styles.heroBg} />

      <Link to="/login" style={styles.backBtn}>
        <ArrowLeft size={18} />
      </Link>

      <div style={styles.hero}>
        <div style={styles.logoChip}>
          <img
            src="/roundora-logo.jpg"
            alt="Roundora"
            style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={styles.logoText}>Roundora</span>
        </div>
        <h1 style={styles.heroTitle}>Set New Password 🔑</h1>
        <p style={styles.heroSub}>Choose a strong password for your account</p>
      </div>

      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />

        {/* LOADING STATE */}
        {pageStatus === 'loading' && (
          <div style={styles.centerContent}>
            <div style={styles.spinner} />
            <p style={{ color: '#64748b', marginTop: '16px', fontSize: '14px' }}>
              Verifying your reset link...
            </p>
          </div>
        )}

        {/* INVALID LINK STATE */}
        {pageStatus === 'invalid_link' && (
          <div style={styles.centerContent}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fff1f2', border: '2px solid #fecdd3' }}>
              <AlertCircle size={40} color="#be123c" />
            </div>
            <h2 style={{ ...styles.stateTitle, color: '#be123c' }}>Invalid or Expired Link ❌</h2>
            <p style={styles.stateDesc}>
              This password reset link has expired or is invalid. Please request a new reset link.
            </p>
            <Link to="/forgot-password" style={styles.ctaLink}>
              🔄 Request New Reset Link
            </Link>
            <Link to="/login" style={styles.secondaryLink}>
              ← Back to Login
            </Link>
          </div>
        )}

        {/* SUCCESS STATE */}
        {pageStatus === 'success' && (
          <div style={styles.centerContent}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h2 style={styles.stateTitle}>Password Reset Successfully! 🎉</h2>
            <p style={styles.stateDesc}>
              Your new password has been set. You can now log in using your new password.
            </p>
            <div style={styles.autoRedirectBadge}>
              ⏳ Redirecting to login page in 3 seconds...
            </div>
            <Link to="/login" style={styles.ctaLink}>
              → Log In Now
            </Link>
          </div>
        )}

        {/* FORM STATE (ready / submitting / error) */}
        {(pageStatus === 'ready' || pageStatus === 'submitting') && (
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Info card */}
            <div style={styles.infoCard}>
              <Lock size={18} color="#1e40af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                <strong>Tip:</strong> A strong password should contain uppercase letters, numbers, and special characters (@#$!).
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* New Password */}
            <div style={styles.fieldGroup}>
              <label htmlFor="new-password" style={styles.fieldLabel}>New Password</label>
              <div style={styles.passwordWrap}>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: '48px' }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
                  disabled={pageStatus === 'submitting'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword
                    ? <EyeOff size={18} color="#94a3b8" />
                    : <Eye size={18} color="#94a3b8" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div style={styles.strengthBar}>
                    <div style={{
                      height: '100%', borderRadius: '4px',
                      width: strength.width,
                      backgroundColor: strength.color,
                      transition: 'width 0.3s ease, background-color 0.3s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', color: strength.color, fontWeight: '600', marginTop: '4px', display: 'block' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div style={styles.fieldGroup}>
              <label htmlFor="confirm-password" style={styles.fieldLabel}>Confirm Password</label>
              <div style={styles.passwordWrap}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    ...styles.input, paddingRight: '48px',
                    ...(confirmPassword && confirmPassword !== password
                      ? { borderColor: '#f87171' }
                      : confirmPassword && confirmPassword === password
                        ? { borderColor: '#4ade80' }
                        : {}),
                  }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
                  disabled={pageStatus === 'submitting'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  {showConfirmPassword
                    ? <EyeOff size={18} color="#94a3b8" />
                    : <Eye size={18} color="#94a3b8" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <span style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                  ❌ Passwords do not match
                </span>
              )}
              {confirmPassword && confirmPassword === password && (
                <span style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                  ✅ Passwords match
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={pageStatus === 'submitting'}
              style={{
                ...styles.ctaBtn,
                opacity: pageStatus === 'submitting' ? 0.7 : 1,
                cursor: pageStatus === 'submitting' ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              {pageStatus === 'submitting' ? (
                <>
                  <span style={styles.spinnerWhite} /> Updating Password...
                </>
              ) : (
                '🔐 Update Password'
              )}
            </button>
          </form>
        )}
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
    top: 0, left: 0, right: 0,
    height: '45%',
    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #7c3aed 100%)',
    borderRadius: '0 0 40px 40px',
    zIndex: 0,
  },
  backBtn: {
    position: 'absolute',
    top: '16px', left: '16px', zIndex: 10,
    width: '36px', height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', textDecoration: 'none',
    backdropFilter: 'blur(8px)',
  },
  hero: {
    position: 'relative', zIndex: 1,
    paddingTop: '64px', paddingBottom: '24px',
    textAlign: 'center', paddingLeft: '24px', paddingRight: '24px',
  },
  logoChip: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
    borderRadius: '20px', padding: '6px 14px', marginBottom: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  logoText: { color: '#fff', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' },
  heroTitle: {
    color: '#fff', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: '800',
    margin: '0 0 8px 0', lineHeight: 1.2, letterSpacing: '-0.5px',
  },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: '14px', margin: 0 },
  sheet: {
    position: 'relative', zIndex: 2, flex: 1,
    backgroundColor: '#fff', borderRadius: '28px 28px 0 0',
    marginTop: '8px', padding: '16px 20px 40px',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', overflowY: 'auto',
  },
  sheetHandle: {
    width: '40px', height: '4px', backgroundColor: '#e2e8f0',
    borderRadius: '2px', margin: '0 auto 24px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  infoCard: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
    borderRadius: '14px', padding: '14px 16px',
  },
  errorBox: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    backgroundColor: '#fff1f2', border: '1px solid #fecdd3',
    borderRadius: '12px', padding: '10px 12px',
    color: '#be123c', fontSize: '13px',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldLabel: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  input: {
    width: '100%', padding: '13px 14px', borderRadius: '12px',
    border: '1.5px solid #e2e8f0', fontSize: '15px', color: '#0f172a',
    backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s', WebkitAppearance: 'none',
  },
  inputFocus: { borderColor: '#6366f1', backgroundColor: '#fff', boxShadow: '0 0 0 3px rgba(99,102,241,0.1)' },
  inputBlur: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc', boxShadow: 'none' },
  passwordWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    display: 'flex', alignItems: 'center',
  },
  strengthBar: {
    width: '100%', height: '4px', backgroundColor: '#e2e8f0',
    borderRadius: '4px', overflow: 'hidden',
  },
  ctaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', padding: '15px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '16px', fontWeight: '700', border: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    letterSpacing: '0.2px', transition: 'opacity 0.15s',
  },
  // Center content for states
  centerContent: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', paddingTop: '8px', textAlign: 'center',
  },
  iconCircle: {
    width: '80px', height: '80px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stateTitle: {
    fontSize: '22px', fontWeight: '800', color: '#0f172a',
    margin: 0, letterSpacing: '-0.5px',
  },
  stateDesc: {
    fontSize: '14px', color: '#475569', lineHeight: 1.6,
    margin: 0, maxWidth: '320px',
  },
  autoRedirectBadge: {
    backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
    borderRadius: '10px', padding: '10px 16px',
    fontSize: '13px', color: '#166534', fontWeight: '500',
  },
  ctaLink: {
    display: 'block', width: '100%', padding: '15px', textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '15px', fontWeight: '700',
    borderRadius: '14px', textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
  },
  secondaryLink: {
    color: '#4f46e5', fontWeight: '600', fontSize: '14px',
    textDecoration: 'none',
  },
  spinner: {
    width: '32px', height: '32px',
    border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerWhite: {
    display: 'inline-block', width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
