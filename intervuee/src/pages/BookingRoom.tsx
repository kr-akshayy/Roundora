import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Video, ExternalLink, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import type { Booking } from '../types';

export default function BookingRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { profile } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, mentor:mentor_id(*), student:student_id(*)')
        .eq('id', bookingId)
        .single();
      setBooking(data as unknown as Booking);
      setLoading(false);
    };
    if (bookingId) fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="card p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48" />
          <div className="h-4 bg-slate-100 rounded w-64" />
          <div className="h-96 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Booking Not Found</h1>
        <p className="text-slate-500 text-sm mb-6">This session room link is invalid or has expired.</p>
        <Link to="/dashboard" className="btn-primary inline-flex">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const otherPerson = profile?.role === 'mentor' ? booking.student : booking.mentor;
  const otherRole = profile?.role === 'mentor' ? 'Student' : 'Mentor / Interviewer';

  // Jitsi Meet URL
  const jitsiUrl = `https://meet.jit.si/${booking.meeting_room}#userInfo.displayName="${encodeURIComponent(
    profile?.full_name ?? 'Participant'
  )}"`;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs sm:text-sm !px-4 !py-2 shrink-0 shadow-sm"
        >
          <ExternalLink size={14} /> Open Fullscreen / Jitsi App
        </a>
      </div>

      {/* Info Card */}
      <div className="card p-4 mb-4 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-400/30 flex items-center justify-center shrink-0">
            <User size={20} className="text-brand-300" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg flex items-center gap-2">
              <Video size={18} className="text-emerald-400 shrink-0" />
              Session with {otherPerson?.full_name ?? 'Participant'}
            </h1>
            <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="bg-white/10 px-2 py-0.5 rounded-full">{otherRole}</span>
              <span>•</span>
              <span className="text-slate-400">Room: {booking.meeting_room}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 font-medium">
          <ShieldCheck size={13} /> Encrypted Video Room
        </div>
      </div>

      {/* Video Call Embed Container */}
      <div
        className="card overflow-hidden shadow-lg border border-slate-300 bg-slate-950 relative"
        style={{ height: 'calc(100vh - 240px)', minHeight: '450px' }}
      >
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full h-full border-0"
          title="Roundora Video Room"
        />
      </div>

      {/* Mobile note */}
      <p className="text-xs text-slate-500 text-center mt-3 sm:hidden">
        💡 Mobile browser audio/video issues? Click <strong>"Open Fullscreen / Jitsi App"</strong> above.
      </p>
    </div>
  );
}
