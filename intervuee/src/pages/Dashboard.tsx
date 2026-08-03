import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Video, Calendar, Plus, Clock, CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import StarRating from '../components/StarRating';
import { TOPICS, topicLabel, topicColor } from '../lib/topics';
import type { Booking, Slot } from '../types';

function ReviewForm({ booking, onDone }: { booking: Booking; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      student_id: booking.student_id,
      mentor_id: booking.mentor_id,
      rating,
      comment: comment || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-slate-200 space-y-2">
      {error && <div className="text-xs text-rose-600">{error}</div>}
      <StarRating rating={rating} size={20} interactive onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was the session? (optional)"
        className="input-field text-sm min-h-16 resize-none"
      />
      <button type="submit" disabled={saving} className="btn-primary !py-2 text-xs">
        {saving ? 'Submitting...' : 'Submit review'}
      </button>
    </form>
  );
}

function StudentDashboard({ userId }: { userId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: bookingData }, { data: reviewData }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, mentor:mentor_id(*), slot:slot_id(*)')
        .eq('student_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select('booking_id').eq('student_id', userId),
    ]);
    setBookings((bookingData as unknown as Booking[]) ?? []);
    setReviewedBookingIds(new Set(((reviewData as { booking_id: string }[]) ?? []).map((r) => r.booking_id)));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) return <div className="text-slate-500 text-sm">Loading your bookings...</div>;

  if (bookings.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500 text-sm mb-4">No sessions booked yet.</p>
        <Link to="/mentors" className="btn-primary inline-flex">
          Find an interviewer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="card p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-medium">{b.mentor?.full_name ?? 'Interviewer'}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <Clock size={12} />
                {b.slot ? new Date(b.slot.start_time).toLocaleString() : '—'}
                {b.slot?.topic && (
                  <span className={`ml-1 ${topicColor(b.slot.topic)}`}>· {topicLabel(b.slot.topic)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  b.status === 'confirmed'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : b.status === 'completed'
                    ? 'text-brand-700 bg-brand-50 border-brand-200'
                    : 'text-slate-600 bg-slate-100 border-slate-200'
                }`}
              >
                {b.status}
              </span>
              {b.status === 'confirmed' && (
                <Link to={`/room/${b.id}`} className="btn-primary !px-3 !py-2 text-xs">
                  <Video size={13} /> Join call
                </Link>
              )}
              {b.status === 'completed' && !reviewedBookingIds.has(b.id) && reviewingId !== b.id && (
                <button
                  onClick={() => setReviewingId(b.id)}
                  className="btn-secondary !px-3 !py-2 text-xs"
                >
                  <MessageSquarePlus size={13} /> Leave a review
                </button>
              )}
              {b.status === 'completed' && reviewedBookingIds.has(b.id) && (
                <span className="text-xs text-slate-500">Review submitted</span>
              )}
            </div>
          </div>
          {reviewingId === b.id && (
            <ReviewForm
              booking={b}
              onDone={() => {
                setReviewingId(null);
                fetchData();
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function MentorDashboard({ userId, expertise }: { userId: string; expertise: string[] }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [duration, setDuration] = useState(45);
  const [topic, setTopic] = useState(expertise[0] ?? TOPICS[0].id);
  const [error, setError] = useState<string | null>(null);

  const availableTopics = TOPICS.filter((t) => expertise.length === 0 || expertise.includes(t.id));

  const fetchData = async () => {
    const [{ data: slotData }, { data: bookingData }] = await Promise.all([
      supabase.from('slots').select('*').eq('mentor_id', userId).order('start_time', { ascending: true }),
      supabase
        .from('bookings')
        .select('*, student:student_id(*), slot:slot_id(*)')
        .eq('mentor_id', userId)
        .order('created_at', { ascending: false }),
    ]);
    setSlots((slotData as Slot[]) ?? []);
    setBookings((bookingData as unknown as Booking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAddSlot = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newDate || !newTime) return;
    const startTime = new Date(`${newDate}T${newTime}`);
    if (startTime < new Date()) {
      setError('Pick a time in the future.');
      return;
    }
    const { error: insertError } = await supabase.from('slots').insert({
      mentor_id: userId,
      start_time: startTime.toISOString(),
      duration_minutes: duration,
      topic,
      is_booked: false,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewDate('');
    setNewTime('');
    fetchData();
  };

  const handleMarkCompleted = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    fetchData();
  };

  if (loading) return <div className="text-slate-500 text-sm">Loading...</div>;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-1.5">
          <Calendar size={16} /> Add availability
        </h2>
        {expertise.length === 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
            Tip: add your interview topics in{' '}
            <Link to="/profile/edit" className="underline">
              Edit profile
            </Link>{' '}
            so students can find you by topic.
          </div>
        )}
        <form onSubmit={handleAddSlot} className="card p-4 space-y-3 mb-6">
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <div>
            <label className="label-text">Topic / round type</label>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="input-field">
              {availableTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-text">Time</label>
              <input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Duration (minutes)</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input-field"
            >
              <option value={30}>30</option>
              <option value={45}>45</option>
              <option value={60}>60</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">
            <Plus size={15} /> Add slot
          </button>
        </form>

        <h3 className="text-sm font-medium text-slate-500 mb-2">Upcoming open slots</h3>
        <div className="space-y-2">
          {slots.filter((s) => !s.is_booked).length === 0 && (
            <p className="text-sm text-slate-500">No open slots added yet.</p>
          )}
          {slots
            .filter((s) => !s.is_booked)
            .map((s) => (
              <div key={s.id} className="card px-3 py-2.5 text-sm flex justify-between items-center">
                <div>
                  <div>{new Date(s.start_time).toLocaleString()}</div>
                  {s.topic && <div className={`text-xs mt-0.5 ${topicColor(s.topic)}`}>{topicLabel(s.topic)}</div>}
                </div>
                <span className="text-slate-500 text-xs">{s.duration_minutes} min</span>
              </div>
            ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Booked sessions</h2>
        {bookings.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">No bookings yet.</div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{b.student?.full_name ?? 'Student'}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    {b.slot ? new Date(b.slot.start_time).toLocaleString() : '—'}
                    {b.slot?.topic && (
                      <span className={topicColor(b.slot.topic)}>· {topicLabel(b.slot.topic)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {b.status === 'confirmed' && (
                    <>
                      <Link to={`/room/${b.id}`} className="btn-primary !px-3 !py-2 text-xs">
                        <Video size={13} /> Join call
                      </Link>
                      <button
                        onClick={() => handleMarkCompleted(b.id)}
                        className="btn-secondary !px-3 !py-2 text-xs"
                        title="Mark this session as completed"
                      >
                        <CheckCircle2 size={13} /> Mark done
                      </button>
                    </>
                  )}
                  {b.status === 'completed' && (
                    <span className="badge-brand">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session, profile } = useAuthStore();
  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-1">
        {profile?.role === 'mentor' ? 'Your sessions' : 'Your bookings'}
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        {profile?.role === 'mentor'
          ? 'Manage your availability and upcoming interviews.'
          : 'Track and join your upcoming mock interviews.'}
      </p>
      {profile?.role === 'mentor' ? (
        <MentorDashboard userId={session.user.id} expertise={profile.expertise ?? []} />
      ) : (
        <StudentDashboard userId={session.user.id} />
      )}
    </div>
  );
}
