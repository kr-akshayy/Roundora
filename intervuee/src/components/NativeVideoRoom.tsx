import { useEffect, useState, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Maximize2,
  Minimize2,
  RefreshCw,
  User,
  ShieldCheck,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NativeVideoRoomProps {
  bookingId: string;
  roomName: string;
  userId: string;
  userName: string;
  otherPersonName: string;
  otherRole: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

export default function NativeVideoRoom({
  bookingId,
  roomName,
  userId,
  userName,
  otherPersonName,
  otherRole,
}: NativeVideoRoomProps) {
  const [engine, setEngine] = useState<'webrtc' | 'vdoninja'>('webrtc');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);

  // Initialize Media & WebRTC Signaling
  useEffect(() => {
    if (engine !== 'webrtc') return;

    let isMounted = true;
    let pc: RTCPeerConnection | null = null;
    let channel: any = null;

    const startCall = async () => {
      try {
        setMediaError(null);
        setConnectionState('connecting');

        // Get Local Audio & Video media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!isMounted) return;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize PeerConnection
        pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          if (pc) pc.addTrack(track, stream);
        });

        // Listen for remote tracks
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

        // Listen for ICE connection state changes
        pc.oniceconnectionstatechange = () => {
          if (!pc) return;
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setPeerConnected(true);
            setConnectionState('connected');
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            setConnectionState('disconnected');
          }
        };

        // Channel for WebRTC Signaling via Supabase Realtime
        const channelId = `room-${bookingId}`;
        channel = supabase.channel(channelId);
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

        // Subscribe to signaling events
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
              console.error('Error handling offer:', e);
            }
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            try {
              if (pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              }
            } catch (e) {
              console.error('Error handling answer:', e);
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
          .on('broadcast', { event: 'join' }, async ({ payload }: any) => {
            if (payload.senderId === userId || !pc) return;
            // Initiate WebRTC offer if new peer joined
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { offer, senderId: userId },
              });
            } catch (e) {
              console.error('Error creating offer on peer join:', e);
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              // Announce presence
              channel.send({
                type: 'broadcast',
                event: 'join',
                payload: { senderId: userId, userName },
              });
            }
          });
      } catch (err) {
        console.error('Media stream error:', err);
        if (isMounted) {
          setMediaError('Camera / Microphone permission denied. Please allow browser permissions.');
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
  }, [bookingId, engine, userId, userName]);

  // Toggle Mic
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

  // Toggle Screen Share
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
          // Revert to camera track
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
        console.error('Screen share error:', err);
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

  // VDO.ninja WebRTC iframe URL (100% free, 0 ads, 0 app download)
  const vdoNinjaUrl = `https://vdo.ninja/?room=${roomName}&push=${userId}&label=${encodeURIComponent(
    userName
  )}&cleanoutput=1&autostart=1&transparent=0`;

  return (
    <div className="space-y-3">
      {/* Engine Switcher Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-900 text-white p-2.5 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Video Mode:</span>
          <button
            onClick={() => setEngine('webrtc')}
            className={`px-3 py-1 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 ${
              engine === 'webrtc'
                ? 'bg-brand-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Radio size={13} className={engine === 'webrtc' ? 'text-emerald-400 animate-pulse' : ''} />
            ⚡ Direct HD WebRTC (Zero Ads)
          </button>
          <button
            onClick={() => setEngine('vdoninja')}
            className={`px-3 py-1 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 ${
              engine === 'vdoninja'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ExternalLink size={13} /> VDO.Ninja (Backup)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {engine === 'webrtc' && (
            <span
              className={`px-2.5 py-1 rounded-full font-semibold text-[11px] flex items-center gap-1.5 ${
                connectionState === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : connectionState === 'connecting'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : connectionState === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              {connectionState === 'connected'
                ? 'Live Connected'
                : connectionState === 'connecting'
                ? 'Waiting for Peer...'
                : 'Peer Disconnected'}
            </span>
          )}
          <span className="text-slate-400 hidden sm:inline">• Room: {roomName}</span>
        </div>
      </div>

      {/* Main Video View Container */}
      <div
        ref={containerRef}
        className="card overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 relative rounded-2xl flex flex-col justify-between"
        style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 230px)', minHeight: '520px' }}
      >
        {engine === 'vdoninja' ? (
          <iframe
            src={vdoNinjaUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Roundora VDO Video Room"
          />
        ) : (
          <div className="relative w-full h-full flex-1 bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Media Error State */}
            {mediaError && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur z-20 flex flex-col items-center justify-center p-6 text-center text-white">
                <VideoOff size={44} className="text-rose-500 mb-3" />
                <h3 className="text-lg font-bold mb-1">Camera / Mic Access Required</h3>
                <p className="text-xs text-slate-300 max-w-sm mb-4">{mediaError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs"
                >
                  <RefreshCw size={13} /> Retry Camera Permission
                </button>
              </div>
            )}

            {/* Remote Peer Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-all ${
                peerConnected ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            />

            {/* Placeholder when waiting for remote peer */}
            {!peerConnected && !mediaError && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-indigo-900/50 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-inner">
                    <User size={48} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center animate-bounce">
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Waiting for {otherPersonName} ({otherRole})
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md">
                    Share room link or wait for the other participant to join. Your video & audio are ready.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3.5 py-1.5 rounded-full font-medium">
                  <ShieldCheck size={14} /> End-to-End Encrypted WebRTC Session
                </div>
              </div>
            )}

            {/* Floating Local Self-View Overlay */}
            <div className="absolute bottom-4 right-4 w-36 h-24 sm:w-48 sm:h-32 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOn ? 'block' : 'hidden'}`}
              />
              {!isVideoOn && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                  <VideoOff size={20} />
                </div>
              )}
              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-0.5 rounded font-medium truncate max-w-[90%]">
                You ({userName})
              </div>
            </div>

            {/* Bottom Floating Control Dock */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl z-10">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl transition-all ${
                  isMicOn
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-xl transition-all ${
                  isVideoOn
                    ? 'bg-slate-800 text-white hover:bg-slate-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-xl transition-all ${
                  isScreenSharing
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
              >
                <Monitor size={18} />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-all"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
