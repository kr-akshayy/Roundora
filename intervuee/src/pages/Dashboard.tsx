import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Video, Calendar, Plus, Clock, CheckCircle2, MessageSquarePlus, Trash2, X, Copy, ExternalLink, Bell, CalendarPlus } from 'lucide-react';
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

// Generate ICS calendar file content for a booking
function generateICS(title: string, startTime: Date, durationMinutes: number, description: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  const uid = `roundora-${Date.now()}@roundora.in`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Roundora//Mock Interview//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startTime)}`,
    `DTEND:${fmt(endTime)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your mock interview starts in 1 hour!',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Your mock interview starts in 15 minutes!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(booking: Booking) {
  if (!booking.slot) return;
  const mentorName = booking.mentor?.full_name ?? 'Mentor';
  const startTime = new Date(booking.slot.start_time);
  const duration = booking.slot.duration_minutes ?? 45;
  const topic = booking.slot.topic ? ` — ${booking.slot.topic}` : '';
  const title = `Mock Interview with ${mentorName}${topic}`;
  const desc = `Roundora mock interview session with ${mentorName}. Join at: ${window.location.origin}/room/${booking.id}`;
  const ics = generateICS(title, startTime, duration, desc);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roundora-session-${booking.id.slice(0, 8)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function StudentDashboard({ userId }: { userId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
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

  const sendCancellationEmail = async (booking: Booking, cancelledBy: 'mentor' | 'student') => {
    try {
      let studentEmail = booking.student?.email;
      if (!studentEmail && booking.student_id) {
        const { data: p } = await supabase.from('profiles').select('email').eq('id', booking.student_id).single();
        if (p?.email) studentEmail = p.email;
      }

      if (!studentEmail) {
        console.warn('No student email found for cancellation notification');
        return;
      }

      const slotDate = booking.slot?.start_time ? new Date(booking.slot.start_time) : new Date();
      const timeStr = slotDate.toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${SUPABASE_URL}/functions/v1/send-cancellation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          studentEmail: studentEmail.trim(),
          studentName: booking.student?.full_name || 'Student',
          mentorName: booking.mentor?.full_name || 'Interviewer',
          sessionTime: timeStr,
          topic: booking.slot?.topic ? topicLabel(booking.slot.topic) : '1-on-1 Interview',
          cancelledBy,
        }),
      });
    } catch (err) {
      console.error('Failed to send cancellation email:', err);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    setCancellingId(booking.id);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    // Free up the slot
    if (booking.slot_id) {
      await supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);
    }
    // Send email notification to student
    await sendCancellationEmail(booking, 'student');
    setCancellingId(null);
    fetchData();
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-32" />
        </div>
      ))}
    </div>
  );

  if (bookings.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-slate-600 font-medium mb-1">No sessions booked yet</p>
        <p className="text-slate-400 text-sm mb-5">Book a slot with an interviewer to practice your mock interview.</p>
        <Link to="/mentors" className="btn-primary inline-flex">
          Find an interviewer
        </Link>
      </div>
    );
  }

  // Find the next upcoming confirmed session
  const upcomingSessions = bookings
    .filter((b) => b.status === 'confirmed' && b.slot)
    .sort((a, b) => new Date(a.slot!.start_time).getTime() - new Date(b.slot!.start_time).getTime());

  const nextSession = upcomingSessions[0];
  const msToNext = nextSession?.slot ? new Date(nextSession.slot.start_time).getTime() - Date.now() : null;
  const hoursToNext = msToNext ? msToNext / 3600000 : null;

  return (
    <div className="space-y-3">
      {/* Reminder Banner */}
      {nextSession && hoursToNext !== null && hoursToNext > 0 && hoursToNext <= 24 && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
          hoursToNext <= 1
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <Bell size={18} className={hoursToNext <= 1 ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
          <div className="flex-1 min-w-0">
            <div className={`font-semibold text-sm ${hoursToNext <= 1 ? 'text-rose-700' : 'text-amber-700'}`}>
              {hoursToNext <= 1
                ? `🚨 Session starts in ${Math.round(msToNext! / 60000)} minutes!`
                : `⏰ Session in ${Math.round(hoursToNext)} hour${Math.round(hoursToNext) !== 1 ? 's' : ''}!`}
            </div>
            <div className={`text-xs mt-0.5 ${hoursToNext <= 1 ? 'text-rose-600' : 'text-amber-600'}`}>
              {nextSession.mentor?.full_name} ·{' '}
              {new Date(nextSession.slot!.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
          <Link to={`/room/${nextSession.id}`} className="btn-primary !px-3 !py-2 text-xs shrink-0">
            <Video size={12} /> Join Now
          </Link>
        </div>
      )}

      {bookings.map((b) => (
        <div key={b.id} className="card p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{b.mentor?.full_name ?? 'Interviewer'}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 flex-wrap">
                <Clock size={12} className="shrink-0" />
                {b.slot ? new Date(b.slot.start_time).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true
                }) : '—'}
                {b.slot?.topic && (
                  <span className={`${topicColor(b.slot.topic)}`}>· {topicLabel(b.slot.topic)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${
                  b.status === 'confirmed'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : b.status === 'completed'
                    ? 'text-brand-700 bg-brand-50 border-brand-200'
                    : 'text-rose-600 bg-rose-50 border-rose-200'
                }`}
              >
                {b.status === 'confirmed' ? '✓ Confirmed' : b.status === 'completed' ? '✓ Completed' : '✕ Cancelled'}
              </span>
              {b.status === 'confirmed' && (
                <>
                  <Link to={`/room/${b.id}`} className="btn-primary !px-3 !py-2 text-xs">
                    <Video size={13} /> Join call
                  </Link>
                  <button
                    onClick={() => downloadICS(b)}
                    className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
                    title="Add to calendar (Google/iPhone) for reminders"
                  >
                    <CalendarPlus size={13} /> Add to Calendar
                  </button>
                  <button
                    onClick={() => handleCancelBooking(b)}
                    disabled={cancellingId === b.id}
                    className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    title="Cancel booking"
                  >
                    <X size={13} /> {cancellingId === b.id ? '...' : 'Cancel'}
                  </button>
                </>
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
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Reviewed
                </span>
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

// Quick preset timings for mentor to quickly pick slots
const QUICK_PRESETS = [
  { label: 'Today 9 AM', getDateTime: () => { const d = new Date(); d.setHours(9,0,0,0); return d; } },
  { label: 'Today 6 PM', getDateTime: () => { const d = new Date(); d.setHours(18,0,0,0); return d; } },
  { label: 'Today 8 PM', getDateTime: () => { const d = new Date(); d.setHours(20,0,0,0); return d; } },
  { label: 'Tomorrow 10 AM', getDateTime: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(10,0,0,0); return d; } },
  { label: 'Tomorrow 5 PM', getDateTime: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(17,0,0,0); return d; } },
  { label: 'Tomorrow 8 PM', getDateTime: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(20,0,0,0); return d; } },
  { label: 'This Sat 11 AM', getDateTime: () => { const d = new Date(); const day = d.getDay(); const diff = (6 - day + 7) % 7 || 7; d.setDate(d.getDate()+diff); d.setHours(11,0,0,0); return d; } },
  { label: 'This Sun 10 AM', getDateTime: () => { const d = new Date(); const day = d.getDay(); const diff = (7 - day) % 7 || 7; d.setDate(d.getDate()+diff); d.setHours(10,0,0,0); return d; } },
];

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInputValue(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

function getDayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'long' });
}

