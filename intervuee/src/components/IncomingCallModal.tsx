import { Phone, PhoneOff, User, Sparkles, Video } from 'lucide-react';
import { useCallStore } from '../lib/call-store';

export default function IncomingCallModal() {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useCallStore();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Glow Effect */}
      <div className="absolute w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-center flex flex-col items-center overflow-hidden">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-6 animate-bounce">
          <Sparkles size={13} />
          Incoming Interview Call
        </div>

        {/* Animated Avatar Radar */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Concentric Pulse Rings */}
          <div className="absolute w-36 h-36 rounded-full border border-brand-400/30 animate-ping pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full bg-brand-500/20 animate-pulse pointer-events-none" />

          {/* Avatar / Initial */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 border-2 border-white/40 shadow-xl flex items-center justify-center overflow-hidden">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={44} className="text-white" />
            )}
          </div>
        </div>

        {/* Caller Name & Role */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          {incomingCall.callerName}
        </h2>
        <p className="text-xs sm:text-sm text-brand-300 font-medium mb-3">
          {incomingCall.callerRole === 'mentor' ? 'Interviewer' : 'Student'}
        </p>

        {/* Session Topic & Scheduled Info */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mb-8 text-xs text-slate-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Interview Topic:</span>
            <span className="font-semibold text-white truncate max-w-[180px]">
              {incomingCall.topic || '1-on-1 Mock Interview'}
            </span>
          </div>
          {incomingCall.scheduledTime && (
            <div className="flex items-center justify-between text-slate-400">
              <span>Scheduled For:</span>
              <span className="text-slate-200">
                {new Date(incomingCall.scheduledTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={declineIncomingCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all group"
              title="Decline Call"
            >
              <PhoneOff size={26} className="group-hover:rotate-12 transition-transform" />
            </button>
            <span className="text-xs text-slate-400 font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={acceptIncomingCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-all animate-pulse group"
              title="Accept Interview Call"
            >
              <Video size={26} className="group-hover:scale-110 transition-transform" />
            </button>
            <span className="text-xs text-emerald-400 font-bold">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
