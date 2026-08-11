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

  // Supabase email link click hone par PASSWORD_RECOVERY event fire hota hai
  // Hash se session automatically set ho jata hai
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User authenticated hai, password change karne de
        setPageStatus('ready');
      } else if (event === 'SIGNED_IN' && session) {
        // Kuch cases mein SIGNED_IN bhi aata hai
        setPageStatus('ready');
      }
    });

    // Check karo ki URL mein valid hash/token hai ya nahi
    // Agar koi hash nahi hai, user directly page pe aaya hai
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    
    if (!hash && !params.get('token') && !params.get('code')) {
      // Thoda wait karo auth state ke liye
      const timer = setTimeout(() => {
        // Agar 3 seconds mein ready nahi hua, invalid link show karo
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
      setErrorMsg('Password kam se kam 8 characters ka hona chahiye.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Dono passwords match nahi kar rahe. Please check karein.');
      return;
    }

    setPageStatus('submitting');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setPageStatus('ready');
      return;
    }

    // Sign out karo so user fresh login kare naye password se
    await supabase.auth.signOut();
    setPageStatus('success');

    // 3 seconds baad login pe redirect
    setTimeout(() => navigate('/login'), 3000);
  };

  // Password strength checker
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '#e2e8f0', width: '0%' };
    if (pwd.length < 6) return { label: 'Bahut Kamzor', color: '#ef4444', width: '20%' };
    if (pwd.length < 8) return { label: 'Kamzor', color: '#f97316', width: '40%' };
    if (pwd.length < 12) return { label: 'Theek Hai', color: '#eab308', width: '65%' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) {
      return { label: 'Bahut Mazboot! 💪', color: '#22c55e', width: '100%' };
    }
    return { label: 'Achha', color: '#3b82f6', width: '85%' };
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
        <h1 style={styles.heroTitle}>Naya Password Set Karein 🔑</h1>
        <p style={styles.heroSub}>Ek strong password choose karein</p>
      </div>

      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />

        {/* LOADING STATE */}
        {pageStatus === 'loading' && (
          <div style={styles.centerContent}>
            <div style={styles.spinner} />
            <p style={{ color: '#64748b', marginTop: '16px', fontSize: '14px' }}>
              Aapka reset link verify ho raha hai...
            </p>
          </div>
        )}

        {/* INVALID LINK STATE */}
        {pageStatus === 'invalid_link' && (
          <div style={styles.centerContent}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fff1f2', border: '2px solid #fecdd3' }}>
              <AlertCircle size={40} color="#be123c" />
            </div>
            <h2 style={{ ...styles.stateTitle, color: '#be123c' }}>Link Invalid Hai ❌</h2>
            <p style={styles.stateDesc}>
              Yeh reset link expire ho gaya hai ya valid nahi hai. Please naya link request karein.
            </p>
            <Link to="/forgot-password" style={styles.ctaLink}>
              🔄 Naya Reset Link Maango
            </Link>
            <Link to="/login" style={styles.secondaryLink}>
              ← Wapas Login Par Jao
            </Link>
          </div>
        )}

        {/* SUCCESS STATE */}
        {pageStatus === 'success' && (
          <div style={styles.centerContent}>
            <div style={{ ...styles.iconCircle, backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0' }}>
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h2 style={styles.stateTitle}>Password Reset Ho Gaya! 🎉</h2>
            <p style={styles.stateDesc}>
              Aapka naya password successfully set ho gaya. Ab aap naye password se login kar sakte hain.
            </p>
            <div style={styles.autoRedirectBadge}>
              ⏳ 3 seconds mein login page pe redirect ho raha hai...
            </div>
            <Link to="/login" style={styles.ctaLink}>
              → Abhi Login Karein
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
                <strong>Tips:</strong> Ek strong password mein uppercase, numbers, aur special
                characters (@#$!) honay chahiye.
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
              <label htmlFor="new-password" style={styles.fieldLabel}>Naya Password</label>
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
              <label htmlFor="confirm-password" style={styles.fieldLabel}>Password Confirm Karein</label>
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
                  ❌ Passwords match nahi kar rahe
                </span>
              )}
              {confirmPassword && confirmPassword === password && (
                <span style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                  ✅ Passwords match kar rahe hain
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
                '🔐 Password Update Karein'
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
