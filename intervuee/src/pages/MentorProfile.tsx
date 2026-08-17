import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, IndianRupee, Calendar, CheckCircle2, AlertCircle,
  Clock, ArrowLeft, Star, Zap, Users, ShieldCheck, Linkedin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { topicLabel, topicColor } from '../lib/topics';
import { getGoogleCalendarUrl, downloadIcsFile } from '../lib/calendarUtils';
import type { Profile, Slot, Review } from '../types';

function SlotCard({
  slot,
  onBook,
  isBooking,
  disabled,
}: {
  slot: Slot;
  onBook: () => void;
  isBooking: boolean;
  disabled: boolean;
}) {
  const date = new Date(slot.start_time);
  const now = new Date();

  // "Today", "Tomorrow", or day name
  const dayLabel = (() => {
    const diffDays = Math.floor((date.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
    const d = new Date(slot.start_time);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'long' });
  })();

  const timeStr = new Date(slot.start_time).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = new Date(slot.start_time).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  // Time of day tag
  const hour = new Date(slot.start_time).getHours();
  const timeOfDay = hour < 12 ? '🌅 Morning' : hour < 17 ? '☀️ Afternoon' : '🌙 Evening';

  return (
    <button
      onClick={onBook}
      disabled={disabled || isBooking}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '14px 16px',
        borderRadius: '16px',
        border: `2px solid ${isBooking ? '#4f46e5' : '#e2e8f0'}`,
        backgroundColor: isBooking ? '#eef2ff' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#4f46e5';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f8faff';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(79,70,229,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isBooking) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff';
          (e.currentTarget as HTMLButtonElement).style.transform = 'none';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
            {dayLabel}, {dateStr}
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '20px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
          }}>
            {timeOfDay}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {timeStr}
          </span>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>· {slot.duration_minutes} min</span>
          {slot.topic && (
            <span className={`text-xs font-medium ${topicColor(slot.topic)}`}>
              {topicLabel(slot.topic)}
            </span>
          )}
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderRadius: '10px',
        background: isBooking ? '#c7d2fe' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
      }}>
        {isBooking ? 'Booking...' : 'Book →'}
      </div>
    </button>
  );
}

