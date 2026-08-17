import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Users, FileText, Calendar, Star, ChevronRight,
  CheckCircle2, XCircle, Clock, AlertTriangle, Ban, RefreshCw,
  Briefcase, IndianRupee, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import { topicLabel } from '../lib/topics';
import type { InterviewerApplication, Profile, Booking, Review, InterviewScorecard } from '../types';

type Tab = 'applications' | 'users' | 'bookings' | 'scorecards' | 'reviews';

// ─── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onApprove,
  onReject,
  processing,
}: {
  app: InterviewerApplication & { applicant?: Profile };
  onApprove: (app: InterviewerApplication) => void;
  onReject: (app: InterviewerApplication) => void;
  processing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50 border-amber-200',
    approved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    rejected: 'text-rose-700 bg-rose-50 border-rose-200',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar url={app.applicant?.avatar_url ?? null} name={app.full_name} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900">{app.full_name}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusColors[app.status]}`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-0.5">{app.designation} @ {app.company}</div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
              <span>{app.years_experience}+ yrs exp</span>
              <span>·</span>
              <span>{app.email}</span>
              {app.linkedin_url && (
                <>
                  <span>·</span>
                  <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5">
                    LinkedIn <ExternalLink size={10} />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {app.status === 'pending' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onApprove(app)}
              disabled={processing === app.id}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={13} />
              {processing === app.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => onReject(app)}
              disabled={processing === app.id}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-50"
            >
              <XCircle size={13} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Skills */}
      {app.skills && app.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {app.skills.slice(0, 6).map(skill => (
            <span key={skill} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {topicLabel(skill) !== skill ? topicLabel(skill) : skill}
            </span>
          ))}
        </div>
      )}

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-brand-600 hover:text-brand-700 mt-3 flex items-center gap-1"
      >
        {expanded ? '▲ Hide details' : '▼ View full application'}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 pt-3 border-t border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">PROFESSIONAL INTRODUCTION</div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">{app.introduction}</p>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">INTERVIEWING EXPERIENCE</div>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">{app.interviewing_experience}</p>
          </div>
          {app.resume_url && (
            <a
              href={app.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-100"
            >
              <FileText size={12} /> View Resume/Portfolio
            </a>
          )}
          <div className="text-xs text-slate-400">Applied: {new Date(app.created_at).toLocaleString('en-IN')}</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ──────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('applications');
  const [applications, setApplications] = useState<(InterviewerApplication & { applicant?: Profile })[]>([]);
  const [appFilter, setAppFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [users, setUsers] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<(Booking & { mentor?: Profile; student?: Profile })[]>([]);
  const [scorecards, setScorecards] = useState<InterviewScorecard[]>([]);
  const [reviews, setReviews] = useState<(Review & { student?: Profile; mentor?: Profile })[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMentors: 0,
    totalBookings: 0,
    pendingApplications: 0,
  });

  useEffect(() => {
    if (!authLoading && (!profile || !profile.is_admin)) {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    fetchAll();
  }, [profile]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: apps },
      { data: allUsers },
      { data: allBookings },
      { data: allScorecards },
      { data: allReviews },
      { count: pendingCount },
    ] = await Promise.all([
      supabase
        .from('interviewer_applications')
        .select('*, applicant:user_id(*)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('*, mentor:mentor_id(*), student:student_id(*), slot:slot_id(*)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('interview_scorecards')
        .select('*, interviewer:interviewer_id(*), candidate:candidate_id(*)')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('reviews')
        .select('*, student:student_id(*), mentor:mentor_id(*)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('interviewer_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    setApplications((apps as unknown as (InterviewerApplication & { applicant?: Profile })[]) ?? []);
    setUsers((allUsers as Profile[]) ?? []);
    setBookings((allBookings as unknown as (Booking & { mentor?: Profile; student?: Profile })[]) ?? []);
    setScorecards((allScorecards as unknown as InterviewScorecard[]) ?? []);
    setReviews((allReviews as unknown as (Review & { student?: Profile; mentor?: Profile })[]) ?? []);

    const profilesData = (allUsers as Profile[]) ?? [];
    setStats({
      totalUsers: profilesData.length,
      totalMentors: profilesData.filter(p => p.role === 'mentor').length,
      totalBookings: ((allBookings as unknown[]) ?? []).length,
      pendingApplications: pendingCount ?? 0,
    });

    setLoading(false);
  };

  const handleApprove = async (app: InterviewerApplication) => {
    setProcessing(app.id);
    // 1. Update application status
    await supabase.from('interviewer_applications').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);
    // 2. Set profile role to mentor and is_verified = true
    await supabase.from('profiles').update({
      role: 'mentor',
      is_verified: true,
    }).eq('id', app.user_id);
    setProcessing(null);
    fetchAll();
  };

  const handleReject = async (app: InterviewerApplication) => {
    setProcessing(app.id);
    await supabase.from('interviewer_applications').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);
    setProcessing(null);
    fetchAll();
  };

  const handleSuspend = async (userId: string, isSuspended: boolean) => {
    await supabase.from('profiles').update({ is_suspended: !isSuspended }).eq('id', userId);
    fetchAll();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    await supabase.from('reviews').delete().eq('id', reviewId);
    fetchAll();
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!profile?.is_admin) return null;

  const filteredApps = applications.filter(a =>
    appFilter === 'all' ? true : a.status === appFilter
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'applications', label: 'Applications', icon: <FileText size={16} />, badge: stats.pendingApplications || undefined },
    { id: 'users', label: 'Users', icon: <Users size={16} /> },
    { id: 'bookings', label: 'Bookings', icon: <Calendar size={16} /> },
    { id: 'scorecards', label: 'Scorecards', icon: <Star size={16} /> },
    { id: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={22} className="text-brand-600" />
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-slate-500">Manage the Roundora platform</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary text-sm !py-2 !px-4 flex items-center gap-1.5">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: <Users size={18} className="text-brand-600" /> },
          { label: 'Verified Mentors', value: stats.totalMentors, icon: <ShieldCheck size={18} className="text-emerald-600" /> },
          { label: 'Total Bookings', value: stats.totalBookings, icon: <Calendar size={18} className="text-indigo-600" /> },
          { label: 'Pending Applications', value: stats.pendingApplications, icon: <Clock size={18} className="text-amber-600" />, highlight: stats.pendingApplications > 0 },
        ].map(stat => (
          <div key={stat.label} className={`card p-4 ${stat.highlight ? 'border-amber-300 bg-amber-50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              {stat.icon}
              <span className="text-2xl font-extrabold text-slate-900">{stat.value}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all relative ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Applications */}
      {activeTab === 'applications' && (
        <div>
          <div className="flex gap-2 mb-5">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setAppFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all capitalize ${
                  appFilter === f
                    ? 'bg-brand-50 border-brand-500 text-brand-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {f} {f !== 'all' && `(${applications.filter(a => a.status === f).length})`}
              </button>
            ))}
          </div>
          {filteredApps.length === 0 ? (
            <div className="card p-10 text-center text-slate-500">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="font-medium">No {appFilter !== 'all' ? appFilter : ''} applications</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  processing={processing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card p-4 flex items-center gap-3 flex-wrap">
              <Avatar url={u.avatar_url} name={u.full_name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{u.full_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    u.role === 'mentor'
                      ? 'text-brand-700 bg-brand-50 border-brand-200'
                      : 'text-slate-600 bg-slate-100 border-slate-200'
                  }`}>
                    {u.role}
                  </span>
                  {u.is_verified && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      ✓ Verified
                    </span>
                  )}
                  {u.is_suspended && (
                    <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                      Suspended
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{u.email} · Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/mentors/${u.id}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  View <ExternalLink size={10} />
                </Link>
                <button
                  onClick={() => handleSuspend(u.id, u.is_suspended ?? false)}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                    u.is_suspended
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      : 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <Ban size={11} /> {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 && (
            <div className="card p-10 text-center text-slate-400">No bookings yet.</div>
          )}
          {bookings.map(b => {
            const statusColors: Record<string, string> = {
              confirmed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              completed: 'text-brand-700 bg-brand-50 border-brand-200',
              cancelled: 'text-rose-600 bg-rose-50 border-rose-200',
              pending: 'text-amber-700 bg-amber-50 border-amber-200',
              no_show: 'text-slate-600 bg-slate-50 border-slate-200',
              refunded: 'text-purple-700 bg-purple-50 border-purple-200',
            };
            return (
              <div key={b.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 mb-0.5">
                      {b.student?.full_name ?? 'Student'} → {b.mentor?.full_name ?? 'Interviewer'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                      <Calendar size={11} />
                      {b.slot ? new Date((b.slot as unknown as { start_time: string }).start_time).toLocaleString('en-IN') : '—'}
                      {b.amount_paid && (
                        <span className="flex items-center gap-0.5"><IndianRupee size={10} />{b.amount_paid}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${statusColors[b.status] ?? 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                      {b.status}
                    </span>
                    <Link to={`/room/${b.id}`} className="text-xs text-brand-600 hover:underline flex items-center gap-0.5">
                      Room <ExternalLink size={10} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Scorecards */}
      {activeTab === 'scorecards' && (
        <div className="space-y-3">
          {scorecards.length === 0 && (
            <div className="card p-10 text-center text-slate-400">No scorecards submitted yet.</div>
          )}
          {scorecards.map(sc => (
            <div key={sc.id} className="card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-0.5">
                    {sc.candidate?.full_name ?? 'Candidate'} — interviewed by {sc.interviewer?.full_name ?? 'Interviewer'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Overall: <strong className="text-slate-700">{sc.overall_score ?? '—'}/10</strong>
                    · Recommendation: <strong className="text-slate-700 capitalize">{sc.recommendation?.replace('_', ' ') ?? '—'}</strong>
                  </div>
                </div>
                <Link to={`/scorecard/${sc.booking_id}`} className="btn-secondary !py-1.5 !px-3 text-xs">
                  View <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length === 0 && (
            <div className="card p-10 text-center text-slate-400">No reviews yet.</div>
          )}
          {reviews.map(r => (
            <div key={r.id} className="card p-4 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-slate-900 mb-0.5">
                  {r.student?.full_name ?? 'Student'} → {r.mentor?.full_name ?? 'Interviewer'}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  <span className="text-xs text-slate-400">({r.rating}/5)</span>
                </div>
                {r.comment && <p className="text-xs text-slate-500">"{r.comment}"</p>}
              </div>
              <button
                onClick={() => handleDeleteReview(r.id)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all"
              >
                <XCircle size={12} /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
