import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Video } from 'lucide-react';
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

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-16 text-slate-500 text-sm">Loading room...</div>;
  if (!booking) return <div className="max-w-5xl mx-auto px-6 py-16 text-slate-500 text-sm">Booking not found.</div>;

  // Jitsi Meet: free, no API key required. Each booking gets its own private room name.
  const jitsiUrl = `https://meet.jit.si/${booking.meeting_room}#userInfo.displayName="${encodeURIComponent(
    profile?.full_name ?? 'Guest'
  )}"`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="font-semibold flex items-center gap-2">
            <Video size={16} className="text-brand-400" />
            Session with {profile?.role === 'mentor' ? booking.student?.full_name : booking.mentor?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Room ID: {booking.meeting_room}</p>
        </div>
        <a
          href={jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm !px-3 !py-2"
        >
          Open in new tab
        </a>
      </div>

      <div className="card overflow-hidden" style={{ height: '70vh' }}>
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Video call"
        />
      </div>
    </div>
  );
}
