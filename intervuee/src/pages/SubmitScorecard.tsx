import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Send, Plus, X, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import type { Booking, Recommendation } from '../types';
import { TOPICS, topicLabel } from '../lib/topics';

// ─── Score Slider ──────────────────────────────────────────────────────────────

function ScoreSlider({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  description?: string;
}) {
  const color = value >= 8 ? '#059669' : value >= 6 ? '#4f46e5' : value >= 4 ? '#d97706' : '#e11d48';
  const bgColor = value >= 8 ? '#d1fae5' : value >= 6 ? '#e0e7ff' : value >= 4 ? '#fef3c7' : '#ffe4e6';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        <span
          className="text-lg font-extrabold min-w-[3rem] text-center py-1 px-2 rounded-xl transition-all"
          style={{ color, backgroundColor: bgColor }}
        >
          {value.toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 w-4">0</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-brand-600 h-2 cursor-pointer"
        />
        <span className="text-xs text-slate-400 w-5">10</span>
      </div>
    </div>
  );
}

// ─── Tag Input ──────────────────────────────────────────────────────────────────

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  suggestions,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  return (
    <div>
      <label className="label-text">{label}</label>
      {/* Suggestions */}
      {suggestions && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestions.filter(s => !tags.includes(s)).slice(0, 12).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-all bg-white"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 p-2.5 bg-brand-50 rounded-xl border border-brand-100">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 border border-brand-200"
            >
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-600">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(input); }
            if (e.key === ',') { e.preventDefault(); addTag(input); }
          }}
          placeholder={placeholder ?? 'Type and press Enter...'}
          className="input-field flex-1 text-sm"
        />
        <button type="button" onClick={() => addTag(input)} className="btn-secondary !px-4 text-sm">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const RECOMMENDED_TOPICS_SUGGESTIONS = [
  'Arrays & Strings', 'Linked Lists', 'Trees & Graphs', 'Dynamic Programming',
  'Sliding Window', 'Binary Search', 'Recursion & Backtracking', 'Heaps & Priority Queues',
  'System Design Basics', 'Database Design', 'API Design', 'Caching Strategies',
  'Java Fundamentals', 'OOP Principles', 'Design Patterns', 'SQL Queries',
  'React Hooks', 'State Management', 'REST vs GraphQL', 'Microservices',
  'SOLID Principles', 'Time & Space Complexity', 'Communication Skills',
];

