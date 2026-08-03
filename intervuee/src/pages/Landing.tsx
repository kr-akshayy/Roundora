import { Link } from 'react-router-dom';
import { ArrowRight, Video, ShieldCheck, Timer, Code2, Users2, Sparkles } from 'lucide-react';

const rounds = [
  { n: '01', label: 'Screening', desc: 'Resume walkthrough & background fit', color: 'text-cyan-600' },
  { n: '02', label: 'Technical', desc: 'DSA, coding rounds with live feedback', color: 'text-brand-600' },
  { n: '03', label: 'System Design', desc: 'Architecture & trade-off discussions', color: 'text-purple-600' },
  { n: '04', label: 'Hiring Manager / HR', desc: 'Behavioural & culture fit', color: 'text-emerald-600' },
];

const stats = [
  { value: '500+', label: 'verified interviewers' },
  { value: '4.8/5', label: 'avg. session rating' },
  { value: '24 hrs', label: 'avg. booking to session' },
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

        {/* Signature element: live "session card" mimicking the actual product */}
        <div className="relative">
          <div className="card p-5 shadow-glow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-medium text-slate-500">Live session</span>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Timer size={12} /> 32:14
              </span>
            </div>
            <div className="aspect-video rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-hero-pattern" />
              <Video size={28} className="text-slate-300 relative" />
              <span className="absolute bottom-3 left-3 text-xs bg-slate-900/70 text-white px-2 py-1 rounded-md">
                Round: System Design
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-xs font-semibold text-purple-700">
                  RS
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">Rohan S.</div>
                  <div className="text-xs text-slate-500">Staff Eng, ex-Amazon</div>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <ShieldCheck size={11} /> Verified
              </span>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 card px-4 py-3 shadow-md hidden sm:block">
            <div className="flex items-center gap-2 text-sm">
              <Code2 size={14} className="text-emerald-600" />
              <span className="font-medium text-slate-800">Feedback sent</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">within 2 hours</div>
          </div>
        </div>
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
            Every mentor's work history is manually checked before they can take bookings.
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
