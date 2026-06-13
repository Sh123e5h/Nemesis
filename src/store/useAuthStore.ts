import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { tokenManager } from '../lib/tokenManager';

/** Essential profile columns for the initial session load — excludes heavy fields
 *  fetched lazily. This makes the auth bootstrap significantly faster. */
const PROFILE_SELECT_FIELDS = [
  'id',
  'full_name',
  'username',
  'email',
  'avatar_url',
  'theme_preference',
  'status',
  'onboarding_completed',
  'gdrive_refresh_token',
  'gdrive_quota',
  'gdrive_backup_status',
  'storage_hash',
].join(',');

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url?: string;
  theme_preference: string;
  status: string;
  gdrive_quota?: { limit: number; usage: number; last_synced?: string };
  gdrive_backup_status?: { valid: boolean; last_backup_at: string | null; error?: string | null };
  gdrive_refresh_token?: string;
  storage_hash?: string;
  onboarding_completed: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  initialized: boolean;
  isFetchingProfile: boolean;
  setSession: (session: Session | null, initialProfile?: Profile | null) => Promise<void>;
  initialize: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      initialized: (() => {
        try {
          const stored = localStorage.getItem('nemesis-auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            return !!(parsed.state?.session && parsed.state?.profile);
          }
        } catch {
          return false;
        }
        return false;
      })(),
      isFetchingProfile: false,

      setSession: async (session, initialProfile) => {
        // Capture the user ID at call time so we can abort stale fetches later
        const sessionUserId = session?.user?.id ?? null;
        set({ session, user: session?.user || null });

        if (session?.user) {
          if (initialProfile) {
            set({ profile: initialProfile, isFetchingProfile: false, initialized: true });
            // Seed token manager even if initialProfile is provided
            if (initialProfile.gdrive_refresh_token) {
              tokenManager.setRefreshToken(initialProfile.gdrive_refresh_token);
            }
            return;
          }

          set({ isFetchingProfile: true });
          try {
            // ⚡ NARROWED SELECT: Only fetch essential columns on auth bootstrap.
            // Heavy fields (gdrive tokens etc) are included but we avoid `select('*')`
            // which fetches all future columns added to the table.
            const { data } = await supabase
              .from('profiles')
              .select(PROFILE_SELECT_FIELDS)
              .eq('id', session.user.id)
              .single();

            // ABORT CHECK: If the active session changed while we were fetching
            // (e.g., user signed out via signOut({scope:'local'}) during OTP flow),
            // discard this stale result — do not write profile back to store.
            if (get().session?.user?.id !== sessionUserId) {
              console.warn('[AuthStore] setSession aborted — session changed during profile fetch');
              return;
            }

            if (data) {
              const profile = data as unknown as Profile;
              set({ profile, isFetchingProfile: false });

              // ⚡ SEED TOKEN MANAGER: Immediately seed the token manager so sync starts
              if (profile.gdrive_refresh_token) {
                tokenManager.setRefreshToken(profile.gdrive_refresh_token);
                console.log('[AuthStore] Drive token pre-seeded from profile.');
              }

              // AUTO-SYNC: If profile has no avatar but Google identity has one, sync it
              const meta = session.user.user_metadata || {};
              const googleAvatar = meta.avatar_url || meta.picture;
              const profileData = data as any;
              if (!profileData.avatar_url && googleAvatar) {
                supabase
                  .from('profiles')
                  .update({ avatar_url: googleAvatar })
                  .eq('id', session.user.id)
                  .then(({ error: syncError }) => {
                    if (!syncError) {
                      set({ profile: { ...(data as unknown as Profile), avatar_url: googleAvatar } });
                    }
                  });
              }
            }
          } catch (err) {
            console.error('[AuthStore] Profile fetch failed:', err);
          } finally {
            // Only finalize if this session is still the active one
            if (get().session?.user?.id === sessionUserId) {
              set({ isFetchingProfile: false, initialized: true });
            }
          }
        } else {
          set({ profile: null, isFetchingProfile: false, initialized: true });
        }
      },

      initialize: () => {
        // If we're already initialized (e.g. optimistically from cache), 
        // we still run this to set up listeners and verify session,
        // but we don't need the safety timeout or to block.
        const isOptimistic = get().initialized;

        // Safety timeout — only needed if we're not already showing UI
        let timeout: ReturnType<typeof setTimeout> | null = null;
        if (!isOptimistic) {
          timeout = setTimeout(() => {
            if (!get().initialized) {
              console.warn('Auth initialization timed out, forcing active state');
              set({ initialized: true, isFetchingProfile: false });
            }
          }, 7000);
        }

        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error) {
            console.error('Session error:', error.message);
            supabase.auth.signOut().catch(() => {});
            set({ initialized: true });
            return;
          }

          if (session) {
            get().setSession(session).finally(() => {
              if (timeout) clearTimeout(timeout);
            });
          } else {
            set({ initialized: true });
            if (timeout) clearTimeout(timeout);
          }
        }).catch((err) => {
          console.error('Unexpected error during getSession:', err);
          if (timeout) clearTimeout(timeout);
          set({ initialized: true });
        });

        supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            // CRITICAL: also reset isFetchingProfile — a concurrent setSession may be
            // mid-flight and, without this, isFetchingProfile can be stuck at true forever
            // after the local session is cleared (especially in the OTP interception flow).
            set({ user: null, session: null, profile: null, isFetchingProfile: false });
            tokenManager.reset();
          } else {
            // Sync Google Drive provider tokens via centralized token manager
            const token = session?.provider_token;
            const refresh = session?.provider_refresh_token;

            if (token) {
              tokenManager.setAccessToken(token);
            }

            if (refresh) {
              tokenManager.setRefreshToken(refresh);
              const { user: authUser } = session || {};
              if (authUser?.id) {
                supabase.from('profiles')
                  .update({ gdrive_refresh_token: refresh })
                  .eq('id', authUser.id)
                  .then(({ error: dbErr }) => {
                    if (dbErr) console.warn('[Auth] Failed to sync refresh token to DB:', dbErr.message);
                  });
              }
            }

            // SMART RE-FETCH: For token refresh events where the user hasn't changed
            // and we already have their profile, skip the expensive profile re-fetch.
            // Only do a full setSession (with profile fetch) when the user actually changes.
            const currentState = get();
            const userChanged = session?.user?.id !== currentState.user?.id;
            const hasCurrentProfile = !!currentState.profile && currentState.profile.id === session?.user?.id;

            if (userChanged || !hasCurrentProfile) {
              get().setSession(session).catch((err) => {
                console.error('Error updating session on auth state change:', err);
              });
            } else {
              // Just update the session/user tokens, no profile re-fetch needed
              set({ session, user: session?.user || null });
            }
          }
        });
      },

      refreshProfile: async () => {
        const { session } = get();
        if (session?.user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (data) set({ profile: data });
        }
      },

      signOut: async () => {
        set({ user: null, session: null, profile: null, initialized: true, isFetchingProfile: false });
        tokenManager.reset();
        supabase.auth.signOut().catch(() => {});
      }
    }),
    {
      name: 'nemesis-auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile
      }),
    }
  )
);

// --- IMMEDIATE BOOTSTRAP ---
// Fire initialize() at the module level so auth begins resolving while the
// DOM is still parsing — before any React component mounts.
useAuthStore.getState().initialize();
