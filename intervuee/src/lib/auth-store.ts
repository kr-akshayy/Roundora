import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

let listenerInitialized = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });

    if (data.session) {
      await get().refreshProfile();
    }

    if (!listenerInitialized) {
      listenerInitialized = true;
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentSession = get().session;
        if (currentSession?.access_token !== session?.access_token) {
          set({ session, loading: false });
          if (session) {
            await get().refreshProfile();
          } else {
            set({ profile: null });
          }
        }
      });
    }
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data) {
      set({ profile: data as Profile });
    } else {
      // Profile doesn't exist yet — create it from user metadata.
      // This happens on first login after email confirmation when the
      // profile insert was skipped (no active session at signup time).
      const meta = session.user.user_metadata ?? {};
      const { data: created } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: meta.full_name ?? session.user.email ?? '',
          role: meta.role ?? 'student',
        })
        .select('*')
        .single();
      if (created) set({ profile: created as Profile });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
