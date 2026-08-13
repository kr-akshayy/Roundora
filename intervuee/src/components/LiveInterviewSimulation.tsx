import { useEffect, useState } from 'react';
import { Video, Mic, Code2, Cpu, CheckCircle2, Sparkles, Activity, Timer, ShieldCheck } from 'lucide-react';

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
      {/* Main Glass Card */}
      <div className="card p-5 shadow-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl relative overflow-hidden transition-all duration-500 hover:shadow-brand-500/10">
        
        {/* Top Live Bar */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold tracking-wide text-rose-400 uppercase text-[11px]">
              Live 1-on-1 Session
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

        {/* Video Simulation Display Screen */}
        <div className="aspect-[16/10] sm:aspect-video rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col justify-between p-3.5 mb-4 group/screen shadow-inner">
          
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Top Video Header Overlay */}
          <div className="relative z-10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 shadow-md">
              <Sparkles size={13} className="text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-xs font-bold text-indigo-200 transition-all duration-300">
                {currentRound.title}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[11px] text-emerald-400">
              <CheckCircle2 size={12} /> AI Feedback Enabled
            </div>
          </div>

          {/* Center Stage: Split Screen Participants + Code/Diagram Animation */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto py-2">
            
            {/* Left Box: Mentor Feed (Ex-Amazon Staff Eng) */}
            <div className="relative bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3 shadow-lg flex flex-col justify-between overflow-hidden group/mentor">
              {/* Speaker Waveform animation */}
              <div className="absolute top-2 right-2 flex items-end gap-0.5 h-3">
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.2s' }} />
              </div>

              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-emerald-400">
                    RS
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate text-white flex items-center gap-1">
                    Rohan S. <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-indigo-300 truncate">Staff Eng, ex-Amazon</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-white/5 text-[11px] text-slate-300 italic min-h-[36px] flex items-center transition-all duration-500">
                "{currentRound.speech}"
              </div>
            </div>

            {/* Right Box: Student / Live Code & Architecture Diagram */}
            <div className="relative bg-slate-900/90 border border-brand-500/30 rounded-xl p-3 shadow-lg flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span className="flex items-center gap-1 font-mono text-indigo-300">
                  <Code2 size={12} className="text-brand-400" /> main.ts
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Cpu size={10} /> Live Architecture
                </span>
              </div>

              {/* Animated Typing Code Block */}
              <div className="bg-slate-950 p-2 rounded-lg font-mono text-[10px] text-emerald-300 leading-relaxed overflow-hidden min-h-[58px] border border-white/5">
                <pre className="whitespace-pre-wrap font-mono">
                  {typedText}
                  {isTyping && <span className="animate-ping inline-block w-1.5 h-3 bg-brand-400 ml-0.5" />}
                </pre>
              </div>

              {/* Diagram Node Pill */}
              <div className="mt-1.5 text-[9.5px] font-mono text-indigo-200 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/20 truncate">
                Architecture: {currentRound.diagram}
              </div>
            </div>
          </div>

          {/* Bottom Overlay Status */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-slate-300">
                <Mic size={11} className="text-emerald-400" /> Active Mic
              </span>
              <span>•</span>
              <span className="text-indigo-300 font-medium">Candidate: Practicing Live</span>
            </div>
            <span className="bg-brand-500/20 border border-brand-400/30 text-brand-300 px-2 py-0.5 rounded text-[10px] font-bold">
              Repeat Simulation Mode 🔄
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
