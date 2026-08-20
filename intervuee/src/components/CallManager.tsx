import { useEffect } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { useCallStore } from '../lib/call-store';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallScreen from './OutgoingCallScreen';

export default function CallManager() {
  const { profile } = useAuthStore();
  const { initUserListener, cleanupUserListener } = useCallStore();

  useEffect(() => {
    if (profile?.id) {
      initUserListener(profile.id);
    }
    return () => {
      cleanupUserListener();
    };
  }, [profile?.id, initUserListener, cleanupUserListener]);

  return (
    <>
      <IncomingCallModal />
      <OutgoingCallScreen />
    </>
  );
}
