import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { tokenManager } from '../../lib/tokenManager';
import { awardPoints } from '../../lib/gamification';
import { verifyGDriveScopes, updatePersistentGDriveStatus } from '../../lib/gdrive';

export default function SignupStep2() {
  const navigate = useNavigate();
  const session = useAuthStore(state => state.session);
  const initialized = useAuthStore(state => state.initialized);

  const [error, setError] = useState('');
  const [takingLongTime, setTakingLongTime] = useState(false);
  const [resolvingUsername, setResolvingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const processStarted = useRef(false);

  const completeSignupFlow = useCallback(async () => {
    if (processStarted.current) return;
    processStarted.current = true;

    // PKCE flow uses ?code= query param; implicit flow uses #access_token= hash.
    const hash = window.location.hash;
    const search = window.location.search;
    const isCallback =
      hash.includes('access_token=') ||
      hash.includes('refresh_token=') ||
      search.includes('code=');

    const longTimeHandle = setTimeout(() => {
      setTakingLongTime(true);
    }, 15000); // 15 seconds

    try {
      setError('');

      // 1. Wait for session hydration
      let currentSession = session;
      if (!currentSession && isCallback) {
        for (let i = 0; i < 15; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            currentSession = data.session;
            break;
          }
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (!currentSession?.user) {
        if (!isCallback) navigate('/signup', { replace: true });
        else setError('Authentication timed out. Please try signing up again.');
        return;
      }

      // ─── NEW: SCOPE ENFORCEMENT ──────────────────────────────────────────────
      // Verify that the user checked the Drive checkboxes in the Google Consent screen.
      // If missing, we block the flow here, sign them out, and send them back to signup.
      const providerToken = currentSession.provider_token || sessionStorage.getItem('gdrive_access_token');
      if (providerToken) {
        const { valid, error: scopeError } = await verifyGDriveScopes(providerToken);
        if (!valid || (scopeError && scopeError.includes('Missing permissions'))) {
          console.warn('[Signup] Mandatory Drive scopes missing. Redirecting to retry.');
          await supabase.auth.signOut();
          navigate('/signup?error=missing_permissions', { replace: true });
          return;
        }
      } else if (currentSession.user.app_metadata.provider === 'google') {
          // If it's a Google user but we reached this point with NO token, it's a critical state error
          await supabase.auth.signOut();
          navigate('/signup?error=auth_failed', { replace: true });
          return;
      }
      // ──────────────────────────────────────────────────────────────────────────

      // 2. Check for cached profile data or existing profile
      const pendingStr = localStorage.getItem('pending_signup_profile');
      
      // Always check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      const isDummyUsername = existingProfile?.username?.toLowerCase().startsWith('user_');

      if (existingProfile?.username && !isDummyUsername) {
        clearTimeout(longTimeHandle);
        localStorage.removeItem('pending_signup_profile');

        const refreshToken = currentSession.provider_refresh_token;
        if (refreshToken) {
          if (currentSession.provider_token) {
            tokenManager.setAccessToken(currentSession.provider_token);
          }
          tokenManager.setRefreshToken(refreshToken);
        }

        await useAuthStore.getState().refreshProfile();
        localStorage.setItem('nemesis_show_security_notice', 'true');
        
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile && !currentProfile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
        return;
      }

      // 3. Handle Profile Creation / Update Dummy Username
      let targetUsername, dob, gender, password;

      if (pendingStr) {
        const pending = JSON.parse(pendingStr);
        targetUsername = pending.username;
        dob = pending.dob;
        gender = pending.gender;
        password = pending.password;
      } else {
        const meta = currentSession.user.user_metadata || {};
        const email = currentSession.user.email || '';
        const baseName = email.split('@')[0] || meta.full_name?.replace(/\s+/g, '').toLowerCase() || 'user';
        const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
        targetUsername = `${baseName}_${randomSuffix}`;
        dob = null;
        gender = null;
        password = null;
      }

      // Update Password if provided
      if (password) {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError && !authError.message.includes('should be different from the old password')) {
          throw authError;
        }
      }

      // If they already have a dummy profile from the Auth Trigger, UPDATE it
      if (existingProfile) {
        const { error: updateError } = await supabase.from('profiles').update({
          username: targetUsername,
          date_of_birth: dob,
          gender: gender,
        }).eq('id', currentSession.user.id);
        
        if (updateError) {
          if (updateError.code === '23505') {
            // Username taken!
            clearTimeout(longTimeHandle);
            setResolvingUsername(true);
            setNewUsername(targetUsername);
            processStarted.current = false;
            return;
          }
          throw updateError;
        }
      } else {
        // Create Profile if it doesn't exist for some reason
        const meta = currentSession.user.user_metadata || {};
        const { error: profileError } = await supabase.from('profiles').insert({
          id: currentSession.user.id,
          username: targetUsername,
          full_name: meta.full_name || targetUsername,
          email: currentSession.user.email,
          date_of_birth: dob,
          gender,
          avatar_url: meta.avatar_url || meta.picture || null,
          theme_preference: 'glassmorphism',
          gdrive_refresh_token: currentSession.provider_refresh_token || null
        });

        if (profileError) {
          if (profileError.code === '23505') {
            // Username taken!
            clearTimeout(longTimeHandle);
            setResolvingUsername(true);
            setNewUsername(targetUsername);
            processStarted.current = false;
            return;
          }
          throw profileError;
        }
        awardPoints(currentSession.user.id, 'join_group').catch(e => console.error('Points error:', e));
      }

      localStorage.removeItem('pending_signup_profile');
      clearTimeout(longTimeHandle);

      // ─── AUTO-CONNECT DRIVE: Seed token manager and verify scopes ───────
      // NOTE: DB write of gdrive_refresh_token is omitted here — useAuthStore.onAuthStateChange
      // fires simultaneously and already handles that UPDATE, avoiding a double-write race.
      const refreshToken = currentSession.provider_refresh_token;
      if (refreshToken) {
        if (currentSession.provider_token) {
          tokenManager.setAccessToken(currentSession.provider_token);
          const status = await verifyGDriveScopes(currentSession.provider_token);
          await updatePersistentGDriveStatus(currentSession.user.id, { backupStatus: status });
        }
        tokenManager.setRefreshToken(refreshToken);
      } else {
        await updatePersistentGDriveStatus(currentSession.user.id, { 
          backupStatus: { valid: false, last_backup_at: null, error: 'Missing permissions: drive.file, drive.appdata' } 
        });
      }

      await useAuthStore.getState().refreshProfile();
      localStorage.setItem('nemesis_show_security_notice', 'true');

      // Final redirect check with fresh state
      const currentProfile = useAuthStore.getState().profile;
      if (currentProfile && !currentProfile.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/home', { replace: true });
      }

    } catch (err: unknown) {
      console.error('Finalization failure:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during account setup.');
      processStarted.current = false;
    }
  }, [session, navigate]);

  useEffect(() => {
    if (initialized) {
      completeSignupFlow();
    }
  }, [initialized, completeSignupFlow]);

  const handleManualSkip = useCallback(async () => {
    localStorage.removeItem('pending_signup_profile');
    if (session) {
      await useAuthStore.getState().setSession(session);
      navigate('/home', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [session, navigate]);

  const handleBackToSignup = useCallback(() => {
    supabase.auth.signOut().then(() => {
      navigate('/signup', { replace: true });
    });
  }, [navigate]);

  const handleResolveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    if (!/^[a-z][a-z0-9_]*$/.test(newUsername)) {
      setUsernameError('Invalid format. Use lowercase letters, numbers, and underscores.');
      return;
    }
    
    setUsernameError('');
    setIsUpdatingUsername(true);
    
    // We update the pending profile so that when completeSignupFlow is called again, it uses the new username
    const pendingStr = localStorage.getItem('pending_signup_profile');
    if (pendingStr) {
      const pending = JSON.parse(pendingStr);
      pending.username = newUsername;
      localStorage.setItem('pending_signup_profile', JSON.stringify(pending));
    } else {
      localStorage.setItem('pending_signup_profile', JSON.stringify({ username: newUsername }));
    }
    
    // Trigger the flow again
    setResolvingUsername(false);
    completeSignupFlow();
    setIsUpdatingUsername(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-sky-50 lg:font-auth-modern">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-sky-100 text-center">
        <div className="lg:hidden flex items-center justify-center gap-1 mb-6 text-center">
          <img src="/logo.svg" alt="Nemesis" className="w-9 h-9" />
          <span className="text-2xl font-bold tracking-tight text-slate-900 leading-none -mt-0.5">Nemesis</span>
        </div>
        {!error && !resolvingUsername ? (
          <>
            <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Finishing setup...</h2>
            <p className="text-slate-500 text-sm mb-6">Please wait while we connect your workspace.</p>
            
            {takingLongTime && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-amber-600 text-xs mb-4 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  Setup is taking longer than usual. You can wait or try jumping straight to your dashboard.
                </p>
                <button
                    onClick={handleManualSkip}
                  className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition shadow-lg shadow-sky-200"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </>
        ) : resolvingUsername ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">@</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Username Unavailable</h2>
            <p className="text-slate-500 text-sm mb-6">The username <strong>{newUsername}</strong> is already taken. Please pick another one.</p>
            <form onSubmit={handleResolveUsername} className="w-full space-y-4">
              <div>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="nexus"
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 font-bold tracking-wide"
                />
                {usernameError && <p className="text-red-500 text-xs font-bold mt-2 text-left">{usernameError}</p>}
              </div>
              <button
                type="submit"
                disabled={isUpdatingUsername}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition shadow-sm disabled:opacity-50"
              >
                {isUpdatingUsername ? 'Saving...' : 'Confirm Username'}
              </button>
            </form>
            <button
              onClick={handleBackToSignup}
              className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition uppercase tracking-widest"
            >
              Cancel Signup
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">!</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Setup Interrupted</h2>
            <div className="p-4 mt-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl text-left shadow-sm w-full">
              {error}
            </div>
            <button
              onClick={handleBackToSignup}
              className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition shadow-sm w-full"
            >
              Back to Signup
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-medium text-slate-500 tracking-normal">
            Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
