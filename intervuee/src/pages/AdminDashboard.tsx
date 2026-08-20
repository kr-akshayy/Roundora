import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FileText,
  Calendar,
  Star,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  RefreshCw,
  IndianRupee,
  ExternalLink,
  Search,
  Database,
  Ticket,
  MessageSquare,
  Sparkles,
  Edit,
  Save,
  Check,
  Crown,
  Activity,
  Send,
  Trash2,
  Layers,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import Avatar from '../components/Avatar';
import { topicLabel } from '../lib/topics';
import type {
  InterviewerApplication,
  Profile,
  Booking,
  Review,
  InterviewScorecard,
  SupportTicket,
  InterviewMessage,
} from '../types';

type Tab =
  | 'overview'
  | 'users'
  | 'applications'
  | 'bookings'
  | 'tickets'
  | 'scorecards'
  | 'reviews'
  | 'database';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, session, loading: authLoading, refreshProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Data States
  const [users, setUsers] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<
    (InterviewerApplication & { applicant?: Profile })[]
  >([]);
  const [bookings, setBookings] = useState<
    (Booking & { mentor?: Profile; student?: Profile; slot?: any })[]
  >([]);
  const [tickets, setTickets] = useState<(SupportTicket & { user?: Profile; target_user?: Profile })[]>(
    []
  );
  const [scorecards, setScorecards] = useState<InterviewScorecard[]>([]);
  const [reviews, setReviews] = useState<(Review & { student?: Profile; mentor?: Profile })[]>([]);
  const [recentMessages, setRecentMessages] = useState<
    (InterviewMessage & { sender?: Profile })[]
  >([]);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'mentor' | 'admin'>('all');
  const [appFilter, setAppFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [bookingFilter, setBookingFilter] = useState<string>('all');

  // Edit User Modal / Inline Edit
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCompany, setEditCompany] = useState<string>('');
  const [editHeadline, setEditHeadline] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);

  // Ticket Reply State
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [ticketReplySending, setTicketReplySending] = useState(false);

  // Table Counts for Database Inspector
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  const fetchAllData = async () => {
    setRefreshing(true);
    const startPing = performance.now();

    try {
      const [
        { data: allUsers, count: uCount },
        { data: allApps, count: aCount },
        { data: allBookings, count: bCount },
        { data: allTickets, count: tCount },
        { data: allScorecards, count: scCount },
        { data: allReviews, count: rCount },
        { data: allMessages, count: mCount },
        { count: slotCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
        supabase.from('interviewer_applications').select('*, applicant:user_id(*)', { count: 'exact' }).order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, mentor:mentor_id(*), student:student_id(*), slot:slot_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
        supabase.from('support_tickets').select('*, user:user_id(*), target_user:target_user_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('interview_scorecards').select('*, interviewer:interviewer_id(*), candidate:candidate_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('reviews').select('*, student:student_id(*), mentor:mentor_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('interview_messages').select('*, sender:sender_id(*)', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
        supabase.from('slots').select('*', { count: 'exact', head: true }),
      ]);

      const endPing = performance.now();
      setPingLatency(Math.round(endPing - startPing));

      setUsers((allUsers as Profile[]) || []);
      setApplications((allApps as any) || []);
      setBookings((allBookings as any) || []);
      setTickets((allTickets as any) || []);
      setScorecards((allScorecards as any) || []);
      setReviews((allReviews as any) || []);
      setRecentMessages((allMessages as any) || []);

      setDbCounts({
        profiles: uCount || allUsers?.length || 0,
        interviewer_applications: aCount || allApps?.length || 0,
        bookings: bCount || allBookings?.length || 0,
        support_tickets: tCount || allTickets?.length || 0,
        interview_scorecards: scCount || allScorecards?.length || 0,
        reviews: rCount || allReviews?.length || 0,
        interview_messages: mCount || allMessages?.length || 0,
        slots: slotCount || 0,
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 1. User Management Handlers
  const handleToggleAdmin = async (u: Profile) => {
    const nextAdminState = !u.is_admin;
    if (!confirm(`Are you sure you want to ${nextAdminState ? 'GRANT' : 'REVOKE'} Admin rights for ${u.full_name}?`)) return;

    await supabase.from('profiles').update({ is_admin: nextAdminState }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_admin: nextAdminState } : p)));
  };

  const handleToggleVerify = async (u: Profile) => {
    const nextVerifyState = !u.is_verified;
    await supabase.from('profiles').update({ is_verified: nextVerifyState }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_verified: nextVerifyState } : p)));
  };

  const handleToggleRole = async (u: Profile) => {
    const nextRole = u.role === 'mentor' ? 'student' : 'mentor';
    await supabase.from('profiles').update({ role: nextRole }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, role: nextRole } : p)));
  };

  const handleToggleSuspend = async (u: Profile) => {
    const nextSuspend = !u.is_suspended;
    await supabase.from('profiles').update({ is_suspended: nextSuspend }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_suspended: nextSuspend } : p)));
  };

  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    setEditSaving(true);
    await supabase.from('profiles').update({
      price_per_session: editPrice,
      company: editCompany.trim() || null,
      headline: editHeadline.trim() || null,
    }).eq('id', editingUser.id);

    setUsers((prev) =>
      prev.map((p) =>
        p.id === editingUser.id
          ? { ...p, price_per_session: editPrice, company: editCompany.trim() || null, headline: editHeadline.trim() || null }
          : p
      )
    );
    setEditingUser(null);
    setEditSaving(false);
  };

  // 2. Application Handlers
  const handleApproveApp = async (app: InterviewerApplication) => {
    setProcessing(app.id);
    await supabase.from('interviewer_applications').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);

    await supabase.from('profiles').update({
      role: 'mentor',
      is_verified: true,
    }).eq('id', app.user_id);

    await supabase.from('notifications').insert({
      user_id: app.user_id,
      title: '🎉 Interviewer Application Approved!',
      message: 'Congratulations! Your profile is now verified as an official Interviewer on Roundora.',
      type: 'general',
      link: '/dashboard',
    });

    setProcessing(null);
    fetchAllData();
  };

  const handleRejectApp = async (app: InterviewerApplication) => {
    setProcessing(app.id);
    await supabase.from('interviewer_applications').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    }).eq('id', app.id);
    setProcessing(null);
    fetchAllData();
  };

  // 3. Booking Handlers
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: string) => {
    await supabase.from('bookings').update({ status: nextStatus }).eq('id', bookingId);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: nextStatus as any } : b)));
  };

  // 4. Ticket Handlers
  const handleUpdateTicketStatus = async (ticketId: string, nextStatus: string) => {
    await supabase.from('support_tickets').update({ status: nextStatus }).eq('id', ticketId);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus as any } : t)));
  };

  const handleSendTicketReply = async (ticket: SupportTicket) => {
    if (!ticketReplyText.trim()) return;
    setTicketReplySending(true);

    await supabase.from('support_tickets').update({
      admin_reply: ticketReplyText.trim(),
      status: 'resolved',
    }).eq('id', ticket.id);

    // Send notification to user
    await supabase.from('notifications').insert({
      user_id: ticket.user_id,
      title: `💬 Admin Response on Ticket #${ticket.id.slice(0, 8)}`,
      message: ticketReplyText.trim(),
      type: 'ticket',
      link: ticket.booking_id ? `/room/${ticket.booking_id}` : '/dashboard',
    });

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticket.id ? { ...t, admin_reply: ticketReplyText.trim(), status: 'resolved' } : t
      )
    );

    setReplyingTicketId(null);
    setTicketReplyText('');
    setTicketReplySending(false);
  };

  // Calculations & Analytics
  const totalRevenue = bookings.reduce((sum, b) => (b.status === 'confirmed' || b.status === 'completed' ? sum + (b.amount_paid || 0) : sum), 0);
  const pendingAppsCount = applications.filter((a) => a.status === 'pending').length;
  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;
  const verifiedMentorsCount = users.filter((u) => u.role === 'mentor' && u.is_verified).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.company || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole =
      userRoleFilter === 'all'
        ? true
        : userRoleFilter === 'admin'
        ? u.is_admin
        : u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredApps = applications.filter((a) =>
    appFilter === 'all' ? true : a.status === appFilter
  );

  const filteredTickets = tickets.filter((t) =>
    ticketFilter === 'all' ? true : t.status === ticketFilter
  );

  const filteredBookings = bookings.filter((b) =>
    bookingFilter === 'all' ? true : b.status === bookingFilter
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'users', label: 'Users & Roles', icon: <Users size={16} />, badge: users.length },
    { id: 'applications', label: 'Interviewer Applications', icon: <FileText size={16} />, badge: pendingAppsCount || undefined },
    { id: 'bookings', label: 'Bookings & Revenue', icon: <Calendar size={16} />, badge: bookings.length },
    { id: 'tickets', label: 'Support Tickets', icon: <Ticket size={16} />, badge: openTicketsCount || undefined },
    { id: 'scorecards', label: 'Scorecards', icon: <Sparkles size={16} /> },
    { id: 'reviews', label: 'Reviews', icon: <Star size={16} /> },
    { id: 'database', label: 'Supabase Database', icon: <Database size={16} /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Top Header Bar */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-2xl rounded-3xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300 shadow-inner">
            <Crown size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Roundora Master Admin</h1>
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                Live Production
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Full administrative command center • {users.length} registered users • {bookings.length} interview sessions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {pingLatency !== null && (
            <div className="text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Ping: {pingLatency}ms
            </div>
          )}
          <button
            onClick={fetchAllData}
            disabled={refreshing}
            className="btn-secondary !bg-white/10 !text-white !border-white/20 hover:!bg-white/20 !py-2 !px-4 text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh All'}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all relative ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                  tab.id === 'tickets' || tab.id === 'applications'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Revenue</span>
                <IndianRupee size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                From {bookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length} paid sessions
              </div>
            </div>

            <div className="card p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Users</span>
                <Users size={18} className="text-brand-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{users.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {verifiedMentorsCount} Mentors • {users.filter((u) => u.role === 'student').length} Students
              </div>
            </div>

            <div className="card p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Pending Applications</span>
                <Clock size={18} className="text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{pendingAppsCount}</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                {pendingAppsCount > 0 ? 'Requires your approval' : 'All applications reviewed'}
              </div>
            </div>

            <div className="card p-5 bg-white border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Open Support Tickets</span>
                <Ticket size={18} className="text-rose-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{openTicketsCount}</div>
              <div className="text-[11px] text-rose-600 font-semibold mt-1">
                {openTicketsCount > 0 ? 'Urgent user inquiries' : 'Zero open issues'}
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="card p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-brand-600" />
                Quick Admin Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-left transition-all group"
                >
                  <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600">
                    👑 Manage User Roles
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Promote admins & verify mentors
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('applications')}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-left transition-all group"
                >
                  <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600">
                    📝 Review Applications ({pendingAppsCount})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Approve interviewer candidates
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('tickets')}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-left transition-all group"
                >
                  <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600">
                    🎟️ Support Tickets ({openTicketsCount})
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Resolve student & safety issues
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('database')}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-left transition-all group"
                >
                  <div className="font-bold text-xs text-slate-900 group-hover:text-brand-600">
                    ⚡ Supabase Diagnostics
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Inspect tables & run queries
                  </div>
                </button>
              </div>
            </div>

            {/* Recent Bookings Feed */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  Recent Sessions
                </h3>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  View all ({bookings.length}) →
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {bookings.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">
                        {b.student?.full_name || 'Student'} → {b.mentor?.full_name || 'Interviewer'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.slot ? new Date((b.slot as any).start_time).toLocaleString('en-IN') : '—'}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        b.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'completed'
                          ? 'bg-brand-100 text-brand-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: USERS & ROLES MASTER CONTROL ─── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="card p-4 flex items-center justify-between gap-3 flex-wrap bg-white">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'student', 'mentor', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                    userRoleFilter === r
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* User List */}
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className={`card p-4 flex items-center justify-between gap-4 flex-wrap transition-all ${
                  u.is_admin ? 'border-amber-200 bg-amber-50/20' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-[260px]">
                  <Avatar url={u.avatar_url} name={u.full_name} size={44} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{u.full_name}</span>
                      {u.is_admin && (
                        <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                          <Crown size={10} /> ADMIN
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          u.role === 'mentor'
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.is_verified && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          ✓ Verified
                        </span>
                      )}
                      {u.is_suspended && (
                        <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{u.email}</span>
                      {u.company && <span>• {u.company}</span>}
                      {u.price_per_session !== null && u.price_per_session !== undefined && (
                        <span>• ₹{u.price_per_session}/session</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Master Action Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Edit User Button */}
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setEditPrice(u.price_per_session || 0);
                      setEditCompany(u.company || '');
                      setEditHeadline(u.headline || '');
                    }}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Edit profile data"
                  >
                    <Edit size={14} />
                  </button>

                  {/* Toggle Role Button */}
                  <button
                    onClick={() => handleToggleRole(u)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
                    title="Switch between Student and Mentor"
                  >
                    Set {u.role === 'mentor' ? 'Student' : 'Mentor'}
                  </button>

                  {/* Toggle Verification */}
                  <button
                    onClick={() => handleToggleVerify(u)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border font-semibold transition-colors ${
                      u.is_verified
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Toggle Verified badge"
                  >
                    {u.is_verified ? '✓ Verified' : 'Unverified'}
                  </button>

                  {/* Toggle Admin Privilege */}
                  <button
                    onClick={() => handleToggleAdmin(u)}
                    className={`text-xs px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all ${
                      u.is_admin
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                    title="Grant/Revoke Admin Rights"
                  >
                    <Crown size={12} /> {u.is_admin ? 'Admin' : 'Make Admin'}
                  </button>

                  {/* Suspend User Button */}
                  <button
                    onClick={() => handleToggleSuspend(u)}
                    className={`p-2 rounded-xl border transition-colors ${
                      u.is_suspended
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title={u.is_suspended ? 'Unsuspend user' : 'Suspend user account'}
                  >
                    <Ban size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: APPLICATIONS ─── */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAppFilter(f)}
                className={`text-xs px-3.5 py-1.5 rounded-xl border font-bold capitalize transition-all ${
                  appFilter === f
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f} ({applications.filter((a) => (f === 'all' ? true : a.status === f)).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredApps.map((app) => (
              <div key={app.id} className="card p-5 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <Avatar url={app.applicant?.avatar_url} name={app.full_name} size={44} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{app.full_name}</span>
                        <span className="text-xs text-slate-500">
                          {app.designation} @ {app.company}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{app.years_experience}+ yrs exp</span>
                        <span>•</span>
                        <span>{app.email}</span>
                        {app.linkedin_url && (
                          <a
                            href={app.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:underline flex items-center gap-0.5"
                          >
                            LinkedIn <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveApp(app)}
                        disabled={processing === app.id}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 size={14} /> Approve as Mentor
                      </button>
                      <button
                        onClick={() => handleRejectApp(app)}
                        disabled={processing === app.id}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-700 space-y-2">
                  <div>
                    <strong className="text-slate-900">Bio / Introduction:</strong> {app.introduction}
                  </div>
                  <div>
                    <strong className="text-slate-900">Interviewing Experience:</strong>{' '}
                    {app.interviewing_experience}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: BOOKINGS & REVENUE ─── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'confirmed', 'completed', 'cancelled', 'refunded'].map((s) => (
              <button
                key={s}
                onClick={() => setBookingFilter(s)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  bookingFilter === s
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s} ({bookings.filter((b) => (s === 'all' ? true : b.status === s)).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredBookings.map((b) => (
              <div key={b.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap bg-white">
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    Student: <span className="text-brand-600">{b.student?.full_name || 'Student'}</span> → Interviewer:{' '}
                    <span className="text-brand-600">{b.mentor?.full_name || 'Mentor'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      📅 {b.slot ? new Date((b.slot as any).start_time).toLocaleString('en-IN') : '—'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-700">₹{b.amount_paid || 0} Paid</span>
                    <span>•</span>
                    <span>Room: {b.meeting_room}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={b.status}
                    onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:outline-none"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>

                  <Link
                    to={`/room/${b.id}`}
                    target="_blank"
                    className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                  >
                    <span>Room</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: SUPPORT TICKETS ─── */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTicketFilter(s)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  ticketFilter === s
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s} ({tickets.filter((t) => (s === 'all' ? true : t.status === s)).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="card p-10 text-center text-slate-400 text-sm">
                No tickets matching current filter.
              </div>
            ) : (
              filteredTickets.map((t) => (
                <div key={t.id} className="card p-5 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{t.subject}</span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            t.category === 'misbehaviour'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {t.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Raised by: <strong>{t.user?.full_name || 'User'}</strong> ({t.user?.email}) •{' '}
                        {new Date(t.created_at).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                        className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        onClick={() => setReplyingTicketId(replyingTicketId === t.id ? null : t.id)}
                        className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
                      >
                        <Send size={11} /> Reply
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 p-3 bg-slate-50 rounded-xl leading-relaxed">
                    {t.message}
                  </p>

                  {t.admin_reply && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      <strong>Admin Resolution Reply:</strong> {t.admin_reply}
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {replyingTicketId === t.id && (
                    <div className="p-3 border border-brand-200 bg-brand-50/50 rounded-2xl space-y-2 animate-fadeIn">
                      <textarea
                        value={ticketReplyText}
                        onChange={(e) => setTicketReplyText(e.target.value)}
                        placeholder="Type official admin resolution message to send to user..."
                        rows={3}
                        className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingTicketId(null)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendTicketReply(t)}
                          disabled={ticketReplySending || !ticketReplyText.trim()}
                          className="btn-primary !py-1.5 !px-4 text-xs flex items-center gap-1"
                        >
                          {ticketReplySending ? 'Sending...' : 'Send Resolution & Notify'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 6: SCORECARDS ─── */}
      {activeTab === 'scorecards' && (
        <div className="space-y-3">
          {scorecards.map((sc) => (
            <div key={sc.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap bg-white">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Candidate: {sc.candidate?.full_name || 'Candidate'} — Evaluated by:{' '}
                  {sc.interviewer?.full_name || 'Interviewer'}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>
                    Overall Score: <strong>{sc.overall_score || '—'}/10</strong>
                  </span>
                  <span>•</span>
                  <span className="capitalize font-semibold text-brand-600">
                    Recommendation: {sc.recommendation?.replace('_', ' ') || '—'}
                  </span>
                </div>
              </div>
              <Link
                to={`/scorecard/${sc.booking_id}`}
                target="_blank"
                className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
              >
                <span>View Full Scorecard</span>
                <ChevronRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 7: REVIEWS ─── */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4 flex items-start justify-between gap-3 flex-wrap bg-white">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {r.student?.full_name || 'Student'} reviewed {r.mentor?.full_name || 'Interviewer'}
                </div>
                <div className="flex items-center gap-1.5 my-1 text-amber-500 text-xs">
                  {'★'.repeat(r.rating)}
                  {'☆'.repeat(5 - r.rating)}
                  <span className="text-slate-400 font-mono">({r.rating}/5)</span>
                </div>
                {r.comment && <p className="text-xs text-slate-600">"{r.comment}"</p>}
              </div>

              <button
                onClick={async () => {
                  if (confirm('Delete this review?')) {
                    await supabase.from('reviews').delete().eq('id', r.id);
                    setReviews((prev) => prev.filter((rev) => rev.id !== r.id));
                  }
                }}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 8: SUPABASE DATABASE DIAGNOSTICS ─── */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Real-time Table Row Counters */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database size={16} className="text-brand-600" />
              Live Database Row Counts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(dbCounts).map(([table, count]) => (
                <div key={table} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-mono text-slate-500 truncate">{table}</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick SQL Helpers */}
          <div className="card p-6 bg-white space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers size={16} className="text-brand-600" />
              Admin SQL Helpers (Run in Supabase SQL Editor)
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 text-xs font-mono">
                <div className="text-slate-400 mb-1">// Make Any User Admin:</div>
                <code>UPDATE profiles SET is_admin = true WHERE email = '{profile?.email}';</code>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 text-xs font-mono">
                <div className="text-slate-400 mb-1">// Enable Realtime Replication:</div>
                <code>ALTER PUBLICATION supabase_realtime ADD TABLE interview_messages, support_tickets, notifications, call_sessions;</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="card max-w-md w-full p-6 bg-white rounded-3xl shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Edit {editingUser.full_name}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="e.g. Google, Microsoft, Amazon"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Headline / Title</label>
                <input
                  type="text"
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Price per Session (₹)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                disabled={editSaving}
                className="btn-primary !px-5 !py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Save size={13} /> {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
