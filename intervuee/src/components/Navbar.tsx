import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '../lib/auth-store';
import Avatar from './Avatar';

export default function Navbar() {
  const { session, profile, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/roundora-logo.jpg"
            alt="Roundora"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
            }}
          />
          <span className="font-bold tracking-tight text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
            Roundora
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link to="/mentors" className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-3 py-2 rounded-lg font-medium">
            Find a mentor
          </Link>

          {session ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-3 py-2 rounded-lg font-medium"
              >
                <LayoutDashboard size={15} />
                {profile?.role === 'mentor' ? 'My sessions' : 'My bookings'}
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors px-3 py-2 rounded-lg"
              >
                <LogOut size={15} />
                Sign out
              </button>
              <Link to="/profile/edit" aria-label="Edit profile" className="ml-1">
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size={32} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-3 py-2 rounded-lg font-medium">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !px-4 !py-2 text-sm ml-1">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
