import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setErrorMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targetRedirect = window.location.hostname === 'localhost'
        ? 'https://www.roundora.in/reset-password'
        : `${window.location.origin}/reset-password`;

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${anonKey}`;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reset-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            redirectTo: targetRedirect,
          }),
        }
      );

      const resData = await res.json().catch(() => ({}));

      if (!res.ok || resData?.success === false) {
        const msg = resData?.error || resData?.message || `Failed to send reset email (${res.status})`;
        throw new Error(msg);
      }

      setStatus('success');
    } catch (err: unknown) {
      console.error('Reset email error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={styles.root}>
      {/* Background gradient */}
      <div style={styles.heroBg} />

      {/* Back button */}
      <Link to="/login" style={styles.backBtn}>
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
        <h1 style={styles.heroTitle}>Forgot Password? 🔐</h1>
        <p style={styles.heroSub}>We'll send you a reset link on your email</p>
      </div>

      {/* Bottom sheet */}
      <div style={styles.sheet}>
        <div style={styles.sheetHandle} />

        {/* SUCCESS STATE */}
        {status === 'success' ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>
              <CheckCircle size={48} color="#16a34a" />
            </div>
            <h2 style={styles.successTitle}>Email Sent! 🎉</h2>
            <p style={styles.successDesc}>
              Agar <strong>{email}</strong> hamare system mein registered hai, to aapko ek
              password reset link mil jayega. Please apna inbox aur spam folder check karein.
            </p>
            <div style={styles.infoBox}>
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', lineHeight: 1.5 }}>
                Link <strong>1 ghante</strong> tak valid rahega. Naya link chahiye? Phir se form fill karein.
              </p>
            </div>
            <Link to="/login" style={styles.backToLoginBtn}>
              ← Wapas Login Par Jao
            </Link>
            <button
              onClick={() => { setStatus('idle'); setEmail(''); setErrorMsg(null); }}
              style={styles.tryAgainBtn}
            >
              Doosra Email Try Karo
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Info card */}
            <div style={styles.infoCard}>
              <Mail size={20} color="#1e40af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '700', marginBottom: '4px', color: '#1e3a8a' }}>
                  Password Reset Link
                </div>
                <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: 1.5 }}>
                  Apna registered email address daalein. Hum aapko ek secure link bhejenge
                  jisse aap naya password set kar sakte hain.
                </div>
              </div>
            </div>

            {/* Error */}
            {status === 'error' && errorMsg && (
              <div style={styles.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email field */}
            <div style={styles.fieldGroup}>
              <label htmlFor="forgot-email" style={styles.fieldLabel}>Email Address</label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                onBlur={(e) => Object.assign(e.target.style, styles.inputBlur)}
                disabled={status === 'loading'}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              style={{
                ...styles.ctaBtn,
                opacity: (status === 'loading' || !email.trim()) ? 0.7 : 1,
                cursor: (status === 'loading' || !email.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {status === 'loading' ? (
                <>
                  <span style={styles.spinner} /> Sending Reset Link...
                </>
              ) : (
                '📧 Send Reset Link'
              )}
            </button>

            {/* Back to login */}
            <p style={styles.backLink}>
              Password yaad aa gaya?{' '}
              <Link to="/login" style={styles.backLinkAnchor}>Wapas Login Par Jao</Link>
            </p>
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
    color: '#fff', fontSize: 'clamp(24px, 6vw, 30px)', fontWeight: '800',
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
  ctaBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    width: '100%', padding: '15px', borderRadius: '14px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '16px', fontWeight: '700', border: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
    letterSpacing: '0.2px', transition: 'opacity 0.15s',
  },
  spinner: {
    display: 'inline-block', width: '16px', height: '16px',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  backLink: { textAlign: 'center' as const, fontSize: '14px', color: '#64748b', marginTop: '8px' },
  backLinkAnchor: { color: '#4f46e5', fontWeight: '700', textDecoration: 'none' },
  // Success state styles
  successContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', paddingTop: '16px', textAlign: 'center',
  },
  successIcon: {
    width: '80px', height: '80px', borderRadius: '50%',
    backgroundColor: '#f0fdf4', border: '2px solid #bbf7d0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  successTitle: {
    fontSize: '24px', fontWeight: '800', color: '#0f172a',
    margin: 0, letterSpacing: '-0.5px',
  },
  successDesc: {
    fontSize: '14px', color: '#475569', lineHeight: 1.6,
    margin: 0, maxWidth: '340px',
  },
  infoBox: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    backgroundColor: '#e0f2fe', border: '1px solid #bae6fd',
    borderRadius: '14px', padding: '14px 16px', width: '100%', boxSizing: 'border-box' as const,
    textAlign: 'left' as const,
  },
  backToLoginBtn: {
    display: 'block', width: '100%', padding: '15px', textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff', fontSize: '15px', fontWeight: '700',
    borderRadius: '14px', textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
  },
  tryAgainBtn: {
    width: '100%', padding: '13px', borderRadius: '14px',
    border: '1.5px solid #e2e8f0', backgroundColor: '#fff',
    color: '#374151', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer',
  },
};
