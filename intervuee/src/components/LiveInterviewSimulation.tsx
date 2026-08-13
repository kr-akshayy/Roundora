import { useEffect, useState, useRef } from 'react';
import { Video, Mic, Code2, Cpu, CheckCircle2, Sparkles, Activity, Timer, ShieldCheck, Play, Award, Briefcase, PartyPopper, Check, ChevronRight } from 'lucide-react';

const STORY_STEPS = [
  {
    stepNumber: '01',
    badge: 'Step 1: Practice Online at Home',
    title: '🏠 1-on-1 Practice From Home',
    desc: 'Student books a slot and practices live mock interview with ex-Amazon Staff Engineer.',
    type: 'video_call',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-a-laptop-42861-large.mp4',
    mentorVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-having-a-video-call-on-laptop-42930-large.mp4',
    roundTitle: 'Round 1: System Design & Coding',
    speech: 'Mentor: "Great logic! Let\'s optimize memory complexity now."',
  },
  {
    stepNumber: '02',
    badge: 'Step 2: Instant Feedback & Rating',
    title: '⚡ Detailed Scorecard Received',
    desc: 'Within 2 hours, candidate receives structured feedback on DSA, System Design & Soft Skills.',
    type: 'scorecard',
    score: 94,
    strengths: ['DSA Optimization: 9.5/10', 'System Architecture: 9/10', 'Communication: 9.8/10'],
    speech: 'AI Feedback: "Ready for Tier-1 Tech Interviews!"',
  },
  {
    stepNumber: '03',
    badge: 'Step 3: Real Company Interview',
    title: '🏢 Facing Google / Meta Interview',
    desc: 'Armed with practice & confidence, student solves real interview rounds effortlessly.',
    type: 'real_interview',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-having-a-video-call-on-laptop-42930-large.mp4',
    roundTitle: 'Final Technical Round',
    speech: 'Interviewer: "Impressive solution! You covered all edge cases."',
  },
  {
    stepNumber: '04',
    badge: 'Step 4: Offer Letter Secured!',
    title: '🎉 Dream Job Offer Cracked!',
    desc: 'Student receives official offer letter: ₹24 LPA Senior Software Engineer!',
    type: 'offer_letter',
    company: 'Top Tech Company',
    packageText: '₹24 LPA · Senior Software Engineer',
    speech: 'HR: "Congratulations! We are excited to extend an offer!"',
  },
];

