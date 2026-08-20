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

  initUserListener: (userId: string) => {
    // If already listening on this user channel, skip
    const currentChannel = get().userListeningChannel;
    if (currentChannel) {
      return;
    }

    const channelName = `user-incoming-calls-${userId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'call:invite' }, ({ payload }: { payload: CallInvitationData }) => {
        // If already in a call, send back busy signal
        if (get().activeCall || get().outgoingCall || get().incomingCall) {
          const roomChannel = supabase.channel(`room-call-${payload.bookingId}`);
          roomChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              roomChannel.send({
                type: 'broadcast',
                event: 'call:busy',
                payload: { sessionId: payload.sessionId },
              });
              setTimeout(() => supabase.removeChannel(roomChannel), 1000);
            }
          });
          return;
        }

        // Set incoming call and ring
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
      .subscribe();

    set({ userListeningChannel: channel });
  },

  cleanupUserListener: () => {
    const channel = get().userListeningChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ userListeningChannel: null });
    }
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

    // 1. Log call session in DB (optional/non-blocking)
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
      console.warn('Could not insert call_session to db (table may not exist yet):', e);
    }

    // 2. Broadcast call invitation to recipient user channel
    const recipientChannel = supabase.channel(`user-incoming-calls-${recipient.id}`);
    recipientChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        recipientChannel.send({
          type: 'broadcast',
          event: 'call:invite',
          payload: invitation,
        });
        setTimeout(() => supabase.removeChannel(recipientChannel), 2000);
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

        // Start call duration timer
        const timer = window.setInterval(() => {
          set((s) => ({ callDuration: s.callDuration + 1 }));
        }, 1000);

        set({
          callStatus: 'connecting',
          durationTimer: timer,
          outgoingCall: null,
        });
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
      .on('broadcast', { event: 'call:busy' }, () => {
        ringtone.stop();
        ringtone.playCallEnd();
        if (get().timeoutTimer) clearTimeout(get().timeoutTimer!);
        set({
          callStatus: 'busy',
          errorMessage: 'The user is currently on another call.',
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

    // 4. Timeout handler (45 seconds)
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
            setTimeout(() => supabase.removeChannel(cancelChannel), 1500);
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
          errorMessage: 'No answer. The interviewer/student may be away.',
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

    const activeCall: ActiveCallState = {
      sessionId: incoming.sessionId,
      bookingId: incoming.bookingId,
      roomName: incoming.meetingRoom,
      role: 'receiver',
      otherPerson: {
        id: incoming.callerId,
        name: incoming.callerName,
        role: incoming.callerRole === 'mentor' ? 'Interviewer' : 'Student',
        avatar: incoming.callerAvatar,
      },
      topic: incoming.topic,
      scheduledTime: incoming.scheduledTime,
    };

    // Update DB
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

    // Connect to room channel and broadcast accept
    const roomChannel = supabase.channel(`room-call-${incoming.bookingId}`);
    roomChannel
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          roomChannel.send({
            type: 'broadcast',
            event: 'call:accept',
            payload: { sessionId: incoming.sessionId },
          });
        }
      });

    // Start call duration timer
    const timer = window.setInterval(() => {
      set((s) => ({ callDuration: s.callDuration + 1 }));
    }, 1000);

    set({
      incomingCall: null,
      activeCall,
      callStatus: 'connecting',
      durationTimer: timer,
      roomSignalingChannel: roomChannel,
    });
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
        setTimeout(() => supabase.removeChannel(roomChannel), 1500);
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
      // Broadcast cancel
      const recipientChannel = supabase.channel(`user-incoming-calls-${outgoing.recipientId}`);
      recipientChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          recipientChannel.send({
            type: 'broadcast',
            event: 'call:cancel',
            payload: { sessionId: outgoing.sessionId },
          });
          setTimeout(() => supabase.removeChannel(recipientChannel), 1500);
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