function MentorDashboard({ userId, mentorProfileId, expertise }: { userId: string; mentorProfileId: string; expertise: string[] }) {
  const { profile } = useAuthStore();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [duration, setDuration] = useState(45);
  const [topic, setTopic] = useState(expertise[0] ?? TOPICS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const profileUrl = `${window.location.origin}/mentors/${mentorProfileId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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

  const handleDeleteSlot = async (slotId: string) => {
    setDeletingSlotId(slotId);
    await supabase.from('slots').delete().eq('id', slotId);
    setDeletingSlotId(null);
    fetchData();
  };

  const handleMarkCompleted = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
    fetchData();
  };

  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const sendCancellationEmailToStudent = async (booking: Booking) => {
    try {
      let studentEmail = booking.student?.email;
      if (!studentEmail && booking.student_id) {
        const { data: p } = await supabase.from('profiles').select('email').eq('id', booking.student_id).single();
        if (p?.email) studentEmail = p.email;
      }

      if (!studentEmail) return;

      const slotDate = booking.slot?.start_time ? new Date(booking.slot.start_time) : new Date();
      const timeStr = slotDate.toLocaleString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${SUPABASE_URL}/functions/v1/send-cancellation-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          studentEmail: studentEmail.trim(),
          studentName: booking.student?.full_name || 'Student',
          mentorName: profile?.full_name || 'Interviewer',
          sessionTime: timeStr,
          topic: booking.slot?.topic ? topicLabel(booking.slot.topic) : '1-on-1 Interview',
          cancelledBy: 'mentor',
        }),
      });
    } catch (err) {
      console.error('Failed to send cancellation email to student:', err);
    }
  };

  const handleCancelBookingByMentor = async (booking: Booking) => {
    if (!window.confirm(`Are you sure you want to cancel this booking with ${booking.student?.full_name ?? 'Student'}? An email notification will be sent to the student.`)) {
      return;
    }

    setCancellingBookingId(booking.id);
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    if (booking.slot_id) {
      await supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);
    }
    await sendCancellationEmailToStudent(booking);
    setCancellingBookingId(null);
    fetchData();
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-32" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Profile Share Link */}
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap bg-brand-50 border-brand-200">
        <div>
          <div className="text-sm font-semibold text-brand-800">Your public profile link</div>
          <div className="text-xs text-brand-600 mt-0.5 truncate max-w-xs">{profileUrl}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors font-medium"
          >
            <Copy size={13} />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border border-brand-300 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <ExternalLink size={13} /> View
          </a>
        </div>
      </div>

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

            {/* Quick Presets */}
            <div>
              <label className="label-text">⚡ Quick select time</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((p) => {
                  const d = p.getDateTime();
                  const isPast = d < new Date();
                  return (
                    <button
                      key={p.label}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        setNewDate(toDateInputValue(d));
                        setNewTime(toTimeInputValue(d));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        newDate === toDateInputValue(d) && newTime === toTimeInputValue(d)
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : isPast
                          ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (1 hour)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              <Plus size={15} /> Add Slot
            </button>
          </form>

          <h3 className="text-sm font-medium text-slate-500 mb-2">Upcoming open slots</h3>
          <div className="space-y-2">
            {slots.filter((s) => !s.is_booked).length === 0 && (
              <div className="text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                <div className="text-2xl mb-2">📅</div>
                <div className="font-medium text-slate-600 mb-1">No open slots yet</div>
                <div className="text-xs">Use the quick presets above to add a slot in seconds!</div>
              </div>
            )}
            {slots
              .filter((s) => !s.is_booked)
              .map((s) => {
                const slotDate = new Date(s.start_time);
                const dayLabel = getDayLabel(s.start_time);
                const timeStr = slotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const hour = slotDate.getHours();
                const timeOfDay = hour < 12 ? '🌅 Morning' : hour < 17 ? '☀️ Afternoon' : '🌙 Evening';
                return (
                  <div key={s.id} className="card px-4 py-3 text-sm flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                        {dayLabel}
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{timeOfDay}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={11}/> {timeStr}</span>
                        <span>· {s.duration_minutes} min</span>
                        {s.topic && <span className={topicColor(s.topic)}>{topicLabel(s.topic)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeleteSlot(s.id)}
                        disabled={deletingSlotId === s.id}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-40"
                        title="Delete slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Booked sessions</h2>
          {bookings.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-500">No bookings yet.</div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{b.student?.full_name ?? 'Student'}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                        {b.slot ? new Date(b.slot.start_time).toLocaleString() : '—'}
                        {b.slot?.topic && (
                          <span className={topicColor(b.slot.topic)}>· {topicLabel(b.slot.topic)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
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
                          <button
                            onClick={() => handleCancelBookingByMentor(b)}
                            disabled={cancellingBookingId === b.id}
                            className="text-xs px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50 font-medium"
                            title="Cancel session & send email to student"
                          >
                            {cancellingBookingId === b.id ? '...' : 'Cancel'}
                          </button>
                        </>
                      )}
                      {b.status === 'completed' && (
                        <span className="badge-brand">Completed</span>
                      )}
                      {b.status === 'cancelled' && (
                        <span className="text-xs px-2.5 py-1 rounded-full border text-rose-600 bg-rose-50 border-rose-200">Cancelled</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { session, profile } = useAuthStore();
  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">
          {profile?.role === 'mentor' ? 'Your sessions' : 'Your bookings'}
        </h1>
        <Link to="/profile/edit" className="btn-secondary text-sm !px-3 !py-2">
          Edit profile
        </Link>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        {profile?.role === 'mentor'
          ? 'Manage your availability and upcoming interviews.'
          : 'Track and join your upcoming mock interviews.'}
      </p>
      {profile?.role === 'mentor' ? (
        <MentorDashboard userId={session.user.id} mentorProfileId={session.user.id} expertise={profile.expertise ?? []} />
      ) : (
        <StudentDashboard userId={session.user.id} />
      )}
    </div>
  );
}