export default function MentorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, profile } = useAuthStore();

  const [mentor, setMentor] = useState<Profile | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [interviewCount, setInterviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [checkoutSlot, setCheckoutSlot] = useState<Slot | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: mentorData }, { data: slotData }, { data: reviewData }, { count: bookingCount }] = await Promise.all([
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
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('mentor_id', id)
          .eq('status', 'completed'),
      ]);
      setMentor(mentorData as Profile);
      setSlots((slotData as Slot[]) ?? []);
      setReviews((reviewData as unknown as Review[]) ?? []);
      setInterviewCount(bookingCount ?? 0);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const initiateBookSlot = (slot: Slot) => {
    if (!session) {
      navigate('/login');
      return;
    }
    setCheckoutSlot(slot);
    setError(null);
  };

  const handleConfirmPaymentBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutSlot || !session || !mentor) return;

    setError(null);
    setBooking(checkoutSlot.id);

    const roomName = `roundora-${checkoutSlot.id}-${Date.now().toString(36)}`;

    const { error: bookingError } = await supabase.from('bookings').insert({
      student_id: session.user.id,
      mentor_id: mentor.id,
      slot_id: checkoutSlot.id,
      meeting_room: roomName,
      status: 'confirmed',
    });

    if (bookingError) {
      setError(bookingError.message);
      setBooking(null);
      return;
    }

    await supabase.from('slots').update({ is_booked: true }).eq('id', checkoutSlot.id);

    // Notify admin team via support ticket API
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${SUPABASE_URL}/functions/v1/send-support-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          senderEmail: session.user.email ?? 'student@roundora.in',
          senderName: profile?.full_name ?? 'Student',
          subject: `💳 NEW BOOKING PAYMENT: UTR ${utrNumber || 'N/A'} | Mentor: ${mentor.full_name}`,
          message: `New booking confirmed!\nStudent: ${profile?.full_name}\nMentor: ${mentor.full_name}\nSlot Time: ${checkoutSlot.start_time}\nUTR / Ref Number: ${utrNumber}\nResume Link: ${resumeUrl || 'None'}\nStudent Notes: ${studentNotes || 'None'}`,
        }),
      });
    } catch (err) {
      console.error('Failed to notify admin of booking:', err);
    }

    setBooking(null);
    setBookedSlot(checkoutSlot);
    setCheckoutSlot(null);
    setSuccess(true);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: '80px', borderRadius: '16px', backgroundColor: '#f1f5f9', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Mentor not found</h1>
        <Link to="/mentors" style={{ color: '#4f46e5', textDecoration: 'none', marginTop: '12px', display: 'inline-block' }}>← Browse mentors</Link>
      </div>
    );
  }

  if (success && bookedSlot) {
    const bookedDate = new Date(bookedSlot.start_time);
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: '#0f0f1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
          }}>
            <CheckCircle2 size={40} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: '800', margin: '0 0 8px' }}>
            Session Booked! 🎉
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
            Your session with <strong style={{ color: '#fff' }}>{mentor.full_name}</strong> is confirmed.
          </p>

          {/* Booking Details Card */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Booking Details
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={16} color="#6366f1" />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  {bookedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} color="#6366f1" />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  {bookedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '400', marginLeft: '6px' }}>
                    · {bookedSlot.duration_minutes} min
                  </span>
                </span>
              </div>
              {bookedSlot.topic && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={16} color="#6366f1" />
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                    {topicLabel(bookedSlot.topic)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Sync Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <a
              href={getGoogleCalendarUrl({
                title: `Roundora 1-on-1 Session with ${mentor?.full_name}`,
                description: `Mock Interview Session with ${mentor?.full_name} (${mentor?.company ?? 'Verified Mentor'}). Topic: ${topicLabel(bookedSlot.topic ?? '')}`,
                location: `${window.location.origin}/dashboard`,
                startTimeIso: bookedSlot.start_time,
                durationMinutes: bookedSlot.duration_minutes,
              })}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: '700',
                textDecoration: 'none',
              }}
            >
              📅 Google Calendar
            </a>

            <button
              onClick={() => downloadIcsFile({
                title: `Roundora 1-on-1 Session with ${mentor?.full_name}`,
                description: `Mock Interview Session with ${mentor?.full_name}. Topic: ${topicLabel(bookedSlot.topic ?? '')}`,
                location: `${window.location.origin}/dashboard`,
                startTimeIso: bookedSlot.start_time,
                durationMinutes: bookedSlot.duration_minutes,
              })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              📥 Download .ics
            </button>
          </div>

          <Link
            to="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            Go to My Bookings →
          </Link>
        </div>
      </div>
    );
  }

  const isMentor = profile?.role === 'mentor';
  const isOwnProfile = session?.user.id === id;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back button */}
      <Link
        to="/mentors"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: '#64748b',
          textDecoration: 'none',
          fontSize: '14px',
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={16} /> All mentors
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Profile Header Card */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Avatar url={mentor.avatar_url} name={mentor.full_name} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {mentor.full_name}
                </h1>
                {mentor.is_verified && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: '700', color: '#059669',
                    backgroundColor: '#d1fae5', border: '1px solid #a7f3d0',
                    padding: '3px 10px', borderRadius: '20px',
                  }}>
                    <ShieldCheck size={11} /> Roundora Verified
                  </span>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                {mentor.headline ?? 'Interviewer'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <StarRating rating={avgRating ?? 5.0} size={16} />
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: '700' }}>
                  {avgRating !== null ? `${avgRating.toFixed(1)} (${reviews.length} review${reviews.length !== 1 ? 's' : ''})` : '5.0 ★ (New)'}
                </span>
                {interviewCount > 0 && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>· {interviewCount} interviews</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {mentor.company && (
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Briefcase size={13} /> {mentor.company}
                  </span>
                )}
                {mentor.years_experience != null && (
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={13} /> {mentor.years_experience} yrs exp
                  </span>
                )}
                {mentor.linkedin_url && (
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: '#0a66c2', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                  >
                    <Linkedin size={13} /> LinkedIn
                  </a>
                )}
              </div>
            </div>
            {mentor.price_per_session != null && (
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '16px',
                padding: '12px 18px',
                textAlign: 'center',
                flexShrink: 0,
              }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <IndianRupee size={18} />{mentor.price_per_session}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>per session</div>
              </div>
            )}
          </div>

          {mentor.expertise && mentor.expertise.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {mentor.expertise.map((tag) => (
                <span
                  key={tag}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${topicColor(tag)}`}
                  style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  {topicLabel(tag)}
                </span>
              ))}
            </div>
          )}

          {mentor.bio && (
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.7, margin: 0 }}>
              {mentor.bio}
            </p>
          )}
        </div>

        {/* Slots Section */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#4f46e5" /> Available Slots
            </h2>
            {slots.length > 0 && (
              <span style={{
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                fontWeight: '600',
              }}>
                {slots.length} slot{slots.length !== 1 ? 's' : ''} open
              </span>
            )}
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px',
              color: '#be123c',
              fontSize: '13px',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              {error}
            </div>
          )}

          {slots.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '16px',
              border: '1px dashed #e2e8f0',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
              <div style={{ fontWeight: '600', color: '#374151', fontSize: '15px', marginBottom: '6px' }}>
                No slots available right now
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px', lineHeight: 1.5 }}>
                {isOwnProfile
                  ? 'Go to your dashboard and add available time slots so students can book you.'
                  : 'This mentor hasn\'t added any slots yet. Check back soon!'}
              </p>
              {isOwnProfile && (
                <Link
                  to="/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  + Add Slots from Dashboard
                </Link>
              )}
              {!session && !isOwnProfile && (
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Login to get notified
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!session && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#92400e',
                  marginBottom: '4px',
                }}>
                  ⚠️ <Link to="/login" style={{ color: '#92400e', fontWeight: '700' }}>Login</Link> to book a slot.
                </div>
              )}
              {isMentor && !isOwnProfile && (
                <div style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#64748b',
                  marginBottom: '4px',
                }}>
                  ℹ️ Mentors can't book sessions.
                </div>
              )}
              {slots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  onBook={() => initiateBookSlot(slot)}
                  isBooking={booking === slot.id}
                  disabled={!session || isMentor || isOwnProfile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct UPI Payment Checkout Modal */}
        {checkoutSlot && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <button
                onClick={() => setCheckoutSlot(null)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  border: 'none',
                  background: '#f1f5f9',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#64748b',
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '36px' }}>💳</span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '6px 0 2px' }}>
                  Complete Your Booking
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Session with <strong>{mentor?.full_name}</strong> ({topicLabel(checkoutSlot.topic ?? '')})
                </p>
              </div>

              {/* Price Banner */}
              <div style={{
                backgroundColor: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '12px', color: '#4338ca', fontWeight: '700', textTransform: 'uppercase' }}>
                  Total Session Fee
                </span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#3730a3', marginTop: '2px' }}>
                  ₹{mentor?.price_per_session ?? 499}
                </div>
              </div>

              {/* UPI Payment Instructions */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                  📲 Pay via UPI / GPay / PhonePe / Paytm
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '12px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Roundora Team UPI ID:</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>7488455190@upi</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText('7488455190@upi')}
                    style={{ background: '#e0e7ff', color: '#3730a3', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Copy UPI
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  📞 Team WhatsApp / Call Support: <strong>+91 7488455190</strong>
                </div>
              </div>

              <form onSubmit={handleConfirmPaymentBooking} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Payment UTR / Transaction Reference No. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 429104820193 or UPI Ref ID"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Resume / Portfolio / LinkedIn Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/my-resume.pdf"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Note / Topics to Focus On (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Please focus on System Design LRU cache & Dynamic Programming"
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={booking === checkoutSlot.id}
                  style={{
                    padding: '14px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #16a34a, #059669)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                    marginTop: '6px',
                  }}
                >
                  {booking === checkoutSlot.id ? 'Confirming Booking...' : '✓ Confirm & Complete Booking'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={20} color="#f59e0b" fill="#f59e0b" /> What students say
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reviews.map((r) => (
                <div key={r.id} style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar url={r.student?.avatar_url} name={r.student?.full_name} size={32} />
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                        {r.student?.full_name ?? 'Student'}
                      </span>
                    </div>
                    <StarRating rating={r.rating} size={14} />
                  </div>
                  {r.comment && (
                    <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                      "{r.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
