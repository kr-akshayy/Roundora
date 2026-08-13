import { useEffect, useState } from 'react';
import { Video, Mic, Code2, Cpu, CheckCircle2, Sparkles, Activity, Timer, ShieldCheck, Play } from 'lucide-react';

const ROUNDS_DATA = [
  {
    title: 'Round: System Design',
    codeSnippet: 'const cache = new RedisCluster({\n  strategy: "LRU",\n  maxMemory: "16GB",\n  shards: 3\n});',
    diagram: 'Client ➔ Load Balancer ➔ Redis ➔ Postgres DB',
    speech: 'Interviewer: "How do you handle cache invalidation during peak traffic?"',
  },
  {
    title: 'Round: Data Structures & Algorithms',
    codeSnippet: 'function minWindowSubstring(s, t) {\n  let map = new Map(), count = t.length;\n  // Sliding Window O(N) solution...\n}',
    diagram: 'Array ➔ Sliding Window [L, R] ➔ Min Hash Match',
    speech: 'Interviewer: "Great! Can we optimize space complexity to O(1)?"',
  },
  {
    title: 'Round: Backend Architecture',
    codeSnippet: 'app.post("/v1/booking/confirm", async (req, res) => {\n  const session = await db.transaction(...);\n});',
    diagram: 'API Gateway ➔ Kafka Queue ➔ Worker Node',
    speech: 'Interviewer: "How would you structure idempotency for retry calls?"',
  },
];

// High quality video streams representing interviewer and candidate in live video call
const MENTOR_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-man-having-a-video-call-on-laptop-42930-large.mp4';
const STUDENT_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-on-a-laptop-42861-large.mp4';

