import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../lib/auth-store';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, refreshProfile } = useAuthStore();
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If already admin or admin email
  const isAdminEmail =
    session.user.email?.toLowerCase().includes('vivek') ||
    session.user.email?.toLowerCase().includes('akshay') ||
    session.user.email?.toLowerCase().includes('admin') ||
    profile?.is_admin;

  if (profile?.is_admin || isAdminEmail) {
    return <>{children}</>;
  }

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim() === 'roundora2026' || adminKey.trim() === 'admin123' || adminKey.trim() === 'vivekadmin') {
      setClaiming(true);
      setError(null);
      await supabase.from('profiles').update({ is_admin: true }).eq('id', session.user.id);
      await refreshProfile();
      setClaiming(false);
    } else {
      setError('Invalid Admin Passkey. Please enter the master access key.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-white">
      <div className="card max-w-md w-full p-8 bg-slate-900 border border-slate-800 text-center shadow-2xl rounded-3xl">
        <div className="w-16 h-16 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-2xl font-black mb-2 text-white">Admin Access Portal</h1>
        <p className="text-xs text-slate-400 mb-6">
          This area is restricted to Roundora Platform Administrators. Enter master key to activate your admin privileges.
        </p>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleClaimAdmin} className="space-y-4">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter Admin Key (e.g. roundora2026)"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={claiming || !adminKey.trim()}
            className="btn-primary w-full !py-3 text-sm font-bold shadow-lg shadow-brand-500/25"
          >
            {claiming ? 'Activating Admin...' : 'Unlock Admin Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}

