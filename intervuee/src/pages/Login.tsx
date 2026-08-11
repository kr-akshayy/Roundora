import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, ArrowLeft, Mail, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';

type LoginMode = 'password' | 'otp';

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('password');

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const navigate = useNavigate();
  const initialize = useAuthStore((s) => s.initialize);

  // ── Password login ──────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendStatus(null);
    setLoading(true);

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInErr) {
      const isUnconfirmed =
        signInErr.message?.toLowerCase().includes('email not confirmed') ||
        signInErr.message?.toLowerCase().includes('not confirmed');
      if (isUnconfirmed) {
        setError('📧 Email not confirmed. Please check your inbox/spam folder or click resend below.');
        setShowResend(true);
      } else {
        setError(signInErr.message);
      }
      return;
    }
    await initialize();
    navigate('/dashboard');
  };

  const handleResendConfirmation = async () => {
    if (!email) { setError('Please enter your email address first.'); return; }
    setResendLoading(true);
    setResendStatus(null);
    const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
    setResendLoading(false);
    if (resendErr) {
      setResendStatus(`❌ Error: ${resendErr.message}`);
    } else {
      setResendStatus('✅ Confirmation link sent to your email! Please check your inbox.');
    }
  };

  // ── OTP login ───────────────────────────────────────────────
  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpEmail) return;
    setOtpError(null);
    setOtpLoading(true);

    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: otpEmail,
      options: {
        shouldCreateUser: false, // Only existing users can login with OTP
      },
    });

    setOtpLoading(false);
    if (otpErr) {
      // If user not found, give helpful message
      if (otpErr.message?.toLowerCase().includes('signups not allowed') ||
          otpErr.message?.toLowerCase().includes('user not found') ||
          otpErr.message?.toLowerCase().includes('email not found')) {
        setOtpError('This email is not registered. Please sign up first.');
      } else {
        setOtpError(otpErr.message);
      }
      return;
    }
    setOtpSent(true);
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Please enter a 6-digit OTP code.');
      return;
    }
    setOtpError(null);
    setOtpVerifying(true);

    let { error: verifyErr } = await supabase.auth.verifyOtp({
      email: otpEmail,
      token: otpCode,
      type: 'email',
    });

    if (verifyErr) {
      const res = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'magiclink',
      });
      verifyErr = res.error;
    }

    setOtpVerifying(false);
    if (verifyErr) {
      if (verifyErr.message?.toLowerCase().includes('expired') ||
          verifyErr.message?.toLowerCase().includes('invalid')) {
        setOtpError('❌ Invalid or expired OTP. Please request a new code.');
      } else {
        setOtpError(verifyErr.message);
      }
      return;
    }

    await initialize();
    navigate('/dashboard');
  };

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setError(null);
    setOtpError(null);
    setOtpSent(false);
    setOtpCode('');
    setOtpEmail('');
    setResendStatus(null);
    setShowResend(false);
  };

  return (
    <div style={styles.root}>
      <div style={styles.heroBg} />

      <Link to="/" style={styles.backBtn}>
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
        <h1 style={styles.heroTitle}>Welcome Back! 👋</h1>
        <p style={styles.heroSub}>Login to continue your interview prep</p>
      </div>

      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />

        {/* Mode Toggle Tabs */}
        <div style={styles.tabRow}>
          <button
            onClick={() => switchMode('password')}
            style={{ ...styles.tab, ...(mode === 'password' ? styles.tabActive : {}) }}
          >
            <KeyRound size={14} />
            Password
          </button>
          <button
            onClick={() => switchMode('otp')}
            style={{ ...styles.tab, ...(mode === 'otp' ? styles.tabActive : {}) }}
          >
            <Mail size={14} />
            Email OTP
          </button>
        </div>

        {/* ── PASSWORD MODE ── */}
        {mode === 'password' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            {showResend && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                style={styles.resendBtn}
              >
                {resendLoading ? 'Sending...' : '✉️ Resend Confirmation Email'}
              </button>
            )}
            {resendStatus && (
              <div style={{
                backgroundColor: resendStatus.startsWith('✅') ? '#f0fdf4' : '#fff1f2',
                color: resendStatus.startsWith('✅') ? '#166534' : '#be123c',
                border: `1px solid ${resendStatus.startsWith('✅') ? '#bbf7d0' : '#fecdd3'}`,
                borderRadius: '12px', padding: '10px 12px', fontSize: '13px',
              }}>
                {resendStatus}
              </div>
            )}

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" style={styles.input}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
              />
            </div>

            <div style={styles.fieldGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.fieldLabel}>Password</label>
                <Link
                  to="/forgot-password"
                  style={styles.forgotLink}
                >
                  Forgot Password? →
                </Link>
              </div>
              <div style={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: '48px' }}
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.ctaBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {loading ? 'Logging in...' : 'Log In →'}
            </button>
          </form>
        )}

        {/* ── OTP MODE ── */}
        {mode === 'otp' && (
          <div style={styles.form}>
            {!otpSent ? (
              /* Step 1: Enter email → Send OTP */
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <div style={{ fontWeight: '700', marginBottom: '3px' }}>Email OTP Login</div>
                    <div style={{ lineHeight: 1.5 }}>
                      Enter your email → Receive 6-digit OTP in inbox → Enter code to log in instantly.
                    </div>
                  </div>
                </div>

                {otpError && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{otpError}</span>
                  </div>
                )}

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Email Address</label>
                  <input
                    type="email" required value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="you@example.com" style={styles.input}
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
                  />
                </div>

                <button
                  type="submit" disabled={otpLoading}
                  style={{ ...styles.ctaBtn, opacity: otpLoading ? 0.7 : 1, cursor: otpLoading ? 'not-allowed' : 'pointer' }}
                >
                  {otpLoading ? 'Sending OTP...' : '📧 Send OTP to Email'}
                </button>
              </form>
            ) : (
              /* Step 2: Enter OTP code */
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  color: '#166534',
                }}>
                  <div style={{ fontWeight: '700', marginBottom: '3px' }}>✅ OTP Sent!</div>
                  <div style={{ lineHeight: 1.5 }}>
                    A 6-digit OTP code was sent to <strong>{otpEmail}</strong>.
                    Please check your inbox (and spam folder).
                  </div>
                </div>

                {otpError && (
                  <div style={styles.errorBox}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{otpError}</span>
                  </div>
                )}

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>6-Digit OTP Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="_ _ _ _ _ _"
                    style={{
                      ...styles.input,
                      fontSize: '28px',
                      fontWeight: '800',
                      letterSpacing: '12px',
                      textAlign: 'center',
                      padding: '16px 14px',
                    }}
                    onFocus={(e) => Object.assign(e.target.style, { ...styles.inputFocus, fontSize: '28px', fontWeight: '800', letterSpacing: '12px', textAlign: 'center' })}
                    onBlur={(e) => Object.assign(e.target.style, { ...styles.inputBlur, fontSize: '28px', fontWeight: '800', letterSpacing: '12px', textAlign: 'center' })}
                    autoFocus
                  />
                  <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                    OTP expires in 10 minutes
                  </div>
                </div>

                <button
                  type="submit" disabled={otpVerifying || otpCode.length < 6}
                  style={{ ...styles.ctaBtn, opacity: (otpVerifying || otpCode.length < 6) ? 0.6 : 1, cursor: (otpVerifying || otpCode.length < 6) ? 'not-allowed' : 'pointer' }}
                >
                  {otpVerifying ? 'Verifying...' : '✓ Verify & Login'}
                </button>

                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); setOtpError(null); }}
                  style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'center' }}
                >
                  ← Resend OTP
                </button>
              </form>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

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
    top: 0, left: 0, right: 0,
    height: '45%',
    background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 40%, #7c3aed 100%)',
    borderRadius: '0 0 40px 40px',
    zIndex: 0,
  },
  backBtn: {
    position: 'absolute',
    top: '16px', left: '16px',
    zIndex: 10,
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
    color: '#fff', fontSize: 'clamp(26px, 6vw, 32px)', fontWeight: '800',
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
    borderRadius: '2px', margin: '0 auto 20px',
  },
  tabRow: {
    display: 'flex', gap: '8px',
    backgroundColor: '#f1f5f9', borderRadius: '14px', padding: '4px',
    marginBottom: '20px',
  },
  tab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '10px', borderRadius: '10px', border: 'none',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    backgroundColor: 'transparent', color: '#94a3b8', transition: 'all 0.15s',
  },
  tabActive: {
    backgroundColor: '#fff', color: '#4f46e5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  errorBox: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    backgroundColor: '#fff1f2', border: '1px solid #fecdd3',
    borderRadius: '12px', padding: '10px 12px',
    color: '#be123c', fontSize: '13px',
  },
  resendBtn: {
    backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe',
    padding: '10px 14px', borderRadius: '12px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldLabel: { fontSize: '13px', fontWeight: '600', color: '#374151' },
  forgotLink: { fontSize: '11px', color: '#6366f1', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' },
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
  ctaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '15px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '16px', fontWeight: '700', border: 'none',
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    letterSpacing: '0.2px', transition: 'opacity 0.15s',
  },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  googleBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '13px', borderRadius: '14px',
    border: '1.5px solid #e2e8f0', backgroundColor: '#fff',
    color: '#374151', fontSize: '14px', fontWeight: '600',
    cursor: 'not-allowed', opacity: 0.6,
  },
  signupLink: { textAlign: 'center' as const, fontSize: '14px', color: '#64748b', marginTop: '20px' },
  signupLinkAnchor: { color: '#4f46e5', fontWeight: '700', textDecoration: 'none' },
};
