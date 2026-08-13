import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, IndianRupee, ExternalLink, Search, Sparkles, Building2, ShieldCheck, ArrowRight, Video } from 'lucide-react';
import { JOBS_DATA, JobOpening } from '../data/jobsData';

export default function LiveJobsWidget({ limit }: { limit?: number }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Backend', 'Frontend', 'Fullstack', 'DevOps', 'Data Science'];

  const filteredJobs = JOBS_DATA.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const displayedJobs = limit ? filteredJobs.slice(0, limit) : filteredJobs;

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles, skills, companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 text-white placeholder-slate-400 pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-800 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 no-scrollbar">
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedJobs.map((job) => (
          <div
            key={job.id}
            className="card p-5 bg-white border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all rounded-2xl flex flex-col justify-between group"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md">
                    {job.company.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 group-hover:text-brand-600 transition-colors">
                      {job.company}
                      <ShieldCheck size={14} className="text-emerald-600" />
                    </h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={11} /> {job.location}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-1 animate-pulse">
                  <Sparkles size={11} /> {job.postedAgo}
                </span>
              </div>

              {/* Title & Package */}
              <h4 className="text-base font-extrabold text-slate-900 mb-1.5">
                {job.title}
              </h4>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  💰 {job.ctc}
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  💼 Exp: {job.experience}
                </span>
                <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  Source: {job.source}
                </span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                {job.description}
              </p>

              {/* Skills badges */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10.5px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 btn-primary text-xs !py-2.5 justify-center"
              >
                Apply Now <ExternalLink size={13} />
              </a>

              <Link
                to="/mentors"
                className="flex-1 btn-secondary text-xs !py-2.5 justify-center text-brand-700 bg-brand-50 border-brand-200 hover:bg-brand-100"
                title="Book 1-on-1 Mock Interview to prepare for this company"
              >
                <Video size={13} /> Book Mock Practice
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* View All CTAs */}
      {limit && (
        <div className="text-center pt-2">
          <Link
            to="/jobs"
            className="btn-secondary inline-flex items-center gap-2 text-xs font-bold px-6 py-3 rounded-xl border border-slate-300"
          >
            Explore All Tech Vacancies & Job Alerts <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
