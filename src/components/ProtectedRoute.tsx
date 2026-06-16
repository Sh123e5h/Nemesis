import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { profileNeedsSignupCompletion } from '../lib/authRedirect';
import { supabase } from '../lib/supabase';
import { SectionFallback } from './SectionFallback';
import { ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  requireUsername?: boolean;
}




export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireUsername = true }) => {
  const { initialized, session, profile, isFetchingProfile } = useAuthStore();
  const location = useLocation();

  const [mfaStatus, setMfaStatus] = useState(() => {
    const isRequired = localStorage.getItem('nemesis_mfa_required') === 'true';
    return { loading: isRequired, needsMfa: isRequired };
  });
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      const checkAal = async () => {
        // ⚡ SAFETY GATE: Don't let MFA check hang the entire app load
        const timeout = setTimeout(() => {
          setMfaStatus(prev => prev.loading ? { loading: false, needsMfa: false } : prev);
        }, 5000);

        try {
          const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (data?.nextLevel === 'aal2' && data?.currentLevel === 'aal1') {
            // get the enrolled factor ID
            const factors = await supabase.auth.mfa.listFactors();
            const totp = factors.data?.all.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (totp) setMfaFactorId(totp.id);
            
            localStorage.setItem('nemesis_mfa_required', 'true');
            setMfaStatus({ loading: false, needsMfa: true });
          } else {
            localStorage.setItem('nemesis_mfa_required', 'false');
            setMfaStatus({ loading: false, needsMfa: false });
          }
        } catch (err) {
          console.error("MFA Check failed:", err);
          setMfaStatus({ loading: false, needsMfa: false });
        } finally {
          clearTimeout(timeout);
        }
      };
      checkAal();
    } else {
      setMfaStatus(prev => (prev.loading || prev.needsMfa) ? { loading: false, needsMfa: false } : prev);
    }
  }, [session]);

  // We only block the entire app if the session is still being checked (initial hydration)
  // or if the profile is actively being fetched from the database, preventing premature
  // redirects to the onboarding flow for users who already have profiles.
  // CRITICAL: We allow /signup/username to bypass the isFetchingProfile check because 
  // that component is the one responsible for creating/refreshing the profile.
  //
  // ⚡ PERF: If we are initialized from localStorage cache (returning user), we already
  // have a session+profile in state — don't block on isFetchingProfile (background refresh).
  // Only block if we have NO profile at all yet (first load, no cache).
  const isSetupRoute = location.pathname === '/signup/username';
  const hasProfileInState = !!useAuthStore.getState().profile;
  const shouldBlock = !initialized || mfaStatus.loading || (isFetchingProfile && !isSetupRoute && !hasProfileInState);
  if (shouldBlock) {
    return <SectionFallback />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (mfaStatus.needsMfa && mfaFactorId) {
    return <MfaChallenge factorId={mfaFactorId} onSuccess={() => setMfaStatus({ loading: false, needsMfa: false })} />;
  }
  
  if (profile?.status === 'suspended' && location.pathname !== '/suspended') {
    return <Navigate to="/suspended" replace />;
  }
  
  if (requireUsername && profileNeedsSignupCompletion(profile)) {
    return <Navigate to="/signup/username" replace />;
  }

  if (profile && !profile.onboarding_completed && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

const MfaChallenge = ({ factorId, onSuccess }: { factorId: string, onSuccess: () => void }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.data) {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code
      });
      if (!error) {
        onSuccess();
      } else {
        setError('Invalid authentication code. Please try again.');
        setCode('');
      }
    } else {
      setError('Could not request challenge. Please refresh.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Two-Step Verification</h2>
        <p className="text-center text-slate-500 text-sm mb-8">Enter the 6-digit code generated by your authenticator app to continue.</p>
        
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center border border-red-200">{error}</div>}
        
        <form onSubmit={handleVerify} className="space-y-6">
          <input 
            type="text" 
            maxLength={6}
            placeholder="000 000"
            className="w-full text-center text-3xl tracking-[0.5em] p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono outline-none bg-slate-50"
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={code.length !== 6 || loading}
            className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-300 text-white font-bold p-4 rounded-xl transition text-lg"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  );
};
