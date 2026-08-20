import { useEffect, useState, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Maximize2,
  Minimize2,
  PhoneOff,
  User,
  ShieldCheck,
  Radio,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getIceServers } from '../lib/webrtcConfig';
import { useCallStore } from '../lib/call-store';

interface ModernVideoCallProps {
  bookingId: string;
  roomName: string;
  userId: string;
  userName: string;
  otherPersonName: string;
  otherRole: string;
  topic?: string | null;
  onEndCall: () => void;
}

export default function ModernVideoCall({
  bookingId,
  roomName,
  userId,
  userName,
  otherPersonName,
  otherRole,
  topic,
  onEndCall,
}: ModernVideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const { callDuration } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  // Format Call Duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  // Initialize WebRTC Call & Signaling
  useEffect(() => {
    let isMounted = true;
    let pc: RTCPeerConnection | null = null;
    let channel: any = null;

    const startCall = async () => {
      try {
        setMediaError(null);
        setConnectionState('connecting');

        // 1. Capture Local Audio & Video
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Instantiate RTCPeerConnection with STUN/TURN
        const iceConfig = getIceServers();
        pc = new RTCPeerConnection(iceConfig);
        peerConnectionRef.current = pc;

        // Add local tracks to PeerConnection
        stream.getTracks().forEach((track) => {
          if (pc) pc.addTrack(track, stream);
        });

        // 3. Receive Remote Media Tracks
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            setPeerConnected(true);
            setConnectionState('connected');
          }
        };

        // 4. Track ICE Connection State
        pc.oniceconnectionstatechange = () => {
          if (!pc) return;
          const state = pc.iceConnectionState;
          if (state === 'connected' || state === 'completed') {
            setPeerConnected(true);
            setConnectionState('connected');
          } else if (state === 'checking') {
            setConnectionState('connecting');
          } else if (state === 'disconnected') {
            setConnectionState('reconnecting');
          } else if (state === 'failed') {
            setConnectionState('disconnected');
          }
        };

        // 5. Connect to Supabase Realtime Signaling Channel
        const channelId = `room-webrtc-${bookingId}`;
        channel = supabase.channel(channelId, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // Send ICE candidate to peer
        pc.onicecandidate = (event) => {
          if (event.candidate && channel) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, senderId: userId },
            });
          }
        };

        // Signaling message listeners
        channel
          .on('broadcast', { event: 'offer' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { answer, senderId: userId },
              });
            } catch (e) {
              console.error('Error handling WebRTC offer:', e);
            }
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            try {
              if (pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              }
            } catch (e) {
              console.error('Error handling WebRTC answer:', e);
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            try {
              if (payload.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              }
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          })
          .on('broadcast', { event: 'peer-ready' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            // Initiate offer when new peer announces ready
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { offer, senderId: userId },
              });
            } catch (e) {
              console.error('Error creating WebRTC offer:', e);
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              // Announce presence to trigger offer/answer
              channel.send({
                type: 'broadcast',
                event: 'peer-ready',
                payload: { senderId: userId, userName },
              });
            }
          });
      } catch (err: any) {
        console.error('WebRTC setup error:', err);
        if (isMounted) {
          setMediaError(
            err?.name === 'NotAllowedError'
              ? 'Camera / Microphone permission denied. Please allow access in browser.'
              : 'Failed to access camera/microphone device.'
          );
        }
      }
    };

    startCall();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (pc) {
        pc.close();
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [bookingId, userId, userName]);

  // Toggle Microphone
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !isMicOn;
      });
      setIsMicOn(!isMicOn);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current || !localStream) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          // Revert to camera
          const cameraTrack = localStream.getVideoTracks()[0];
          if (videoSender && cameraTrack) {
            videoSender.replaceTrack(cameraTrack);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    } else {
      const cameraTrack = localStream.getVideoTracks()[0];
      const videoSender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === 'video');

      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      setIsScreenSharing(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Top Session Bar */}
      <div className="card p-3.5 flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-400/30 flex items-center justify-center shrink-0">
            <User size={20} className="text-brand-300" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>{otherPersonName}</span>
              <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-normal">
                {otherRole}
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
              {topic && <span className="text-brand-300 font-medium">{topic}</span>}
              <span>•</span>
              <span className="text-slate-400">Room: {roomName}</span>
            </div>
          </div>
        </div>

        {/* Status Indicators & Duration */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Duration Badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-white bg-white/10 px-3 py-1 rounded-full font-semibold">
            <Clock size={13} className="text-brand-400" />
            {formatDuration(callDuration)}
          </div>

          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${
              connectionState === 'connected'
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                : connectionState === 'connecting'
                ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
            }`}
          >
            <Radio
              size={12}
              className={connectionState === 'connected' ? 'animate-pulse text-emerald-400' : ''}
            />
            {connectionState === 'connected'
              ? 'HD Connected'
              : connectionState === 'connecting'
              ? 'Connecting...'
              : connectionState === 'reconnecting'
              ? 'Reconnecting...'
              : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        ref={containerRef}
        className="card overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 relative rounded-3xl flex flex-col justify-between"
        style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 210px)', minHeight: '520px' }}
      >
        <div className="relative w-full h-full flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* Permission Error Overlay */}
          {mediaError && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur z-30 flex flex-col items-center justify-center p-6 text-center text-white">
              <VideoOff size={48} className="text-rose-500 mb-3" />
              <h3 className="text-lg font-bold mb-1">Camera / Mic Access Error</h3>
              <p className="text-xs text-slate-300 max-w-sm mb-4">{mediaError}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary inline-flex items-center gap-1.5 text-xs"
              >
                <RefreshCw size={13} /> Retry Permissions
              </button>
            </div>
          )}

          {/* Remote Video Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-all ${
              peerConnected ? 'opacity-100' : 'opacity-0 absolute'
            }`}
          />

          {/* Waiting for Remote Peer Placeholder */}
          {!peerConnected && !mediaError && (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-indigo-900/50 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-inner">
                  <User size={48} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center animate-bounce">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Connected to Call Room
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Waiting for {otherPersonName} ({otherRole}) video stream to arrive...
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full font-medium">
                <ShieldCheck size={14} /> End-to-End Encrypted WebRTC Interview
              </div>
            </div>
          )}

          {/* Floating Local Video Self-View (Picture-in-Picture) */}
          <div className="absolute bottom-6 right-6 w-36 h-24 sm:w-52 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 z-20 group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOn ? 'block' : 'hidden'}`}
            />
            {!isVideoOn && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
                <VideoOff size={22} className="mb-1" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-0.5 rounded-md font-medium truncate max-w-[90%] flex items-center gap-1">
              <span>You ({userName})</span>
              {!isMicOn && <MicOff size={10} className="text-rose-400" />}
            </div>
          </div>

          {/* Bottom Floating Control Dock */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/85 backdrop-blur-lg p-2.5 rounded-2xl border border-white/10 shadow-2xl z-20">
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              className={`p-3 rounded-xl transition-all ${
                isMicOn
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition-all ${
                isVideoOn
                  ? 'bg-slate-800 text-white hover:bg-slate-700'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
              title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
            >
              {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>

            {/* Screen Sharing Toggle */}
            <button
              onClick={toggleScreenShare}
              className={`p-3 rounded-xl transition-all ${
                isScreenSharing
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/30'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Monitor size={20} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all"
              title="End Interview Call"
            >
              <PhoneOff size={18} />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
