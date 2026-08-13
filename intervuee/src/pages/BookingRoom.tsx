import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Video,
  ExternalLink,
  ShieldCheck,
  User,
  Star,
  PhoneCall,
  MessageCircle,
  Mail,
  CheckCircle2,
  PhoneOff,
  Headphones,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import type { Booking } from '../types';

const TEAM_CONTACT_NUMBER = '7488455190';
const TEAM_CONTACT_PHONE = '+917488455190';
const TEAM_CONTACT_EMAIL = 'support@roundora.in';

export default function BookingRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { profile } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  // Post-call state
  const [callEnded, setCallEnded] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, mentor:mentor_id(*), student:student_id(*)')
        .eq('id', bookingId)
        .single();

      if (data) {
        setBooking(data as unknown as Booking);
        // Check if review already exists for this booking
        if (profile?.id) {
          const { data: existingReview } = await supabase
            .from('reviews')
            .select('id, rating, comment')
            .eq('booking_id', bookingId)
            .single();
          if (existingReview) {
            setReviewSubmitted(true);
            setRating(existingReview.rating);
            if (existingReview.comment) setComment(existingReview.comment);
          }
        }
      }
      setLoading(false);
    };
    if (bookingId) fetchBooking();
  }, [bookingId, profile?.id]);

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!booking || !profile) return;

    setReviewSubmitting(true);
    setReviewError(null);

    const targetMentorId = booking.mentor_id;

    const { error } = await supabase.from('reviews').upsert(
      {
        booking_id: booking.id,
        student_id: profile.id,
        mentor_id: targetMentorId,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: 'booking_id' }
    );

    if (error) {
      console.error('Review submit error:', error);
      setReviewError(error.message || 'Failed to submit review. Please try again.');
    } else {
      setReviewSubmitted(true);
      // Mark booking as completed
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id);
    }
    setReviewSubmitting(false);
  };

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

  const starLabels: Record<number, string> = {
    1: 'Poor 😞',
    2: 'Fair 😐',
    3: 'Good 🙂',
    4: 'Very Good 😊',
    5: 'Excellent! 🌟',
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={jitsiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs sm:text-sm !px-3.5 !py-2 shrink-0 shadow-sm inline-flex items-center gap-1.5"
          >
            <ExternalLink size={14} /> Open Fullscreen App
          </a>

          {!callEnded ? (
            <button
              onClick={() => setCallEnded(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
            >
              <PhoneOff size={15} /> End Call & Rate
            </button>
          ) : (
            <button
              onClick={() => setCallEnded(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
            >
              <Video size={15} /> Rejoin Video Room
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      {!callEnded ? (
        <>
          {/* Active Call Info Card */}
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

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 font-medium">
                <ShieldCheck size={13} /> Encrypted Video Room
              </div>
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

          {/* Bottom Bar note & End Call quick link */}
          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-500">
            <p className="hidden sm:block">
              💡 Mobile browser audio/video issues? Click <strong>"Open Fullscreen App"</strong> above.
            </p>
            <button
              onClick={() => setCallEnded(true)}
              className="text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-4 ml-auto"
            >
              Finished call? Leave & Leave Review →
            </button>
          </div>
        </>
      ) : (
        /* Call Ended — Post Call Screen & Review / Team Support */
        <div className="space-y-6 animate-fadeIn">
          {/* Header Status Card */}
          <div className="card p-6 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white border-0 shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto mb-3 text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mb-1">Call Ended</h2>
            <p className="text-indigo-200 text-sm max-w-md mx-auto">
              Thank you for participating in your Roundora 1-on-1 session with{' '}
              <strong>{otherPerson?.full_name ?? 'Participant'}</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Star Rating & Review Form (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="card p-6 border-slate-200 shadow-md bg-white">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Star className="text-amber-500 fill-amber-500" size={20} />
                  Rate & Review Your Session
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Your feedback helps maintain quality and helps mentors improve.
                </p>

                {reviewSubmitted ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-2">
                      <CheckCircle2 size={26} />
                    </div>
                    <h4 className="font-bold text-emerald-900 text-base">Review Submitted!</h4>
                    <p className="text-xs text-emerald-700 mt-1">
                      Thank you for sharing your review ({rating} ★). Your feedback is recorded.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-5">
                    {reviewError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                        {reviewError}
                      </div>
                    )}

                    {/* Star selection */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Your Rating
                      </span>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = star <= (hoverRating || rating);
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                            >
                              <Star
                                size={32}
                                className={
                                  active
                                    ? 'text-amber-400 fill-amber-400 drop-shadow'
                                    : 'text-slate-300'
                                }
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 mt-2">
                        {starLabels[hoverRating || rating]}
                      </span>
                    </div>

                    {/* Comment box */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Session Feedback / Comments (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="How was the mock interview? Was the feedback helpful?"
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="btn-primary w-full justify-center !py-3 font-bold text-sm shadow-md"
                    >
                      {reviewSubmitting ? 'Submitting Review...' : '⭐ Submit Review'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Roundora Team Connect & Support (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="card p-6 border-indigo-200 bg-gradient-to-b from-indigo-50/50 via-white to-purple-50/50 shadow-md">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Roundora Team Support</h3>
                    <p className="text-xs text-slate-500">Need help or facing any issues?</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Our dedicated support team is available to assist you with booking issues, payment queries, or technical feedback.
                </p>

                {/* Direct Contact Buttons */}
                <div className="space-y-2.5">
                  {/* Phone Call */}
                  <a
                    href={`tel:${TEAM_CONTACT_PHONE}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 transition-all text-slate-800 text-xs font-semibold group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <PhoneCall size={16} />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold">Call Support Team</div>
                        <div className="text-[11px] text-slate-500">{TEAM_CONTACT_NUMBER}</div>
                      </div>
                    </div>
                    <span className="text-emerald-600 group-hover:translate-x-1 transition-transform font-bold text-[11px]">
                      Call Now →
                    </span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/91${TEAM_CONTACT_NUMBER}?text=Hi%20Roundora%20Team%2C%20I%20need%20help%20with%20my%20session%20(ID%3A%20${bookingId})`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-slate-800 text-xs font-semibold group shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <MessageCircle size={16} />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold">WhatsApp Support</div>
                        <div className="text-[11px] text-slate-500">Chat on {TEAM_CONTACT_NUMBER}</div>
                      </div>
                    </div>
                    <span className="text-emerald-600 group-hover:translate-x-1 transition-transform font-bold text-[11px]">
                      Chat →
                    </span>
                  </a>
                </div>

                {/* Misbehaviour / Urgent Issue Alert Box */}
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200/90 text-left">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                    <span>🚨</span> Report Misbehaviour / Abuse
                  </div>
                  <p className="text-[11px] text-rose-700 leading-normal mb-2.5">
                    If the interviewer or student engaged in inappropriate conduct or guidelines violation, report it directly to Admin.
                  </p>
                  <a
                    href={`https://wa.me/91${TEAM_CONTACT_NUMBER}?text=URGENT%3A%20Misbehaviour%20Report%20for%20Session%20ID%3A%20${bookingId}%20%7C%20Participant%3A%20${encodeURIComponent(otherPerson?.full_name ?? '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                  >
                    🚩 Report Misbehaviour ({TEAM_CONTACT_NUMBER})
                  </a>
                </div>

                {/* Return button */}
                <div className="mt-4 pt-3 border-t border-slate-200/80">
                  <Link
                    to="/dashboard"
                    className="btn-secondary w-full justify-center !py-2.5 text-xs font-bold"
                  >
                    ← Return to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

