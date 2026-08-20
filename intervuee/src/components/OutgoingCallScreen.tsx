import { PhoneOff, User, Radio, AlertCircle } from 'lucide-react';
import { useCallStore } from '../lib/call-store';

export default function OutgoingCallScreen() {
  const { outgoingCall, callStatus, errorMessage, cancelOutgoingCall } = useCallStore();

  if (!outgoingCall) return null;

  const isDeclined = callStatus === 'declined';
  const isMissed = callStatus === 'missed';
  const isBusy = callStatus === 'busy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      {/* Background glow */}
      <div className="absolute w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 text-center flex flex-col items-center overflow-hidden">
        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 mb-6">
          <Radio size={13} className="text-emerald-400 animate-pulse" />
          {isDeclined
            ? 'Call Declined'
            : isMissed
            ? 'No Answer'
            : isBusy
            ? 'User Busy'
            : 'Calling Interviewer...'}
        </div>

        {/* Pulsing Avatar Radar */}
        <div className="relative mb-6 flex items-center justify-center">
          {!isDeclined && !isMissed && !isBusy && (
            <>
              <div className="absolute w-36 h-36 rounded-full border border-indigo-400/20 animate-ping pointer-events-none" />
              <div className="absolute w-28 h-28 rounded-full bg-indigo-500/15 animate-pulse pointer-events-none" />
            </>
          )}

          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-600 border-2 border-white/30 shadow-xl flex items-center justify-center overflow-hidden">
            <User size={44} className="text-white" />
          </div>
        </div>

        {/* Recipient Name */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          {outgoingCall.recipientName}
        </h2>
        <p className="text-xs text-brand-300 font-medium mb-3">
          {outgoingCall.callerRole === 'student' ? 'Interviewer' : 'Student'}
        </p>

        {/* Session Topic Box */}
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mb-6 text-xs text-slate-300 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Interview Topic:</span>
            <span className="font-semibold text-white truncate max-w-[180px]">
              {outgoingCall.topic || '1-on-1 Mock Interview'}
            </span>
          </div>
        </div>

        {/* Dynamic Status / Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl mb-6 w-full justify-center">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cancel Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={cancelOutgoingCall}
            className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all group"
            title="End Call"
          >
            <PhoneOff size={26} className="group-hover:rotate-12 transition-transform" />
          </button>
          <span className="text-xs text-slate-400 font-medium">Cancel</span>
        </div>
      </div>
    </div>
  );
}
