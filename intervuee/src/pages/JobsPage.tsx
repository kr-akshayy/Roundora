import { Link } from 'react-router-dom';
import { Briefcase, ArrowLeft, ShieldCheck, Sparkles, Building2, Video } from 'lucide-react';
import LiveJobsWidget from '../components/LiveJobsWidget';

export default function JobsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 font-sans">
      {/* Top Banner Header */}
      <div className="mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white mb-4 transition-colors font-medium"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-rose-400 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="animate-spin" style={{ animationDuration: '4s' }} /> Verified Tech Hiring Portal
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Active Tech Vacancies & Job Openings 💼
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Explore genuine engineering vacancies fetched directly from top career portals (Naukri, LinkedIn, Indeed & Company Portals). Apply directly and practice 1-on-1 mock interviews to land the job!
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-400" /> 100% Genuine Verified Vacancies
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 size={16} className="text-indigo-400" /> Top Tech Product Companies & Startups
            </span>
          </div>
        </div>
      </div>

      {/* Live Jobs Widget */}
      <LiveJobsWidget />
    </div>
  );
}
