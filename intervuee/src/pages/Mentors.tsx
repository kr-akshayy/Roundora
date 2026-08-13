import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, IndianRupee, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from '../components/Avatar';
import StarRating from '../components/StarRating';
import { TOPICS, topicLabel, topicColor } from '../lib/topics';
import type { Profile } from '../types';

interface RatingInfo {
  avg: number;
  count: number;
}

export default function Mentors() {
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: mentorData }, { data: reviewData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'mentor'),
        supabase.from('reviews').select('mentor_id, rating'),
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

      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = mentors.filter((m) => {
    const matchesSearch = `${m.full_name} ${m.headline ?? ''} ${m.company ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesTopic = !activeTopic || (m.expertise ?? []).includes(activeTopic);
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <h1 className="text-2xl font-bold mb-2">Find an interviewer</h1>
      <p className="text-slate-500 mb-6 text-sm">Verified engineers, ready to run your mock round.</p>

      <div className="relative mb-5 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or role..."
          className="input-field pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveTopic(null)}
          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
            !activeTopic
              ? 'bg-brand-50 border-brand-500 text-brand-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All topics
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
                <div className="w-11 h-11 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-28 mb-1.5" />
                  <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
              <div className="h-4 bg-slate-200 rounded w-full pt-3 border-t border-slate-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">
          {mentors.length === 0
            ? "No interviewers yet. Once mentors sign up, they'll show up here."
            : 'No interviewers match this filter yet — try a different topic.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const rating = ratings[m.id];
            return (
              <Link
                key={m.id}
                to={`/mentors/${m.id}`}
                className="card p-5 hover:border-brand-600 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar url={m.avatar_url} name={m.full_name} size={44} />
                  <div>
                    <div className="font-semibold group-hover:text-brand-400 transition-colors">
                      {m.full_name}
                    </div>
                    <div className="text-xs text-slate-500">{m.headline ?? 'Interviewer'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <StarRating rating={rating ? rating.avg : 5.0} size={14} />
                  <span className="text-xs font-bold text-slate-400">
                    {rating ? `${rating.avg.toFixed(1)} (${rating.count})` : '5.0 ★ (New)'}
                  </span>
                </div>

                {m.expertise && m.expertise.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {m.expertise.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[11px] px-2 py-0.5 rounded-full bg-dark-bg border border-dark-border ${topicColor(
                          tag
                        )}`}
                      >
                        {topicLabel(tag)}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{m.bio ?? 'No bio added yet.'}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-dark-border">
                  <span className="flex items-center gap-1">
                    <Briefcase size={12} /> {m.company ?? '—'}
                  </span>
                  {m.price_per_session != null && (
                    <span className="flex items-center gap-0.5 text-slate-800 font-semibold">
                      <IndianRupee size={12} />
                      {m.price_per_session}/session
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