export default function SubmitScorecard() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Scores
  const [technical, setTechnical] = useState(5);
  const [dsa, setDsa] = useState(5);
  const [problemSolving, setProblemSolving] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [confidence, setConfidence] = useState(5);
  const [codeQuality, setCodeQuality] = useState(5);

  // Tags & text
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation>('consider');

  // Auto-calculated overall score (weighted average)
  const overallScore = Number(
    ((technical * 0.25) + (dsa * 0.20) + (problemSolving * 0.20) + (communication * 0.20) + (confidence * 0.05) + (codeQuality * 0.10)).toFixed(1)
  );

  useEffect(() => {
    const fetch = async () => {
      if (!bookingId) return;
      const [{ data: bookingData }, { data: existingCard }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, mentor:mentor_id(*), student:student_id(*), slot:slot_id(*)')
          .eq('id', bookingId)
          .single(),
        supabase.from('interview_scorecards').select('id').eq('booking_id', bookingId).single(),
      ]);

      setBooking(bookingData as unknown as Booking);
      if (existingCard) setExisting(true);
      setLoading(false);
    };
    fetch();
  }, [bookingId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!booking || !profile) return;

    // Security check: only the interviewer can submit
    if (profile.id !== booking.mentor_id) {
      setError('Only the interviewer of this session can submit the scorecard.');
      return;
    }

    if (booking.status !== 'completed') {
      setError('Scorecard can only be submitted for completed sessions.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase.from('interview_scorecards').insert({
      booking_id: bookingId,
      interviewer_id: profile.id,
      candidate_id: booking.student_id,
      technical_score: technical,
      dsa_score: dsa,
      problem_solving_score: problemSolving,
      communication_score: communication,
      confidence_score: confidence,
      code_quality_score: codeQuality,
      overall_score: overallScore,
      strengths,
      improvements,
      questions_asked: questionsAsked,
      recommended_topics: recommendedTopics,
      notes: notes || null,
      recommendation,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-2">Booking not found</h1>
        <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    );
  }

  if (profile?.id !== booking.mentor_id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-xl font-bold mb-2">Access denied</h1>
        <p className="text-slate-500 mb-4">Only the interviewer of this session can submit the scorecard.</p>
        <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
      </div>
    );
  }

  if (existing || submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-extrabold mb-2">
          {submitted ? 'Scorecard Submitted! 🎉' : 'Scorecard Already Submitted'}
        </h1>
        <p className="text-slate-500 mb-6">
          {submitted
            ? 'The candidate will be notified and can now view their detailed scorecard.'
            : 'You already submitted a scorecard for this session.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Link to={`/scorecard/${bookingId}`} className="btn-primary">View Scorecard</Link>
          <Link to="/dashboard" className="btn-secondary">← Dashboard</Link>
        </div>
      </div>
    );
  }

  const scoreColor = overallScore >= 8 ? 'text-emerald-600' : overallScore >= 6 ? 'text-brand-600' : overallScore >= 4 ? 'text-amber-600' : 'text-rose-600';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Submit Interview Scorecard</h1>
        <p className="text-slate-500 text-sm">
          Session with <strong>{booking.student?.full_name ?? 'Candidate'}</strong>
          {booking.slot && ` · ${new Date((booking.slot as unknown as { start_time: string }).start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="alert-error">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Overall Score Preview */}
        <div className="card p-5 bg-gradient-to-br from-brand-950 to-brand-700 text-white text-center">
          <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Calculated Overall Score</div>
          <div className={`text-5xl font-black ${overallScore >= 6 ? 'text-white' : 'text-rose-300'}`}>
            {overallScore}<span className="text-2xl opacity-60">/10</span>
          </div>
          <div className="text-xs opacity-60 mt-1">Auto-calculated from dimension scores</div>
        </div>

        {/* Dimension Scores */}
        <div className="card p-6 space-y-6">
          <h2 className="font-bold text-slate-900 text-base">Dimension Scores</h2>
          <ScoreSlider label="Technical Knowledge" value={technical} onChange={setTechnical} description="Domain knowledge, concepts, frameworks" />
          <ScoreSlider label="DSA / Coding" value={dsa} onChange={setDsa} description="Data structures, algorithms, complexity analysis" />
          <ScoreSlider label="Problem Solving" value={problemSolving} onChange={setProblemSolving} description="Approach, thinking out loud, edge cases" />
          <ScoreSlider label="Communication" value={communication} onChange={setCommunication} description="Clarity, articulation, ability to explain" />
          <ScoreSlider label="Confidence" value={confidence} onChange={setConfidence} description="Composure under pressure, decision-making" />
          <ScoreSlider label="Code Quality" value={codeQuality} onChange={setCodeQuality} description="Readability, structure, best practices" />
        </div>

        {/* Qualitative Feedback */}
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-slate-900 text-base">Qualitative Feedback</h2>

          <TagInput
            label="Strengths"
            tags={strengths}
            onChange={setStrengths}
            placeholder="e.g. Good Java fundamentals..."
            suggestions={['Good Java fundamentals', 'Clear communication', 'Strong problem approach', 'Well-structured code', 'Good CS basics', 'Time management', 'Active listening']}
          />

          <TagInput
            label="Areas to Improve"
            tags={improvements}
            onChange={setImprovements}
            placeholder="e.g. Algorithm optimization..."
            suggestions={['Algorithm optimization', 'Dynamic Programming', 'System Design depth', 'Edge case handling', 'Code optimization', 'API design knowledge', 'Database concepts']}
          />

          <TagInput
            label="Questions Asked"
            tags={questionsAsked}
            onChange={setQuestionsAsked}
            placeholder="e.g. LRU Cache, Reverse Linked List..."
          />

          <TagInput
            label="Recommended Topics to Study"
            tags={recommendedTopics}
            onChange={setRecommendedTopics}
            placeholder="e.g. Sliding Window, DP..."
            suggestions={RECOMMENDED_TOPICS_SUGGESTIONS}
          />

          <div>
            <label className="label-text">Additional Notes (Visible to Candidate)</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              placeholder="Any other observations, encouragement, or specific advice for the candidate..."
            />
          </div>
        </div>

        {/* Final Recommendation */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-900 text-base mb-4">Final Recommendation</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: 'strong_hire' as Recommendation, label: '✅ Strong Hire', desc: 'Ready for the role', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
              { value: 'consider' as Recommendation, label: '🔄 Consider', desc: 'Some gaps to fill', color: 'border-amber-400 bg-amber-50 text-amber-700' },
              { value: 'no_hire' as Recommendation, label: '❌ No Hire', desc: 'Needs more prep', color: 'border-rose-400 bg-rose-50 text-rose-700' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecommendation(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  recommendation === opt.value
                    ? `${opt.color} shadow-md scale-[1.02]`
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{opt.label}</div>
                <div className="text-[11px] mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || strengths.length === 0}
          className="btn-primary w-full !py-4 text-base"
        >
          <Send size={16} />
          {submitting ? 'Submitting Scorecard...' : 'Submit Scorecard'}
        </button>
        {strengths.length === 0 && (
          <p className="text-xs text-center text-slate-400">Add at least one strength to submit the scorecard.</p>
        )}
      </form>
    </div>
  );
}
