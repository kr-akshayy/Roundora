import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ShieldCheck, Star } from 'lucide-react';
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
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/roundora-logo.png"
            alt="Roundora"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-900/10 group-hover:scale-105 transition-all duration-200"
          />
          <span className="font-bold tracking-tight text-base sm:text-lg text-slate-900 group-hover:text-brand-600 transition-colors">
            Roundora
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm">
          <Link to="/mentors" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium">
            Mentors
          </Link>

          <Link to="/jobs" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium flex items-center gap-1">
            <span>💼 Jobs</span>
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline animate-pulse">HOT</span>
          </Link>

          {session ? (
            <>
              {profile?.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold"
                >
                  <ShieldCheck size={13} className="shrink-0" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              {profile?.role === 'student' && !profile?.is_admin && (
                <Link
                  to="/apply"
                  className="hidden sm:flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold"
                >
                  <Star size={12} className="shrink-0" fill="currentColor" />
                  Become Interviewer
                </Link>
              )}
              <Link
                to="/dashboard"
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium"
              >
                <LayoutDashboard size={14} className="shrink-0" />
                <span className="hidden xs:inline sm:inline">{profile?.role === 'mentor' ? 'Sessions' : 'Bookings'}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
                title="Sign out"
              >
                <LogOut size={14} className="shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <Link to="/profile/edit" aria-label="Edit profile" className="ml-0.5 shrink-0">
                <Avatar url={profile?.avatar_url} name={profile?.full_name} size={28} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium">
                Log in
              </Link>
              <Link to="/signup" className="btn-primary !px-2.5 sm:!px-4 !py-1.5 sm:!py-2 text-xs sm:text-sm ml-0.5">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
