import { create } from 'zustand';
import { supabase } from './supabase';
import { ringtone } from './ringtone';
import type { CallInvitationData, CallStatus, Profile } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CALL_TIMEOUT_SECONDS = 45;

export interface ActiveCallState {
  sessionId: string;
  bookingId: string;
  roomName: string;
  role: 'caller' | 'receiver';
  otherPerson: {
    id: string;
    name: string;
    role: string;
    avatar?: string | null;
  };
  topic?: string | null;
  scheduledTime?: string | null;
}

interface CallStoreState {
  incomingCall: CallInvitationData | null;
  outgoingCall: CallInvitationData | null;
  activeCall: ActiveCallState | null;
  callStatus: CallStatus;
  callDuration: number;
  errorMessage: string | null;
  userListeningChannel: RealtimeChannel | null;
  roomSignalingChannel: RealtimeChannel | null;
  timeoutTimer: number | null;
  durationTimer: number | null;
  pollingTimer: number | null;

  // Actions
  initUserListener: (userId: string) => void;
  cleanupUserListener: () => void;
  initiateCall: (params: {
    bookingId: string;
    recipient: Profile;
    currentUser: Profile;
    topic?: string | null;
    roomName: string;
    scheduledTime?: string | null;
  }) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  cancelOutgoingCall: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  setCallStatus: (status: CallStatus) => void;
  resetCallState: () => void;
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  incomingCall: null,
  outgoingCall: null,
  activeCall: null,
  callStatus: 'idle',
  callDuration: 0,
  errorMessage: null,
  userListeningChannel: null,
  roomSignalingChannel: null,
  timeoutTimer: null,
  durationTimer: null,
  pollingTimer: null,

