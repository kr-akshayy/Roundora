import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Briefcase, IndianRupee, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { topicLabel, topicColor } from '../lib/topics';
import type { Profile, Slot, Review } from '../types';

export default function MentorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuthStore();

  const [mentor, setMentor] = useState<Profile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: mentorData }, { data: slotData }, { data: reviewData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('slots')
          .select('*')
          .eq('mentor_id', id)
          .eq('is_booked', false)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true }),
        supabase
          .from('reviews')
          .select('*, student:student_id(*)')
          .eq('mentor_id', id)
          .order('created_at', { ascending: false }),
      ]);
      setMentor(mentorData as Profile);
      setSlots((slotData as Slot[]) ?? []);
      setReviews((reviewData as unknown as Review[]) ?? []);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const handleBook = async (slot: Slot) => {
    if (!session) {
      navigate('/login');
      return;
    }
    setError(null);
    setBooking(slot.id);

    const roomName = `intervuee-${slot.id}-${Date.now().toString(36)}`;

    const { error: bookingError } = await supabase.from('bookings').insert({
      student_id: session.user.id,
      mentor_id: mentor!.id,
      slot_id: slot.id,
      meeting_room: roomName,
      status: 'confirmed',
    });

    if (bookingError) {
      setError(bookingError.message);
      setBooking(null);
      return;
    }

    await supabase.from('slots').update({ is_booked: true }).eq('id', slot.id);

    setBooking(null);
    setSuccess(true);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-16 text-slate-500 text-sm">Loading...</div>;
  if (!mentor) return <div className="max-w-4xl mx-auto px-6 py-16 text-slate-500 text-sm">Mentor not found.</div>;

  if (success) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <CheckCircle2 size={40} className="text-accent-emerald mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Session booked!</h1>
        <p className="text-slate-500 text-sm mb-6">
          Your video call room is ready. Find it anytime in your dashboard.
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex">
          Go to my bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <div className="flex items-center gap-4 mb-4">
          <Avatar url={mentor.avatar_url} name={mentor.full_name} size={64} />
          <div>
            <h1 className="text-xl font-bold">{mentor.full_name}</h1>
            <div className="text-sm text-slate-500">{mentor.headline ?? 'Interviewer'}</div>
          </div>
        </div>

        {avgRating !== null && (
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={avgRating} size={16} />
            <span className="text-sm text-slate-400">
              {avgRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {mentor.expertise && mentor.expertise.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {mentor.expertise.map((tag) => (
              <span
                key={tag}
                className={`text-xs px-2.5 py-1 rounded-full bg-dark-bg border border-dark-border ${topicColor(
                  tag
                )}`}
              >
                {topicLabel(tag)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-slate-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Briefcase size={14} /> {mentor.company ?? '—'}
          </span>
          {mentor.years_experience != null && <span>{mentor.years_experience} yrs experience</span>}
        </div>
        <p className="text-slate-400 leading-relaxed mb-10">{mentor.bio ?? 'No bio added yet.'}</p>

        {reviews.length > 0 && (
          <div>
            <h2 className="font-semibold mb-4">What students say</h2>
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar url={r.student?.avatar_url} name={r.student?.full_name} size={28} />
                      <span className="text-sm font-medium">{r.student?.full_name ?? 'Student'}</span>
                    </div>
                    <StarRating rating={r.rating} size={12} />
                  </div>
                  {r.comment && <p className="text-sm text-slate-500">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="card p-5 sticky top-24">
          {mentor.price_per_session != null && (
            <div className="flex items-center gap-1 text-lg font-bold mb-4">
              <IndianRupee size={16} />
              {mentor.price_per_session}
              <span className="text-sm font-normal text-slate-500">/ session</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-400 mb-3">
            <Calendar size={14} /> Available slots
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-950/50 border border-rose-900 rounded-xl px-3 py-2 mb-3">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {slots.length === 0 ? (
            <p className="text-sm text-slate-500">No open slots right now.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleBook(slot)}
                  disabled={booking === slot.id || profile?.role === 'mentor'}
                  className="w-full text-left text-sm bg-dark-bg border border-dark-border hover:border-brand-600 rounded-xl px-3 py-2.5 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium">
                    {new Date(slot.start_time).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(slot.start_time).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {slot.duration_minutes} min
                  </div>
                  {slot.topic && (
                    <div className={`text-xs mt-1 ${topicColor(slot.topic)}`}>{topicLabel(slot.topic)}</div>
                  )}
                </button>
              ))}
            </div>
          )}
          {profile?.role === 'mentor' && (
            <p className="text-xs text-slate-500 mt-3">Interviewer accounts can't book sessions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
