import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, GraduationCap, Briefcase, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

function getErrorMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err || 'An unknown error occurred.';
  if (err instanceof Error) return err.message || err.name || 'An unexpected error occurred.';
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    const msg = e.message ?? e.msg ?? e.error_description ?? e.error ?? e.name;
    if (typeof msg === 'string' && msg.trim()) return msg;
    const str = String(err);
    return str !== '[object Object]' ? str : 'An unexpected error occurred.';
  }
  return String(err);
}

export default function Signup() {
  const [role, setRole] = useState<UserRole>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  const [otpCode, setOtpCode] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (signUpError) {
      console.error('[Signup] signUpError:', signUpError);
      const isRateLimit =
        signUpError.message?.toLowerCase().includes('rate limit') ||
        (signUpError as { code?: string }).code === 'over_email_send_rate_limit';
      const isUnconfirmed =
        signUpError.message?.toLowerCase().includes('email not confirmed') ||
        signUpError.message?.toLowerCase().includes('not confirmed');

      if (isRateLimit) {
        setError('⏳ बहुत ज़्यादा signup attempts हो गए। 5-10 मिनट बाद try करें, या एक अलग email use करें।');
      } else if (isUnconfirmed) {
        setError('📧 Email confirm नहीं हुआ है। आपकी email पर verification link/OTP भेजा गया है। Code दर्ज करें या नीचे resend करें।');
        setDone(true);
      } else {
        setError(getErrorMessage(signUpError));
      }
      setLoading(false);
      return;
    }

    if (data.user && data.user.identities?.length === 0) {
      setError('This email is already registered. Please log in instead.');
      setLoading(false);
      return;
    }

    if (data.session && data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        role,
      });
      if (profileError) {
        console.error('[Signup] profileError:', profileError);
        setError(getErrorMessage(profileError) || 'Failed to create profile. Please try again.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    if (data.session) {
      navigate('/dashboard');
    } else {
      setDone(true);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setOtpError('6-digit OTP code enter karein.');
      return;
    }
    setOtpError(null);
    setOtpVerifying(true);

    let { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });

    if (verifyErr) {
      const res = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });
      verifyData = res.data;
      verifyErr = res.error;
    }

    setOtpVerifying(false);
    if (verifyErr) {
      setOtpError(getErrorMessage(verifyErr));
      return;
    }

    if (verifyData.user) {
      await supabase.from('profiles').upsert({
        id: verifyData.user.id,
        full_name: fullName,
        role,
      });
    }

    navigate('/dashboard');
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendStatus(null);
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResendLoading(false);
    if (resendErr) {
      setResendStatus(`❌ Resend failed: ${getErrorMessage(resendErr)}`);
    } else {
      setResendStatus('✅ Naya OTP / confirmation link aapki email par bhej diya gaya hai! Inbox check karein.');
    }
  };

  if (done) {
    return (
      <div style={styles.root}>
        <div style={styles.heroBg} />
        <div style={styles.doneCard}>
          <div style={styles.doneIcon}>✉️</div>
          <h1 style={styles.doneTitle}>Check your email!</h1>
          <p style={styles.doneSub}>
            We sent a 6-digit OTP code to <strong>{email}</strong>. Enter it below or click the link in your email.
          </p>

          <form onSubmit={handleVerifyOtp} style={{ width: '100%', maxWidth: '320px', margin: '0 auto 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {otpError && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                {otpError}
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="_ _ _ _ _ _"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '24px',
                fontWeight: '800',
                letterSpacing: '10px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={otpVerifying || otpCode.length < 6}
              style={{
                ...styles.ctaBtn,
                opacity: (otpVerifying || otpCode.length < 6) ? 0.6 : 1,
                cursor: (otpVerifying || otpCode.length < 6) ? 'not-allowed' : 'pointer',
              }}
            >
              {otpVerifying ? 'Verifying...' : 'Verify OTP & Continue →'}
            </button>
          </form>

          {resendStatus && (
            <p style={{
              color: resendStatus.startsWith('✅') ? '#4ade80' : '#f87171',
              fontSize: '13px',
              marginBottom: '16px',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
            }}>
              {resendStatus}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: resendLoading ? 'not-allowed' : 'pointer',
                opacity: resendLoading ? 0.7 : 1,
              }}
            >
              {resendLoading ? 'Sending...' : 'Resend OTP / Link'}
            </button>
            <Link to="/login" style={{ ...styles.ctaBtn, backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Hero gradient background */}
      <div style={styles.heroBg} />

      {/* Back button */}
      <Link to="/" style={styles.backBtn}>
        <ArrowLeft size={18} />
      </Link>

      {/* Hero section */}
      <div style={styles.hero}>
        <div style={styles.logoChip}>
          <img
            src="/roundora-logo.jpg"
            alt="Roundora"
            style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
          />
          <span style={styles.logoText}>Roundora</span>
        </div>
        <h1 style={styles.heroTitle}>Start Your Journey</h1>
        <p style={styles.heroSub}>Practice. Improve. Get Hired. 🚀</p>
      </div>

      {/* Bottom sheet style form */}
      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />

        <h2 style={styles.sheetTitle}>Create Account</h2>

        {/* Role selector */}
        <div style={styles.roleRow}>
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{
              ...styles.roleCard,
              ...(role === 'student' ? styles.roleCardActive : {}),
            }}
          >
            <div style={{
              ...styles.roleIcon,
              backgroundColor: role === 'student' ? '#6366f1' : '#f1f5f9',
            }}>
              <GraduationCap size={18} color={role === 'student' ? '#fff' : '#64748b'} />
            </div>
            <span style={{
              ...styles.roleLabel,
              color: role === 'student' ? '#6366f1' : '#64748b',
              fontWeight: role === 'student' ? '700' : '500',
            }}>I'm a Student</span>
            <span style={styles.roleSub}>Practice interviews</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('mentor')}
            style={{
              ...styles.roleCard,
              ...(role === 'mentor' ? styles.roleCardMentorActive : {}),
            }}
          >
            <div style={{
              ...styles.roleIcon,
              backgroundColor: role === 'mentor' ? '#059669' : '#f1f5f9',
            }}>
              <Briefcase size={18} color={role === 'mentor' ? '#fff' : '#64748b'} />
            </div>
            <span style={{
              ...styles.roleLabel,
              color: role === 'mentor' ? '#059669' : '#64748b',
              fontWeight: role === 'mentor' ? '700' : '500',
            }}>I'm a Mentor</span>
            <span style={styles.roleSub}>Get paid to interview</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Full Name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Priya Sharma"
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
            />
          </div>

          {/* Email */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Email / Mobile</label>
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

          {/* Password */}
          <div style={styles.fieldGroup}>
            <label style={styles.fieldLabel}>Password</label>
            <div style={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
            {loading ? (
              <span style={styles.loadingDots}>Creating account<span className="dots">...</span></span>
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <p style={styles.loginLink}>
          Already have an account?{' '}
          <Link to="/login" style={styles.loginLinkAnchor}>Log In</Link>
        </p>

        <p style={styles.terms}>
          By signing up, you agree to our{' '}
          <span style={{ color: '#6366f1' }}>Terms</span> &{' '}
          <span style={{ color: '#6366f1' }}>Privacy Policy</span>
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
    height: '50%',
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
    padding: '16px 20px 32px',
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
    margin: '0 0 16px 0',
    letterSpacing: '-0.3px',
  },
  roleRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '20px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '14px 10px',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    transition: 'all 0.2s',
    gap: '6px',
    outline: 'none',
  },
  roleCardActive: {
    border: '2px solid #6366f1',
    backgroundColor: '#eef2ff',
  },
  roleCardMentorActive: {
    border: '2px solid #059669',
    backgroundColor: '#ecfdf5',
  },
  roleIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: '13px',
    lineHeight: 1,
  },
  roleSub: {
    fontSize: '11px',
    color: '#94a3b8',
    textAlign: 'center' as const,
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
    transition: 'opacity 0.15s, transform 0.15s',
  },
  loadingDots: {
    display: 'inline',
  },
  loginLink: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#64748b',
    marginTop: '20px',
  },
  loginLinkAnchor: {
    color: '#4f46e5',
    fontWeight: '700',
    textDecoration: 'none',
  },
  terms: {
    textAlign: 'center' as const,
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '12px',
  },
  doneCard: {
    position: 'relative',
    zIndex: 2,
    margin: 'auto',
    padding: '40px 24px',
    textAlign: 'center' as const,
  },
  doneIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  doneTitle: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 8px',
  },
  doneSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '14px',
    margin: '0 0 32px',
    lineHeight: 1.6,
  },
};
