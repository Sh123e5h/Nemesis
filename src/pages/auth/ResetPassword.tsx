import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  
  // Failsafe to hold tokens in memory in case the Supabase client loses them
  const recoveryTokens = useRef<{ access_token: string, refresh_token: string } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Check for errors in the URL immediately (e.g., from expired or invalid links)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const searchParams = new URLSearchParams(window.location.search);
    const urlError = hashParams.get('error_description') || searchParams.get('error_description');
    
    if (urlError) {
      setError(urlError.replace(/\+/g, ' '));
      setSessionReady(true); // Stop the spinner so the error is visible
      return;
    }

    // ⚡ PKCE / IMPLICIT FLOW BRIDGING: 
    // Our custom Edge Function mailer generates Implicit Flow links (#access_token=...)
    // because it can't securely receive the client's PKCE code verifier.
    // Since our Supabase client is configured for PKCE, it natively ignores the #access_token.
    // We manually extract and inject the session here to bridge the two flows!
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      recoveryTokens.current = { access_token: accessToken, refresh_token: refreshToken };
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError(sessionError.message);
          }
          // Clear the hash from the URL so it's not lingering around
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setSessionReady(true);
        });
      return;
    }

    // Supabase SDK auto-recovers the session from the URL hash/query tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    // Also check for an existing session
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (session) {
        setSessionReady(true);
      } else if (sessionError) {
        setError(sessionError.message);
        setSessionReady(true);
      } else {
        // In PKCE flow, if there's no session and no code in the URL, the link might be broken
        const hasCode = searchParams.has('code');
        if (!hasCode && !urlError) {
          setError('No recovery token found. The link may be broken or expired.');
          setSessionReady(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    // ⚡ FAILSAFE: Ensure the session exists right before updating
    const { data: { session } } = await supabase.auth.getSession();
    if (!session && recoveryTokens.current) {
      console.log('[ResetPassword] Session lost! Re-injecting recovery tokens...');
      const { error: injectError } = await supabase.auth.setSession(recoveryTokens.current);
      if (injectError) {
        setError('Failed to restore recovery session: ' + injectError.message);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Remove tokens from memory once successful
      recoveryTokens.current = null;
      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 2500);
    }
    setLoading(false);
  }, [password, confirmPassword, navigate]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleShowConfirm = useCallback(() => {
    setShowConfirm(prev => !prev);
  }, []);

  const strength = useMemo(() => {
    if (!password) return { label: '', color: '#e2e8f0', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (password.length < 10) return { label: 'Moderate', color: '#f59e0b', width: '55%' };
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) return { label: 'Strong', color: '#10b981', width: '100%' };
    return { label: 'Good', color: '#0ea5e9', width: '75%' };
  }, [password]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden lg:font-auth-modern"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #e0f2fe 100%)' }}>
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[32px] border-2 border-white/80 overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
          
          {/* Header */}
          <div className="flex items-center justify-center gap-4 pt-8 pb-4 px-8">
            <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/logo.png" 
              alt="" className="w-14 h-14" style={{ filter: 'drop-shadow(0 8px 12px rgba(14,165,233,0.15))' }} />
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: '#0ea5e9', letterSpacing: '-0.05em' }}>NEMESIS</h1>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em]" style={{ color: '#64748b' }}>New Passkey Setup</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-4">
            {success ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', boxShadow: '0 8px 24px rgba(16,185,129,0.2)' }}>
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <h2 className="text-xl font-extrabold mb-2" style={{ color: '#065f46' }}>Passkey Updated</h2>
                <p className="text-sm" style={{ color: '#047857', lineHeight: 1.6 }}>
                  Your credentials have been secured. Redirecting to your dashboard...
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                </div>
              </div>
            ) : (
              <>
                {/* Key icon */}
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white"
                    style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', boxShadow: '0 8px 24px rgba(14,165,233,0.15)' }}>
                    <KeyRound size={28} style={{ color: '#0ea5e9' }} />
                  </div>
                </div>

                <h2 className="text-xl font-extrabold text-center mb-2" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                  Create New Passkey
                </h2>
                <p className="text-center text-sm mb-7" style={{ color: '#64748b', lineHeight: 1.6 }}>
                  Establish a new secure passkey for your Nemesis node. Choose something strong and memorable.
                </p>

                {!sessionReady && (
                  <div className="rounded-2xl p-4 text-sm mb-5 border-2 flex items-center gap-3"
                    style={{ background: 'rgba(14,165,233,0.04)', borderColor: 'rgba(14,165,233,0.1)', color: '#0369a1' }}>
                    <div className="w-4 h-4 border-2 border-sky-200 border-t-sky-500 rounded-full animate-spin flex-shrink-0" />
                    <span>Validating recovery session...</span>
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl p-4 text-sm mb-5 border-2 flex items-start gap-3"
                    style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                    <span className="text-red-400 mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-5">
                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 outline-none transition duration-300 text-sm font-medium"
                        style={{ background: 'rgba(255,255,255,0.6)', borderColor: 'rgba(226,232,240,0.8)', color: '#0f172a' }}
                        onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 4px rgba(14,165,233,0.1)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'rgba(226,232,240,0.8)'; e.target.style.boxShadow = 'none'; }}
                        placeholder="Min 8 characters"
                      />
                      <button type="button" onClick={toggleShowPassword} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#94a3b8' }}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {password && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                          <div className="h-full rounded-full transition duration-500"
                            style={{ width: strength.width, background: strength.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: strength.color }}>{strength.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-11 pr-12 py-3.5 rounded-2xl border-2 outline-none transition duration-300 text-sm font-medium"
                        style={{ 
                          background: 'rgba(255,255,255,0.6)', 
                          borderColor: confirmPassword && confirmPassword === password ? 'rgba(16,185,129,0.5)' : 'rgba(226,232,240,0.8)', 
                          color: '#0f172a' 
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 4px rgba(14,165,233,0.1)'; }}
                        onBlur={(e) => { 
                          e.target.style.borderColor = confirmPassword && confirmPassword === password ? 'rgba(16,185,129,0.5)' : 'rgba(226,232,240,0.8)'; 
                          e.target.style.boxShadow = 'none'; 
                        }}
                        placeholder="Must match exactly"
                      />
                      <button type="button" onClick={toggleShowConfirm} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: '#94a3b8' }}>
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-xs font-bold flex items-center gap-1" style={{ color: '#10b981' }}>
                        <CheckCircle2 size={12} /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword || !sessionReady}
                    className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                    style={{ 
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', 
                      boxShadow: loading ? 'none' : '0 10px 25px rgba(14,165,233,0.3)' 
                    }}>
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Securing...
                      </>
                    ) : (
                      'Save New Passkey'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.3)' }}>
            <p className="text-[10px] font-medium tracking-normal" style={{ color: '#64748b' }}>
              Built with ❤️ by Team Genesis
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