  initUserListener: (userId: string) => {
    // If already listening on this user channel, skip
    if (get().userListeningChannel) {
      return;
    }

    const channelName = `user-incoming-calls-${userId}`;
    const channel = supabase.channel(channelName);

    // 1. Listen for WebRTC Broadcasts
    channel
      .on('broadcast', { event: 'call:invite' }, ({ payload }: { payload: CallInvitationData }) => {
        if (get().activeCall || get().outgoingCall || get().incomingCall) {
          return;
        }

        set({
          incomingCall: payload,
          callStatus: 'ringing',
          errorMessage: null,
        });
        ringtone.playIncoming();
      })
      .on('broadcast', { event: 'call:cancel' }, () => {
        ringtone.stop();
        set({
          incomingCall: null,
          callStatus: 'idle',
        });
      })
      // 2. Listen for Postgres DB Changes on call_sessions
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_sessions',
        },
        async (payload: any) => {
          const row = payload.new;
          if (!row || row.caller_id === userId) return;

          if (
            (row.interviewer_id === userId || row.student_id === userId) &&
            row.status === 'ringing'
          ) {
            if (get().activeCall || get().outgoingCall || get().incomingCall) return;

            // Fetch caller profile and booking details
            const [{ data: callerProfile }, { data: bookingData }] = await Promise.all([
              supabase.from('profiles').select('*').eq('id', row.caller_id).single(),
              supabase.from('bookings').select('*, slot:slot_id(*)').eq('id', row.booking_id).single(),
            ]);

            const invitation: CallInvitationData = {
              sessionId: row.id,
              bookingId: row.booking_id,
              callerId: row.caller_id,
              callerName: callerProfile?.full_name || 'Interview Participant',
              callerRole: callerProfile?.role || 'mentor',
              callerAvatar: callerProfile?.avatar_url,
              recipientId: userId,
              recipientName: 'You',
              topic: bookingData?.slot?.topic || 'Mock Interview',
              meetingRoom: bookingData?.meeting_room || row.booking_id,
              scheduledTime: bookingData?.slot?.start_time,
            };

            set({
              incomingCall: invitation,
              callStatus: 'ringing',
              errorMessage: null,
            });
            ringtone.playIncoming();
          }
        }
      )
      .subscribe();

    // 3. Fallback Polling (every 2.5s) to guarantee arrival even if WebSockets reconnect
    const pollInterval = window.setInterval(async () => {
      if (get().activeCall || get().outgoingCall || get().incomingCall) return;

      try {
        const { data: recentSessions } = await supabase
          .from('call_sessions')
          .select('*, booking:booking_id(*)')
          .or(`interviewer_id.eq.${userId},student_id.eq.${userId}`)
          .eq('status', 'ringing')
          .neq('caller_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (recentSessions && recentSessions.length > 0) {
          const row = recentSessions[0];
          // Check if session created in last 45 seconds
          const createdAt = new Date(row.created_at).getTime();
          if (Date.now() - createdAt < 45000) {
            if (get().incomingCall?.sessionId === row.id) return;

            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', row.caller_id)
              .single();

            const invitation: CallInvitationData = {
              sessionId: row.id,
              bookingId: row.booking_id,
              callerId: row.caller_id,
              callerName: callerProfile?.full_name || 'Interview Participant',
              callerRole: callerProfile?.role || 'mentor',
              callerAvatar: callerProfile?.avatar_url,
              recipientId: userId,
              recipientName: 'You',
              topic: row.booking?.topic || 'Mock Interview',
              meetingRoom: row.booking?.meeting_room || row.booking_id,
            };

            set({
              incomingCall: invitation,
              callStatus: 'ringing',
              errorMessage: null,
            });
            ringtone.playIncoming();
          }
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);

    set({
      userListeningChannel: channel,
      pollingTimer: pollInterval,
    });
  },

  cleanupUserListener: () => {
    const { userListeningChannel, pollingTimer } = get();
    if (userListeningChannel) {
      supabase.removeChannel(userListeningChannel);
    }
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    set({ userListeningChannel: null, pollingTimer: null });
  },

  initiateCall: async ({ bookingId, recipient, currentUser, topic, roomName, scheduledTime }) => {
    get().resetCallState();

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : `call_${Date.now()}`;
    const invitation: CallInvitationData = {
      sessionId,
      bookingId,
      callerId: currentUser.id,
      callerName: currentUser.full_name,
      callerRole: currentUser.role,
      callerAvatar: currentUser.avatar_url,
      recipientId: recipient.id,
      recipientName: recipient.full_name,
      topic,
      meetingRoom: roomName,
      scheduledTime,
    };

    set({
      outgoingCall: invitation,
      callStatus: 'calling',
      errorMessage: null,
      activeCall: {
        sessionId,
        bookingId,
        roomName,
        role: 'caller',
        otherPerson: {
          id: recipient.id,
          name: recipient.full_name,
          role: recipient.role === 'mentor' ? 'Interviewer' : 'Student',
          avatar: recipient.avatar_url,
        },
        topic,
        scheduledTime,
      },
    });

    ringtone.playOutgoing();

    // 1. Insert call session in DB (Primary reliable trigger)
    try {
      await supabase.from('call_sessions').insert({
        id: sessionId,
        booking_id: bookingId,
        student_id: currentUser.role === 'student' ? currentUser.id : recipient.id,
        interviewer_id: currentUser.role === 'mentor' ? currentUser.id : recipient.id,
        caller_id: currentUser.id,
        status: 'ringing',
      });
    } catch (e) {
      console.warn('Could not insert call_session to DB:', e);
    }

    // 2. Broadcast call invitation directly to recipient channel
    const recipientChannel = supabase.channel(`user-incoming-calls-${recipient.id}`);
    recipientChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        recipientChannel.send({
          type: 'broadcast',
          event: 'call:invite',
          payload: invitation,
        });
      }
    });

    // 3. Connect to room signaling channel to await responses
    const roomChannel = supabase.channel(`room-call-${bookingId}`);
    roomChannel
      .on('broadcast', { event: 'call:accept' }, () => {
        ringtone.stop();
        if (get().timeoutTimer) {
          clearTimeout(get().timeoutTimer!);
        }

        // Redirect directly into room
        window.location.href = `/room/${bookingId}`;
      })
      .on('broadcast', { event: 'call:decline' }, () => {
        ringtone.stop();
        ringtone.playCallEnd();
        if (get().timeoutTimer) clearTimeout(get().timeoutTimer!);
        set({
          callStatus: 'declined',
          errorMessage: 'The interview call was declined.',
        });
        setTimeout(() => {
          get().resetCallState();
        }, 3500);
      })
      .on('broadcast', { event: 'call:ended' }, () => {
        ringtone.stop();
        ringtone.playCallEnd();
        if (get().durationTimer) clearInterval(get().durationTimer!);
        set({
          callStatus: 'ended',
          errorMessage: 'The call has ended.',
        });
        setTimeout(() => {
          get().resetCallState();
        }, 3000);
      })
      .subscribe();

    // 4. Also listen to DB updates on this call_session
    const sessionDbChannel = supabase
      .channel(`db-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row.status === 'accepted') {
            ringtone.stop();
            if (get().timeoutTimer) clearTimeout(get().timeoutTimer!);
            window.location.href = `/room/${bookingId}`;
          } else if (row.status === 'declined') {
            ringtone.stop();
            ringtone.playCallEnd();
            if (get().timeoutTimer) clearTimeout(get().timeoutTimer!);
            set({
              callStatus: 'declined',
              errorMessage: 'The interview call was declined.',
            });
            setTimeout(() => {
              get().resetCallState();
            }, 3500);
          }
        }
      )
      .subscribe();

    // 5. Timeout handler (45 seconds)
    const timeout = window.setTimeout(async () => {
      if (get().callStatus === 'calling' || get().callStatus === 'ringing') {
        ringtone.stop();
        ringtone.playCallEnd();

        // Broadcast cancel to recipient
        const cancelChannel = supabase.channel(`user-incoming-calls-${recipient.id}`);
        cancelChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            cancelChannel.send({
              type: 'broadcast',
              event: 'call:cancel',
              payload: { sessionId },
            });
          }
        });

        // Update DB
        try {
          await supabase
            .from('call_sessions')
            .update({ status: 'missed', ended_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch {
          // ignore
        }

        set({
          callStatus: 'missed',
          errorMessage: 'No answer. The participant may be away.',
        });
        setTimeout(() => {
          get().resetCallState();
        }, 4000);
      }
    }, CALL_TIMEOUT_SECONDS * 1000);

    set({
      roomSignalingChannel: roomChannel,
      timeoutTimer: timeout,
    });
  },

  acceptIncomingCall: async () => {
    const incoming = get().incomingCall;
    if (!incoming) return;

    ringtone.stop();

    // 1. Update DB immediately
    try {
      await supabase
        .from('call_sessions')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        })
        .eq('id', incoming.sessionId);
    } catch {
      // ignore
    }

    // 2. Broadcast accept event to room channel
    const roomChannel = supabase.channel(`room-call-${incoming.bookingId}`);
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        roomChannel.send({
          type: 'broadcast',
          event: 'call:accept',
          payload: { sessionId: incoming.sessionId },
        });
      }
    });

    set({
      incomingCall: null,
      callStatus: 'connecting',
    });

    // 3. Immediately redirect to the interview room
    window.location.href = `/room/${incoming.bookingId}`;
  },

  declineIncomingCall: async () => {
    const incoming = get().incomingCall;
    if (!incoming) return;

    ringtone.stop();

    // Broadcast decline
    const roomChannel = supabase.channel(`room-call-${incoming.bookingId}`);
    roomChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        roomChannel.send({
          type: 'broadcast',
          event: 'call:decline',
          payload: { sessionId: incoming.sessionId },
        });
      }
    });

    // Update DB
    try {
      await supabase
        .from('call_sessions')
        .update({ status: 'declined', ended_at: new Date().toISOString() })
        .eq('id', incoming.sessionId);
    } catch {
      // ignore
    }

    get().resetCallState();
  },

  cancelOutgoingCall: async () => {
    const outgoing = get().outgoingCall;
    ringtone.stop();
    ringtone.playCallEnd();

    if (outgoing) {
      const recipientChannel = supabase.channel(`user-incoming-calls-${outgoing.recipientId}`);
      recipientChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          recipientChannel.send({
            type: 'broadcast',
            event: 'call:cancel',
            payload: { sessionId: outgoing.sessionId },
          });
        }
      });

      try {
        await supabase
          .from('call_sessions')
          .update({ status: 'missed', ended_at: new Date().toISOString() })
          .eq('id', outgoing.sessionId);
      } catch {
        // ignore
      }
    }

    get().resetCallState();
  },

  endActiveCall: async () => {
    const active = get().activeCall;
    const roomChannel = get().roomSignalingChannel;

    ringtone.stop();
    ringtone.playCallEnd();

    if (roomChannel && active) {
      roomChannel.send({
        type: 'broadcast',
        event: 'call:ended',
        payload: { sessionId: active.sessionId },
      });
    }

    if (active) {
      try {
        await supabase
          .from('call_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', active.sessionId);
      } catch {
        // ignore
      }
    }

    set({
      callStatus: 'ended',
      errorMessage: 'Call ended.',
    });

    setTimeout(() => {
      get().resetCallState();
    }, 2000);
  },

  setCallStatus: (status) => set({ callStatus: status }),

  resetCallState: () => {
    ringtone.stop();
    const { timeoutTimer, durationTimer, roomSignalingChannel } = get();

    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (durationTimer) clearInterval(durationTimer);
    if (roomSignalingChannel) supabase.removeChannel(roomSignalingChannel);

    set({
      incomingCall: null,
      outgoingCall: null,
      activeCall: null,
      callStatus: 'idle',
      callDuration: 0,
      errorMessage: null,
      roomSignalingChannel: null,
      timeoutTimer: null,
      durationTimer: null,
    });
  },
}));
