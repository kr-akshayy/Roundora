import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Linkedin, FileText, ChevronRight, ChevronLeft,
  CheckCircle2, AlertCircle, User, Star, BookOpen, Send,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import { TOPICS } from '../lib/topics';

const SKILL_SUGGESTIONS = [
  'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Spring Boot',
  'Django', 'FastAPI', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka',
  'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'System Design',
  'Data Structures', 'Algorithms', 'Machine Learning', 'Deep Learning',
];

type Step = 1 | 2 | 3 | 4;

export default function InterviewerApplication() {
  const navigate = useNavigate();
  const { session, profile } = useAuthStore();
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Personal Info
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Step 2 — Professional Info
  const [company, setCompany] = useState('');
  const [designation, setDesignation] = useState('');
  const [yearsExp, setYearsExp] = useState('');

  // Step 3 — Expertise
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [resumeUrl, setResumeUrl] = useState('');

  // Step 4 — Introduction
  const [introduction, setIntroduction] = useState('');
  const [interviewingExperience, setInterviewingExperience] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold mb-2">Login required</h1>
        <p className="text-slate-500 mb-6">Please log in to apply as an interviewer.</p>
        <Link to="/login" className="btn-primary">Log in</Link>
      </div>
    );
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setError(null);
    setSubmitting(true);

    const allSkills = [...new Set([...selectedSkills, ...selectedTopics])];

    const { error: insertError } = await supabase.from('interviewer_applications').insert({
      user_id: session.user.id,
      full_name: fullName.trim(),
      email: email.trim(),
      linkedin_url: linkedinUrl.trim() || null,
      company: company.trim(),
      designation: designation.trim(),
      years_experience: Number(yearsExp),
      skills: allSkills,
      resume_url: resumeUrl.trim() || null,
      introduction: introduction.trim(),
      interviewing_experience: interviewingExperience.trim(),
      status: 'pending',
    });

    setSubmitting(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError('You have already submitted an application. Our team will review it soon.');
      } else {
        setError(insertError.message);
      }
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Application Submitted! 🎉</h1>
          <p className="text-slate-500 text-base leading-relaxed mb-2">
            Thank you for applying to become a <strong>Roundora Verified Interviewer</strong>.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Our team will review your application within <strong>24–48 hours</strong>. You'll receive an email once it's approved.
          </p>
          <div className="card p-5 text-left mb-6 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">What happens next?</div>
            {[
              { n: '01', text: 'Our team reviews your experience and LinkedIn profile' },
              { n: '02', text: 'You receive an approval email with onboarding instructions' },
              { n: '03', text: 'Set your availability and start earning from mock interviews' },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-3">
                <span className="text-xs font-mono text-brand-600 font-bold mt-0.5">{item.n}</span>
                <span className="text-sm text-slate-600">{item.text}</span>
              </div>
            ))}
          </div>
          <Link to="/dashboard" className="btn-primary w-full justify-center">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: 'Personal Info', icon: <User size={16} /> },
    { n: 2, label: 'Professional', icon: <Briefcase size={16} /> },
    { n: 3, label: 'Expertise', icon: <Star size={16} /> },
    { n: 4, label: 'Introduction', icon: <BookOpen size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Star size={12} fill="currentColor" /> Become a Roundora Verified Interviewer
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            Share your expertise. Earn by interviewing.
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Help job seekers prepare for their dream roles. Verified interviewers earn ₹300–₹800+ per session.
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute inset-x-0 top-4 h-0.5 bg-slate-200 -z-10" />
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => step > s.n && setStep(s.n as Step)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step === s.n
                    ? 'bg-brand-600 border-brand-600 text-white shadow-glow'
                    : step > s.n
                    ? 'bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:scale-105'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {step > s.n ? <CheckCircle2 size={14} /> : s.n}
              </button>
              <span className={`text-[10px] font-semibold hidden sm:block ${step === s.n ? 'text-brand-700' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="card p-6 sm:p-8 shadow-card-hover">
          {error && (
            <div className="alert-error mb-5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Personal Information</h2>
              <p className="text-sm text-slate-500 mb-5">We use this to create your public interviewer profile.</p>

              <div>
                <label className="label-text">Full Name *</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Rahul Sharma"
                />
              </div>
              <div>
                <label className="label-text">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="rahul@example.com"
                />
              </div>
              <div>
                <label className="label-text">
                  <Linkedin size={13} className="inline mr-1" />
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://linkedin.com/in/rahul-sharma"
                />
                <p className="text-xs text-slate-400 mt-1">Helps us verify your experience — strongly recommended</p>
              </div>

              <button
                type="button"
                disabled={!fullName.trim() || !email.trim()}
                onClick={() => setStep(2)}
                className="btn-primary w-full mt-2"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2 — Professional Info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Professional Background</h2>
              <p className="text-sm text-slate-500 mb-5">Tell us about your current or most recent role.</p>

              <div>
                <label className="label-text">Current / Previous Company *</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Amazon, Wipro, Razorpay, Startup XYZ"
                />
              </div>
              <div>
                <label className="label-text">Job Title / Designation *</label>
                <input
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Senior Software Engineer, Tech Lead"
                />
              </div>
              <div>
                <label className="label-text">Years of Experience *</label>
                <select
                  required
                  value={yearsExp}
                  onChange={(e) => setYearsExp(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select experience</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12,15,20].map(y => (
                    <option key={y} value={y}>{y}+ years</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  disabled={!company.trim() || !designation.trim() || !yearsExp}
                  onClick={() => setStep(3)}
                  className="btn-primary flex-1"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Expertise */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Your Expertise</h2>
              <p className="text-sm text-slate-500 mb-4">Select the interview types you can conduct. This determines which students can book you.</p>

              <div>
                <label className="label-text">Interview Types You Can Conduct *</label>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTopic(t.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        selectedTopics.includes(t.id)
                          ? 'bg-brand-50 border-brand-500 text-brand-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-text">Technical Skills / Technologies</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SKILL_SUGGESTIONS.filter(s => !selectedSkills.includes(s)).slice(0, 16).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-all bg-white"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-brand-50 rounded-xl border border-brand-100">
                    {selectedSkills.map(skill => (
                      <span
                        key={skill}
                        className="text-xs px-2.5 py-1 rounded-full bg-brand-100 text-brand-700 border border-brand-200 flex items-center gap-1 cursor-pointer hover:bg-rose-100 hover:text-rose-600 hover:border-rose-200 transition-all"
                        onClick={() => toggleSkill(skill)}
                        title="Click to remove"
                      >
                        {skill} ×
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                    placeholder="Add custom skill..."
                    className="input-field flex-1 text-sm"
                  />
                  <button type="button" onClick={addCustomSkill} className="btn-secondary text-sm !px-4">
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="label-text">
                  <FileText size={13} className="inline mr-1" />
                  Resume / Portfolio Link (Optional)
                </label>
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://drive.google.com/your-resume.pdf"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="button"
                  disabled={selectedTopics.length === 0}
                  onClick={() => setStep(4)}
                  className="btn-primary flex-1"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Introduction */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Your Story</h2>
              <p className="text-sm text-slate-500 mb-4">Help candidates understand who they'll be interviewing with.</p>

              <div>
                <label className="label-text">Professional Introduction *</label>
                <textarea
                  required
                  rows={4}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  className="input-field resize-none"
                  placeholder="Tell candidates about your background, what you've built, and why you enjoy interviewing..."
                  minLength={80}
                />
                <p className="text-xs text-slate-400 mt-1">{introduction.length}/80 characters minimum</p>
              </div>

              <div>
                <label className="label-text">Interviewing Experience *</label>
                <textarea
                  required
                  rows={3}
                  value={interviewingExperience}
                  onChange={(e) => setInterviewingExperience(e.target.value)}
                  className="input-field resize-none"
                  placeholder="e.g. Conducted 50+ interviews at Amazon, mentored 20+ candidates who got placed at FAANG companies..."
                  minLength={40}
                />
                <p className="text-xs text-slate-400 mt-1">{interviewingExperience.length}/40 characters minimum</p>
              </div>

              {/* Summary Review */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-sm">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Review your application</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-medium text-slate-800">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="font-medium text-slate-800">{company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role</span>
                  <span className="font-medium text-slate-800">{designation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Experience</span>
                  <span className="font-medium text-slate-800">{yearsExp}+ years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Interview types</span>
                  <span className="font-medium text-slate-800">{selectedTopics.length} selected</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="btn-secondary flex-1">
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || introduction.length < 80 || interviewingExperience.length < 40}
                  className="btn-primary flex-1"
                >
                  <Send size={15} />
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>

              <p className="text-xs text-slate-400 text-center">
                By submitting, you agree to Roundora's interviewer code of conduct. Applications are reviewed within 24–48 hours.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