export default function LiveInterviewSimulation() {
  const [stepIdx, setStepIdx] = useState(0);
  const [seconds, setSeconds] = useState(1934);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Video refs for programmatic mobile autoplay enforcement
  const videoRef1 = useRef<HTMLVideoElement | null>(null);
  const videoRef2 = useRef<HTMLVideoElement | null>(null);
  const videoRef3 = useRef<HTMLVideoElement | null>(null);

  // Enforce mobile video autoplay
  useEffect(() => {
    const playVideo = (vRef: React.RefObject<HTMLVideoElement>) => {
      if (vRef.current) {
        vRef.current.muted = true;
        vRef.current.play().catch(() => {
          // Retry on user interaction if browser policy blocks initial load
        });
      }
    };
    playVideo(videoRef1);
    playVideo(videoRef2);
    playVideo(videoRef3);
  }, [stepIdx]);

  // Timer increment
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Step Switcher every 6.5 seconds
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % STORY_STEPS.length);
    }, 6500);
    return () => clearInterval(stepInterval);
  }, []);

  // Typewriter code simulation
  useEffect(() => {
    const fullText = 'const system = new LoadBalancer({\n  strategy: "ConsistentHashing",\n  replicas: 5\n});';
    setTypedText('');
    setIsTyping(true);
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 50);
    return () => clearInterval(typingInterval);
  }, [stepIdx]);

  const currentStep = STORY_STEPS[stepIdx];

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative group">
      {/* Container */}
      <div className="card p-3.5 sm:p-5 shadow-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 rounded-2xl sm:rounded-3xl relative overflow-hidden transition-all duration-500 hover:shadow-brand-500/10">
        
        {/* Top Story Stepper Progress Bar */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="font-bold tracking-wide text-rose-400 uppercase text-[10px] sm:text-[11px] flex items-center gap-1">
                Student Success Journey
              </span>
            </div>

            <span className="flex items-center gap-1 text-slate-300 font-mono text-[11px] sm:text-xs font-semibold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              <Timer size={12} className="text-amber-400" /> {formatTimer(seconds)}
            </span>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-slate-950/80 p-1 sm:p-1.5 rounded-xl border border-white/10">
            {STORY_STEPS.map((s, idx) => {
              const active = idx === stepIdx;
              return (
                <button
                  key={s.stepNumber}
                  onClick={() => setStepIdx(idx)}
                  className={`py-1.5 px-1 sm:px-2 rounded-lg text-[9.5px] sm:text-[10.5px] font-bold transition-all text-center truncate ${
                    active
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {s.stepNumber}. {s.badge.split(':')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Animated Screen Container */}
        <div className="min-h-[290px] sm:min-h-[340px] rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col justify-between p-3 sm:p-4 mb-3 sm:mb-4 shadow-2xl group/screen">
          
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Header Overlay */}
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/15 shadow-md">
              <Sparkles size={12} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-[11px] sm:text-xs font-bold text-amber-200">
                {currentStep.badge}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-brand-950/90 backdrop-blur-md px-2 py-0.5 rounded-xl border border-brand-500/30 text-[10px] sm:text-[11px] text-brand-300 font-semibold shadow-md">
              <Activity size={11} className="animate-pulse text-emerald-400" /> Stage {stepIdx + 1} of 4
            </div>
          </div>

          {/* STEP CONTENT TYPES */}
          <div className="relative z-10 my-auto py-1.5">
            {/* STAGE 1: Home Practice Video Call */}
            {currentStep.type === 'video_call' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative bg-slate-900/90 border border-indigo-500/40 rounded-xl p-2.5 shadow-2xl min-h-[110px] sm:min-h-[135px] flex flex-col justify-between overflow-hidden">
                  <video
                    ref={videoRef1}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                    src={currentStep.mentorVideoUrl}
                  />
                  <div className="absolute inset-0 bg-slate-950/40" />
                  <div className="relative z-10 flex items-center justify-between text-[9.5px] text-white font-bold bg-indigo-600/90 px-2 py-0.5 rounded w-max">
                    <Play size={9} className="fill-white" /> EX-AMAZON MENTOR
                  </div>
                  <div className="relative z-10 mt-auto bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-[9.5px] sm:text-[10px] italic text-slate-200">
                    "{currentStep.speech}"
                  </div>
                </div>

                <div className="relative bg-slate-900/90 border border-emerald-500/40 rounded-xl p-2.5 shadow-2xl min-h-[110px] sm:min-h-[135px] flex flex-col justify-between overflow-hidden">
                  <video
                    ref={videoRef2}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none"
                    src={currentStep.videoUrl}
                  />
                  <div className="absolute inset-0 bg-slate-950/40" />
                  <div className="relative z-10 text-[9.5px] font-bold text-white bg-emerald-600/90 px-2 py-0.5 rounded w-max">
                    💻 STUDENT AT HOME
                  </div>
                  <div className="relative z-10 mt-auto bg-slate-950/90 backdrop-blur-md p-1.5 rounded-lg font-mono text-[8.5px] sm:text-[9px] text-emerald-300 border border-white/10">
                    {typedText}
                    {isTyping && <span className="animate-ping inline-block w-1.5 h-3 bg-brand-400 ml-0.5" />}
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 2: Scorecard & Feedback */}
            {currentStep.type === 'scorecard' && (
              <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-center max-w-md mx-auto animate-fadeIn">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award size={22} className="text-amber-400 animate-bounce" />
                  <span className="text-xl sm:text-2xl font-extrabold text-white">Score: {currentStep.score}/100</span>
                </div>
                <div className="space-y-1.5 mb-3">
                  {currentStep.strengths?.map((str) => (
                    <div key={str} className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-emerald-300 font-semibold bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-500/30">
                      <Check size={12} /> {str}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] sm:text-xs italic text-indigo-200 bg-indigo-950/80 p-2 rounded-lg border border-indigo-500/30">
                  "{currentStep.speech}"
                </div>
              </div>
            )}

            {/* STAGE 3: Real Company Interview */}
            {currentStep.type === 'real_interview' && (
              <div className="relative bg-slate-900/90 border border-purple-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl min-h-[130px] sm:min-h-[150px] flex flex-col justify-between overflow-hidden">
                <video
                  ref={videoRef3}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                  src={currentStep.videoUrl}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[10px] sm:text-xs font-bold text-white bg-purple-600 px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-md">
                    <Briefcase size={12} /> REAL TECH COMPANY INTERVIEW
                  </span>
                  <span className="text-[10px] sm:text-xs text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                    Confidence: 100%
                  </span>
                </div>
                <div className="relative z-10 mt-auto bg-slate-950/90 backdrop-blur-md p-2 rounded-xl border border-white/10 text-[11px] sm:text-xs italic text-purple-200">
                  "{currentStep.speech}"
                </div>
              </div>
            )}

            {/* STAGE 4: Offer Letter Secured */}
            {currentStep.type === 'offer_letter' && (
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl text-center max-w-md mx-auto animate-pulse">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-400/40">
                  <PartyPopper size={22} />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1">🎉 Job Offer Secured!</h3>
                <div className="inline-block bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-xl shadow-lg mb-2">
                  {currentStep.packageText}
                </div>
                <p className="text-[11px] sm:text-xs text-emerald-200 italic font-medium">
                  "{currentStep.speech}"
                </p>
              </div>
            )}
          </div>

          {/* Bottom Step Description */}
          <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs text-slate-300 border-t border-white/10 pt-2 flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white">{currentStep.title}:</span>
              <span className="text-slate-400 hidden xs:inline">{currentStep.desc}</span>
            </div>
            <button
              onClick={() => setStepIdx((prev) => (prev + 1) % STORY_STEPS.length)}
              className="text-indigo-400 hover:text-indigo-300 font-bold text-[11px] sm:text-xs flex items-center gap-0.5 ml-auto"
            >
              Next Step <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] sm:text-xs shadow-md border border-emerald-400">
              100%
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">From Home Practice ➔ To Job Offer</div>
              <div className="text-[10px] sm:text-xs text-slate-400">10,000+ Mock Interviews Completed</div>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-semibold">
            <ShieldCheck size={12} /> Verified Outcomes
          </span>
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute -bottom-4 -right-4 card px-3.5 py-2.5 shadow-2xl bg-white text-slate-900 border border-slate-200 hidden md:block animate-bounce" style={{ animationDuration: '4s' }}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <PartyPopper size={16} className="text-emerald-600 shrink-0" />
          <span>Success Story</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Practice at Home ➔ Land SDE Job</div>
      </div>
    </div>
  );
}
