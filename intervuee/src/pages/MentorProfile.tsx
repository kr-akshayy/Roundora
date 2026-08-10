import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, IndianRupee, Calendar, CheckCircle2, AlertCircle,
  Clock, ArrowLeft, Star, Zap, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { topicLabel, topicColor } from '../lib/topics';
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
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

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

    const roomName = `roundora-${slot.id}-${Date.now().toString(36)}`;

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
    setBookedSlot(slot);
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
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                {mentor.full_name}
              </h1>
              <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                {mentor.headline ?? 'Interviewer'}
              </div>
              {avgRating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <StarRating rating={avgRating} size={15} />
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
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
                  onBook={() => handleBook(slot)}
                  isBooking={booking === slot.id}
                  disabled={!session || isMentor || isOwnProfile}
                />
              ))}
            </div>
          )}
        </div>

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
