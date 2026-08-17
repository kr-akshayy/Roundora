import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, IndianRupee, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { TOPICS, topicLabel, topicColor } from '../lib/topics';
import type { Profile } from '../types';

interface RatingInfo {
  avg: number;
  count: number;
}

interface InterviewCount {
  count: number;
}

export default function Mentors() {
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [interviewCounts, setInterviewCounts] = useState<Record<string, InterviewCount>>({});
  const [nextSlots, setNextSlots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minExp, setMinExp] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date().toISOString();

      const [
        { data: mentorData },
        { data: reviewData },
        { data: bookingData },
        { data: slotData },
      ] = await Promise.all([
        // Only fetch VERIFIED mentors
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'mentor')
          .eq('is_verified', true)
          .eq('is_suspended', false),
        supabase.from('reviews').select('mentor_id, rating'),
        supabase
          .from('bookings')
          .select('mentor_id')
          .eq('status', 'completed'),
        supabase
          .from('slots')
          .select('mentor_id, start_time')
          .eq('is_booked', false)
          .gte('start_time', now)
          .order('start_time', { ascending: true }),
      ]);

      if (mentorData) setMentors(mentorData as Profile[]);

      if (reviewData) {
        const grouped: Record<string, number[]> = {};
        (reviewData as { mentor_id: string; rating: number }[]).forEach((r) => {
          grouped[r.mentor_id] = grouped[r.mentor_id] ?? [];
          grouped[r.mentor_id].push(r.rating);
        });
        const summary: Record<string, RatingInfo> = {};
        Object.entries(grouped).forEach(([mentorId, arr]) => {
          summary[mentorId] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length };
        });
        setRatings(summary);
      }

      if (bookingData) {
        const counts: Record<string, InterviewCount> = {};
        (bookingData as { mentor_id: string }[]).forEach((b) => {
          counts[b.mentor_id] = { count: (counts[b.mentor_id]?.count ?? 0) + 1 };
        });
        setInterviewCounts(counts);
      }

      if (slotData) {
        const earliest: Record<string, string> = {};
        (slotData as { mentor_id: string; start_time: string }[]).forEach((s) => {
          if (!earliest[s.mentor_id]) earliest[s.mentor_id] = s.start_time;
        });
        setNextSlots(earliest);
      }

      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = mentors.filter((m) => {
    const matchesSearch = `${m.full_name} ${m.headline ?? ''} ${m.company ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTopic = !activeTopic || (m.expertise ?? []).includes(activeTopic);
    const matchesExp = minExp === null || (m.years_experience ?? 0) >= minExp;
    const matchesPrice = maxPrice === null || (m.price_per_session ?? 0) <= maxPrice;
    return matchesSearch && matchesTopic && matchesExp && matchesPrice;
  });

  const formatNextSlot = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((date.setHours(0,0,0,0) - now.setHours(0,0,0,0)) / 86400000);
    const slotDate = new Date(iso);
    const timeStr = slotDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Tomorrow, ${timeStr}`;
    return slotDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${timeStr}`;
  };

  const activeFilterCount = [activeTopic, minExp !== null, maxPrice !== null].filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5">Find an Interviewer</h1>
        <p className="text-slate-500 text-sm">
          All interviewers are manually verified by Roundora.
          <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck size={13} /> Roundora Verified only
          </span>
        </p>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, or role..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border font-medium transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-brand-50 border-brand-500 text-brand-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="card p-4 mb-5 flex flex-wrap gap-5 items-end">
          <div>
            <label className="label-text text-xs">Min. Experience</label>
            <select
              value={minExp ?? ''}
              onChange={(e) => setMinExp(e.target.value ? Number(e.target.value) : null)}
              className="input-field text-sm !py-2"
            >
              <option value="">Any</option>
              {[2, 3, 5, 7, 10].map(y => (
                <option key={y} value={y}>{y}+ years</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text text-xs">Max. Price (₹)</label>
            <select
              value={maxPrice ?? ''}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
              className="input-field text-sm !py-2"
            >
              <option value="">Any</option>
              {[299, 499, 699, 999, 1499].map(p => (
                <option key={p} value={p}>Under ₹{p}</option>
              ))}
            </select>
          </div>
          {(minExp !== null || maxPrice !== null) && (
            <button
              onClick={() => { setMinExp(null); setMaxPrice(null); }}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200"
            >
              <X size={12} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Topic Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveTopic(null)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
            !activeTopic
              ? 'bg-brand-50 border-brand-500 text-brand-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All
        </button>
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTopic(t.id === activeTopic ? null : t.id)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              activeTopic === t.id
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-28 mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
              <div className="h-9 bg-slate-200 rounded-xl w-full mt-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-slate-700 mb-1">No interviewers found</p>
          <p className="text-sm text-slate-400">
            {mentors.length === 0
              ? "Interviewers are being verified. Check back soon!"
              : 'Try a different filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const rating = ratings[m.id];
            const icount = interviewCounts[m.id];
            const nextSlot = nextSlots[m.id];
            return (
              <Link
                key={m.id}
                to={`/mentors/${m.id}`}
                className="card p-5 hover:border-brand-400 hover:shadow-card-hover transition-all group flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar url={m.avatar_url} name={m.full_name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                      {m.full_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{m.headline ?? 'Interviewer'}</div>
                    {/* Verified Badge */}
                    <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={9} /> Roundora Verified
                    </div>
                  </div>
                </div>

                {/* Rating + Interview Count */}
                <div className="flex items-center gap-2 mb-3">
                  <StarRating rating={rating ? rating.avg : 5.0} size={13} />
                  <span className="text-xs font-bold text-slate-500">
                    {rating ? `${rating.avg.toFixed(1)}` : '5.0'} ★
                  </span>
                  {icount && icount.count > 0 && (
                    <span className="text-xs text-slate-400">· {icount.count} interviews</span>
                  )}
                </div>

                {/* Skills */}
                {m.expertise && m.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {m.expertise.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 font-medium ${topicColor(tag)}`}
                      >
                        {topicLabel(tag)}
                      </span>
                    ))}
                    {m.expertise.length > 3 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        +{m.expertise.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Bio */}
                <p className="text-xs text-slate-500 line-clamp-2 mb-auto">{m.bio ?? 'Experienced interviewer.'}</p>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Briefcase size={11} /> {m.company ?? '—'}
                    </span>
                    {m.price_per_session != null && (
                      <span className="flex items-center gap-0.5 font-bold text-slate-800">
                        <IndianRupee size={11} />
                        {m.price_per_session}/session
                      </span>
                    )}
                  </div>
                  {nextSlot ? (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 font-semibold">
                      🟢 Next: {formatNextSlot(nextSlot)}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      No slots open right now
                    </div>
                  )}
                  <div className="btn-primary !py-2 text-xs w-full justify-center">
                    View Profile & Book
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
