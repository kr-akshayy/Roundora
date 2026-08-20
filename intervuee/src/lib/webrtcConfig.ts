/**
 * WebRTC ICE & STUN/TURN Configuration
 * Configurable via environment variables with fallback to public Google STUN.
 */

export function getIceServers(): RTCConfiguration {
  const stunEnv = import.meta.env.VITE_ICE_STUN_SERVERS as string | undefined;
  const turnServer = import.meta.env.VITE_ICE_TURN_SERVER as string | undefined;
  const turnUsername = import.meta.env.VITE_ICE_TURN_USERNAME as string | undefined;
  const turnPassword = import.meta.env.VITE_ICE_TURN_PASSWORD as string | undefined;

  const defaultStuns = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
  ];

  const stunUrls = stunEnv
    ? stunEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultStuns;

  const iceServers: RTCIceServer[] = [
    {
      urls: stunUrls,
    },
  ];

  if (turnServer && turnUsername && turnPassword) {
    iceServers.push({
      urls: turnServer,
      username: turnUsername,
      credential: turnPassword,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
}
