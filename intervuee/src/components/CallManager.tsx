import { useEffect, useRef } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { useCallStore } from '../lib/call-store';
import { supabase } from '../lib/supabase';
import type { Booking, Profile } from '../types';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallScreen from './OutgoingCallScreen';

export default function CallManager() {
  const { profile } = useAuthStore();
  const { initUserListener, cleanupUserListener, initiateCall, incomingCall, outgoingCall, activeCall } =
    useCallStore();

  const autoTriggeredRef = useRef<Set<string>>(new Set());

  // 1. Initialize Realtime Incoming Call Listener
  useEffect(() => {
    if (profile?.id) {
      initUserListener(profile.id);
    }
    return () => {
      cleanupUserListener();
    };
  }, [profile?.id, initUserListener, cleanupUserListener]);

  // 2. Automated Scheduled Interview Time Monitor (Auto-rings at scheduled slot time!)
  useEffect(() => {
    if (!profile?.id) return;

    const checkScheduledInterviews = async () => {
      // Don't auto-trigger if already in a call or ringing
      if (incomingCall || outgoingCall || activeCall) return;

      try {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*, mentor:mentor_id(*), student:student_id(*), slot:slot_id(*)')
          .or(`student_id.eq.${profile.id},mentor_id.eq.${profile.id}`)
          .eq('status', 'confirmed');

        if (!bookings || bookings.length === 0) return;

        const now = Date.now();

        for (const b of bookings as unknown as Booking[]) {
          if (!b.slot?.start_time) continue;

          const slotTime = new Date(b.slot.start_time).getTime();
          const diffMinutes = (slotTime - now) / 60000;
          const duration = b.slot.duration_minutes || 45;

          // If scheduled time has arrived (within 1.5 mins before to duration after start)
          if (diffMinutes <= 1.5 && diffMinutes >= -duration) {
            const key = `autocall_${b.id}_${new Date(b.slot.start_time).toDateString()}`;
            if (autoTriggeredRef.current.has(key)) continue;

            autoTriggeredRef.current.add(key);

            // If current user is student, auto-ring the mentor!
            if (profile.role === 'student' && (b.mentor || b.mentor_id)) {
              const mentorRecipient: Profile = {
                id: b.mentor?.id || b.mentor_id,
                full_name: b.mentor?.full_name || 'Interviewer',
                role: 'mentor',
                avatar_url: b.mentor?.avatar_url || null,
                headline: b.mentor?.headline || null,
                bio: null,
                company: null,
                years_experience: null,
                price_per_session: null,
                expertise: null,
                created_at: new Date().toISOString(),
              };

              await initiateCall({
                bookingId: b.id,
                recipient: mentorRecipient,
                currentUser: profile,
                topic: b.slot.topic,
                roomName: b.meeting_room,
                scheduledTime: b.slot.start_time,
              });
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Auto-schedule call checker error:', err);
      }
    };

    // Check immediately and every 10 seconds
    checkScheduledInterviews();
    const interval = window.setInterval(checkScheduledInterviews, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [profile, incomingCall, outgoingCall, activeCall, initiateCall]);

  return (
    <>
      <IncomingCallModal />
      <OutgoingCallScreen />
    </>
  );
}