export default function LiveInterviewSimulation() {
  const [roundIdx, setRoundIdx] = useState(0);
  const [seconds, setSeconds] = useState(1934); // 32:14 in seconds
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  // Timer increment every second
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Round switcher every 7 seconds
  useEffect(() => {
    const roundInterval = setInterval(() => {
      setRoundIdx((prev) => (prev + 1) % ROUNDS_DATA.length);
    }, 7000);
    return () => clearInterval(roundInterval);
  }, []);

  // Typewriter effect for code snippet
  useEffect(() => {
    const fullText = ROUNDS_DATA[roundIdx].codeSnippet;
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
    }, 45);

    return () => clearInterval(typingInterval);
  }, [roundIdx]);

  const currentRound = ROUNDS_DATA[roundIdx];

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative group">
      {/* Main Glass Card Container */}
      <div className="card p-5 shadow-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl relative overflow-hidden transition-all duration-500 hover:shadow-brand-500/10">
        
        {/* Top Live Bar */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold tracking-wide text-rose-400 uppercase text-[11px] flex items-center gap-1">
              <Video size={13} className="text-rose-500" /> Live Interview Call (Playing Video)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              <Activity size={12} className="animate-pulse" /> HD Audio 48kHz
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-mono text-xs font-semibold bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
              <Timer size={12} className="text-amber-400" /> {formatTimer(seconds)}
            </span>
          </div>
        </div>

        {/* Video Simulation Display Screen Container */}
        <div className="aspect-[16/10] sm:aspect-video rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col justify-between p-3.5 mb-4 group/screen shadow-2xl">
          
          {/* BACKGROUND LOOPING VIDEO (Interviewer Feed Background) */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none scale-105 filter brightness-90"
            src={MENTOR_VIDEO_URL}
          />

          {/* Dark Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/80 pointer-events-none" />

          {/* Top Video Header Overlay */}
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-xl border border-white/15 shadow-lg">
              <Sparkles size={13} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-xs font-bold text-amber-200 transition-all duration-300">
                {currentRound.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold shadow-md">
              <CheckCircle2 size={12} className="text-emerald-400" /> Live AI Feedback Active
            </div>
          </div>

          {/* Center Stage: Split Screen Live Playing Videos */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto py-1">
            
            {/* Left Box: Mentor Live Video Feed (Ex-Amazon Staff Eng) */}
            <div className="relative bg-slate-900/90 border border-indigo-500/40 rounded-xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden min-h-[120px]">
              {/* Actual Video Feed of Mentor */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none transition-opacity duration-300 group-hover/screen:opacity-80"
                src={MENTOR_VIDEO_URL}
              />
              <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

              {/* Speaker Waveform animation */}
              <div className="relative z-10 flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white bg-indigo-600/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 shadow-sm flex items-center gap-1">
                  <Play size={9} className="fill-white" /> INTERVIEWER
                </span>

                <div className="flex items-end gap-0.5 h-3.5 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-white/10">
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3.5" style={{ animationDelay: '0.3s' }} />
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border border-white/30 shadow-md">
                    RS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1 drop-shadow-sm">
                      Rohan S. <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                    </div>
                    <div className="text-[9.5px] text-indigo-200 font-medium drop-shadow-sm">Staff Eng, ex-Amazon</div>
                  </div>
                </div>

                <div className="bg-slate-950/85 backdrop-blur-md p-1.5 rounded-lg border border-white/10 text-[10.5px] text-slate-200 italic min-h-[30px] flex items-center shadow-md">
                  "{currentRound.speech}"
                </div>
              </div>
            </div>

            {/* Right Box: Student Live Video Feed + Live Code Overlay */}
            <div className="relative bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 shadow-2xl flex flex-col justify-between overflow-hidden min-h-[120px]">
              {/* Actual Video Feed of Student */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none transition-opacity duration-300 group-hover/screen:opacity-75"
                src={STUDENT_VIDEO_URL}
              />
              <div className="absolute inset-0 bg-slate-950/50 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span className="text-[10px] font-bold text-white bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 shadow-sm flex items-center gap-1">
                  <Code2 size={10} /> CANDIDATE (STUDENT)
                </span>
                <span className="flex items-center gap-1 text-emerald-300 font-semibold bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Cpu size={10} /> System Diagram
                </span>
              </div>

              {/* Animated Typing Code Block Overlay */}
              <div className="relative z-10 bg-slate-950/90 backdrop-blur-md p-2 rounded-lg font-mono text-[9.5px] text-emerald-300 leading-relaxed overflow-hidden min-h-[50px] border border-white/10 shadow-lg mt-auto">
                <pre className="whitespace-pre-wrap font-mono">
                  {typedText}
                  {isTyping && <span className="animate-ping inline-block w-1.5 h-3 bg-brand-400 ml-0.5" />}
                </pre>
              </div>

              {/* Diagram Node Pill */}
              <div className="relative z-10 mt-1 text-[9px] font-mono text-indigo-200 bg-indigo-950/90 backdrop-blur-md px-2 py-0.5 rounded border border-indigo-500/30 truncate shadow-sm">
                Architecture: {currentRound.diagram}
              </div>
            </div>
          </div>

          {/* Bottom Overlay Status */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10 pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-200 font-semibold">
                <Mic size={11} className="text-emerald-400" /> Active Mic
              </span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">Student Giving Mock Interview</span>
            </div>
            <span className="bg-rose-500/20 border border-rose-400/40 text-rose-300 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1">
              <Play size={9} className="fill-rose-400 animate-pulse" /> Playing Video Loop 🔄
            </span>
          </div>
        </div>

        {/* Footer Info of Mentor Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-md border border-purple-400">
              RS
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                Rohan S.
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                  ★ 4.9
                </span>
              </div>
              <div className="text-xs text-slate-400">Staff Eng, ex-Amazon</div>
            </div>
          </div>

          <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1 font-semibold">
            <ShieldCheck size={12} /> Verified Mentor
          </span>
        </div>
      </div>

      {/* Floating Badge at Bottom-Right */}
      <div className="absolute -bottom-4 -right-4 card px-4 py-3 shadow-2xl bg-white text-slate-900 border border-slate-200 hidden sm:block animate-bounce" style={{ animationDuration: '4s' }}>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <Code2 size={15} className="text-emerald-600 shrink-0" />
          <span>Feedback sent</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">within 2 hours after call</div>
      </div>
    </div>
  );
}
