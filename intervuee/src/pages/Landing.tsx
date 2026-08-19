import { Link } from 'react-router-dom';
import { ArrowRight, Users2, Sparkles, Video, ShieldCheck } from 'lucide-react';
import LiveInterviewSimulation from '../components/LiveInterviewSimulation';

const rounds = [
  { n: '01', label: 'Screening', desc: 'Resume walkthrough & background fit', color: 'text-cyan-600' },
  { n: '02', label: 'Technical', desc: 'DSA, coding rounds with live feedback', color: 'text-brand-600' },
  { n: '03', label: 'System Design', desc: 'Architecture & trade-off discussions', color: 'text-purple-600' },
  { n: '04', label: 'Hiring Manager / HR', desc: 'Behavioural & culture fit', color: 'text-emerald-600' },
];

const stats = [
  { value: '1-on-1', label: 'personalized sessions' },
  { value: 'Free', label: 'to sign up & browse' },
  { value: 'Live', label: 'video calls built in' },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
        <div className="inline-flex items-center gap-2.5 mb-6">
          <img
            src="/roundora-logo.jpg"
            alt="Roundora"
            style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}
          />
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-full px-3 py-1.5">
            <Sparkles size={12} />
            Roundora — Practice the exact round you're nervous about
          </div>
        </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-slate-900">
            Mock interviews with engineers who've actually{' '}
            <span className="text-brand-600">sat on the other side</span> of the table.
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            Book a 1-on-1 session with a verified senior engineer, pick the exact round you need —
            coding, system design, or HR — and walk in prepared, not guessing.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/mentors" className="btn-primary">
              Book a mock interview
              <ArrowRight size={16} />
            </Link>
            <Link to="/signup" className="btn-secondary">
              Become an interviewer
            </Link>
          </div>
          <div className="flex flex-wrap gap-8 mt-10 pt-8 border-t border-slate-200">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signature element: Live animated mock interview simulation running on repeat */}
        <LiveInterviewSimulation />
      </section>

      {/* Rounds — real sequence, so numbering is earned here */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
          Practice each round on its own
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {rounds.map((r) => (
            <div key={r.n} className="card p-5 hover:shadow-md hover:border-slate-300 transition-all">
              <div className={`text-xs font-mono ${r.color} mb-3 font-bold`}>{r.n}</div>
              <div className="font-semibold mb-1 text-slate-900">{r.label}</div>
              <div className="text-sm text-slate-500">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-4">
            <Users2 size={20} className="text-brand-600" />
          </div>
          <div className="font-semibold mb-1.5 text-slate-900">Verified interviewers only</div>
          <p className="text-sm text-slate-500">
            Every interviewer's work history is manually checked before they can take bookings.
          </p>
        </div>
        <div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mb-4">
            <Video size={20} className="text-cyan-600" />
          </div>
          <div className="font-semibold mb-1.5 text-slate-900">Video call built in</div>
          <p className="text-sm text-slate-500">
            No separate scheduling link — join your session straight from your dashboard.
          </p>
        </div>
        <div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <div className="font-semibold mb-1.5 text-slate-900">Honest, written feedback</div>
          <p className="text-sm text-slate-500">
            Get a structured scorecard after every session, not just a verbal "you did fine."
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 text-center">
        <h2 className="text-2xl font-bold mb-3 text-slate-900">Ready to stop guessing what they'll ask?</h2>
        <p className="text-slate-500 mb-6">Book your first mock interview in under 2 minutes.</p>
        <Link to="/mentors" className="btn-primary inline-flex">
          Browse interviewers
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}
