import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, ShieldCheck, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import { generateScorecardPrintableWindow } from '../lib/scorecardPdf';
import type { InterviewScorecard, Booking } from '../types';

// ─── Score Bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, max = 10 }: { label: string; score: number | null; max?: number }) {
  if (score === null) return null;
  const pct = (score / max) * 100;
  const color =
    score >= 8 ? 'bg-emerald-500' :
    score >= 6 ? 'bg-brand-500' :
    score >= 4 ? 'bg-amber-500' : 'bg-rose-500';
  const textColor =
    score >= 8 ? 'text-emerald-700' :
    score >= 6 ? 'text-brand-700' :
    score >= 4 ? 'text-amber-700' : 'text-rose-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        <span className={`text-sm font-extrabold ${textColor}`}>{score.toFixed(1)}<span className="text-xs font-normal text-slate-400">/10</span></span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Recommendation Badge ──────────────────────────────────────────────────────

function RecommendationBadge({ rec }: { rec: string | null }) {
  if (!rec) return null;
  const map = {
    strong_hire: { label: '✅ Strong Hire', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    consider: { label: '🔄 Consider', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    no_hire: { label: '❌ No Hire', cls: 'text-rose-700 bg-rose-50 border-rose-200' },
  };
  const m = map[rec as keyof typeof map];
  if (!m) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold ${m.cls}`}>
      {m.label}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ViewScorecard() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { profile } = useAuthStore();

  const [scorecard, setScorecard] = useState<InterviewScorecard | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!bookingId || !profile) return;

      const [{ data: bookingData }, { data: scorecardData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, mentor:mentor_id(*), student:student_id(*), slot:slot_id(*)')
          .eq('id', bookingId)
          .single(),
        supabase
          .from('interview_scorecards')
          .select('*, interviewer:interviewer_id(*), candidate:candidate_id(*)')
          .eq('booking_id', bookingId)
          .single(),
      ]);

      if (!bookingData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const b = bookingData as unknown as Booking;
      setBooking(b);

      // Access control: only candidate or interviewer
      if (profile.id !== b.student_id && profile.id !== b.mentor_id && !profile.is_admin) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (scorecardData) {
        setScorecard(scorecardData as unknown as InterviewScorecard);
      } else {
        setNotFound(true);
      }

      setLoading(false);
    };
    fetch();
  }, [bookingId, profile]);

  const handleDownloadPdf = () => {
    if (!scorecard || !booking) return;
    generateScorecardPrintableWindow({
      studentName: booking.student?.full_name ?? 'Candidate',
      mentorName: booking.mentor?.full_name ?? 'Interviewer',
      mentorCompany: booking.mentor?.company,
      rating: scorecard.overall_score ?? 0,
      comment: scorecard.notes,
      topic: booking.slot ? (booking.slot as unknown as { topic: string }).topic : null,
      dateStr: new Date(scorecard.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      bookingId: booking.id,
      scorecard,
    });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2">Access denied</h1>
        <p className="text-slate-500 mb-4">You don't have permission to view this scorecard.</p>
        <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    );
  }

  if (notFound || !scorecard || !booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-xl font-bold mb-2">Scorecard not available yet</h1>
        <p className="text-slate-500 mb-4">
          The interviewer hasn't submitted the scorecard for this session yet. Check back soon!
        </p>
        <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    );
  }

  const isCandidate = profile?.id === booking.student_id;
  const interviewDate = booking.slot
    ? new Date((booking.slot as unknown as { start_time: string }).start_time)
    : new Date(scorecard.created_at);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="card p-6 mb-5 bg-gradient-to-br from-brand-950 to-brand-700 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Official Interview Scorecard</div>
            <h1 className="text-2xl font-extrabold mb-1">
              {isCandidate ? 'Your Interview Performance' : `${booking.student?.full_name ?? 'Candidate'}'s Scorecard`}
            </h1>
            <div className="text-sm opacity-70">
              {interviewDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-6xl font-black">{scorecard.overall_score?.toFixed(1) ?? '—'}</div>
            <div className="text-sm opacity-60">Overall Score /10</div>
          </div>
        </div>
        {scorecard.recommendation && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <RecommendationBadge rec={scorecard.recommendation} />
          </div>
        )}
      </div>

      {/* Interviewer Card */}
      <div className="card p-5 mb-5 flex items-center gap-4">
        <Avatar url={booking.mentor?.avatar_url ?? null} name={booking.mentor?.full_name ?? 'Interviewer'} size={52} />
        <div>
          <div className="text-xs text-slate-400 font-medium mb-0.5">Interviewed by</div>
          <div className="font-bold text-slate-900">{booking.mentor?.full_name ?? 'Interviewer'}</div>
          <div className="text-sm text-slate-500">{booking.mentor?.headline ?? 'Verified Interviewer'}</div>
          <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <ShieldCheck size={9} /> Roundora Verified
          </div>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="card p-6 mb-5 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" /> Performance Breakdown
        </h2>
        <ScoreBar label="Technical Knowledge" score={scorecard.technical_score} />
        <ScoreBar label="DSA & Coding" score={scorecard.dsa_score} />
        <ScoreBar label="Problem Solving" score={scorecard.problem_solving_score} />
        <ScoreBar label="Communication" score={scorecard.communication_score} />
        <ScoreBar label="Confidence" score={scorecard.confidence_score} />
        <ScoreBar label="Code Quality" score={scorecard.code_quality_score} />
      </div>

      {/* Strengths */}
      {scorecard.strengths && scorecard.strengths.length > 0 && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="text-emerald-500">✓</span> Strengths
          </h2>
          <ul className="space-y-2">
            {scorecard.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-emerald-500 mt-0.5 shrink-0">●</span>
                <span className="text-sm text-slate-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas to Improve */}
      {scorecard.improvements && scorecard.improvements.length > 0 && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" /> Areas to Improve
          </h2>
          <ul className="space-y-2">
            {scorecard.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-amber-400 mt-0.5 shrink-0">●</span>
                <span className="text-sm text-slate-700">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions Asked */}
      {scorecard.questions_asked && scorecard.questions_asked.length > 0 && (
        <div className="card p-6 mb-5">
          <h2 className="font-bold text-slate-900 mb-3">Questions Asked</h2>
          <div className="flex flex-wrap gap-2">
            {scorecard.questions_asked.map((q, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                {q}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Topics */}
      {scorecard.recommended_topics && scorecard.recommended_topics.length > 0 && (
        <div className="card p-6 mb-5 border-brand-200 bg-brand-50">
          <h2 className="font-bold text-brand-900 mb-3 flex items-center gap-2">
            <Star size={16} className="text-brand-600" /> Recommended Topics to Study
          </h2>
          <div className="flex flex-wrap gap-2">
            {scorecard.recommended_topics.map((t, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-brand-100 border border-brand-200 text-brand-700 font-medium">
                {t}
              </span>
            ))}
          </div>
          <p className="text-xs text-brand-600 mt-3">Focus on these topics before your next interview.</p>
        </div>
      )}

      {/* Interviewer Notes */}
      {scorecard.notes && (
        <div className="card p-6 mb-5 border-l-4 border-l-brand-500">
          <h2 className="font-bold text-slate-900 mb-2">Interviewer's Notes</h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{scorecard.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={handleDownloadPdf} className="btn-primary flex-1">
          <Download size={15} /> Download PDF
        </button>
        <Link to="/mentors" className="btn-secondary flex-1 justify-center">
          Book Another Interview
        </Link>
      </div>
    </div>
  );
}
