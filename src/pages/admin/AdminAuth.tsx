import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, Fingerprint } from 'lucide-react';

/** Hashes a password using SHA-256 with salt and system-wide pepper. */
async function hashPassword(plain: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  // Salting with email + a hardcoded pepper for extra security
  const data = encoder.encode(plain + salt + "nemesis_2026_pepper_v1");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function AdminAuth() {
  // Call all hooks unconditionally at the top
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'setup' | 'loading'>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const checkFirstRun = useCallback(async () => {
    try {
      const { data: isEmpty, error } = await supabase.rpc('is_admin_users_empty');
      if (!error && isEmpty === true) {
        setMode('setup');
      } else {
        setMode('login');
      }
    } catch (err) {
      console.error("Critical: Failed to verify system initialization state:", err);
      setMode('login'); // Default to login on error for security
    }
  }, []);

  useEffect(() => {
    checkFirstRun();
  }, [checkFirstRun]);

  const handleAction = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const passwordHash = await hashPassword(password, email);

      if (mode === 'setup') {
        const { data, error: insertError } = await supabase
          .rpc('setup_admin_user', { p_email: email, p_password_hash: passwordHash });
        
        if (insertError) {
          console.error('[AdminAuth] Setup error:', insertError);
          setError(insertError.message || 'Failed to initialize admin account');
          setLoading(false);
          return;
        }
        
        if (!data) {
          console.error('[AdminAuth] Setup returned no data');
          setError('Failed to initialize admin account: no response from server');
          setLoading(false);
          return;
        }

        const newAdminId = data as string;
        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('adminId', newAdminId);
        
        // Non-blocking audit log - don't let it prevent successful login
        try {
          await supabase.from('audit_logs').insert({ 
            admin_id: newAdminId, 
            action: 'ADMIN_SETUP', 
            target_type: 'system' 
          });
        } catch (auditErr) {
          console.warn('[AdminAuth] Audit log failed (non-blocking):', auditErr);
        }
        
        navigate('/admin/dashboard');
      } else {
        const { data, error: fetchError } = await supabase
          .rpc('verify_admin_password', { p_email: email, p_hash: passwordHash })
          .maybeSingle(); // Assumes the RPC returns a single row if matched
        
        if (fetchError) {
          console.error('[AdminAuth] Verify error:', fetchError);
          setError(fetchError.message || 'Authentication server error');
          setLoading(false);
          return;
        }

        if (!data) {
          console.warn('[AdminAuth] No matching admin found for:', email);
          setError("Invalid admin credentials");
          setLoading(false);
          return;
        }

        const adminId = (data as any).id;
        if (!adminId) {
          console.error('[AdminAuth] Admin data missing ID:', data);
          setError("Invalid admin credentials");
          setLoading(false);
          return;
        }

        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('adminId', adminId);
        
        // Non-blocking audit log - don't let it prevent successful login
        try {
          await supabase.from('audit_logs').insert({ 
            admin_id: adminId, 
            action: 'ADMIN_LOGIN', 
            target_type: 'system' 
          });
        } catch (auditErr) {
          console.warn('[AdminAuth] Audit log failed (non-blocking):', auditErr);
        }

        console.log('[AdminAuth] Login successful, navigating to dashboard');
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('[AdminAuth] Unexpected error:', err);
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  }, [email, password, mode, navigate]);


  if (mode === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-6 h-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin"></div>
          Initializing secure gateway...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <img src="/logo.svg" alt="Nemesis" className="w-14 h-14 pointer-events-none" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Nemesis <span className="text-sky-600">Command Center</span></h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Secure Administrative Gateway</p>
        </div>

        {/* Light Glassmorphism card */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/80 rounded-3xl shadow-2xl shadow-slate-200/50 p-8 relative overflow-hidden group">
          {/* Shine effect */}
          <div className="absolute -inset-x-full top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] group-hover:inset-x-full transition duration-1000" />

          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <Fingerprint size={18} className="text-sky-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'setup' ? 'First-Time Setup' : 'Admin Authentication'}
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium flex items-center gap-2 animate-shake">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleAction} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-[10px]">Admin Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition"
                  placeholder="support@nemesiss.in"
                  value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-[10px]">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"} required minLength={8}
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-none transition"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-3.5 rounded-xl hover:bg-sky-600 transition duration-300 disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Securing...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  {mode === 'setup' ? 'Initialize System' : 'Unlock Control Panel'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-slate-400 text-[10px] tracking-widest uppercase font-bold">Nemesis Platform • Firewall v1.0.4</p>
          <p className="text-slate-300 text-[9px] uppercase tracking-tighter">Unauthorized access is monitored and strictly prohibited</p>
        </div>
      </div>
    </div>
  );
}
