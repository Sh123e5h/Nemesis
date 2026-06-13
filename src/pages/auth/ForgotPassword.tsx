import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, Shield, Sparkles } from 'lucide-react';
import SEO from '../../components/SEO';
import { mailer } from '../../lib/mailer';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      await mailer.sendPasswordReset(email.trim(), redirectUrl);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleBackToLogin = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden lg:font-auth-modern"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #e0f2fe 100%)' }}>
      <SEO 
        title="Reset Password | Nemesis" 
        description="Securely recover your account credentials via our high-priority recovery terminal to regain access."
      />
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #2563eb 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse' }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite 2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main card */}
        <div className="rounded-[32px] border-2 border-white/80 overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' }}>
          
          {/* Header */}
          <div className="flex items-center justify-center gap-4 pt-8 pb-4 px-8">
            <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/logo.png" 
              alt="" className="w-14 h-14" style={{ filter: 'drop-shadow(0 8px 12px rgba(14,165,233,0.15))' }} />
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: '#0ea5e9', letterSpacing: '-0.05em' }}>NEMESIS</h1>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.3em]" style={{ color: '#64748b' }}>Credential Recovery</p>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8 pt-4">
            {/* Back button */}
            <button onClick={handleBackToLogin} 
              className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition duration-200 hover:gap-2.5 group"
              style={{ color: '#64748b' }}>
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
              <span className="group-hover:text-sky-500 transition-colors">Back to Login</span>
            </button>

            {/* Shield icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-white"
                style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', boxShadow: '0 8px 24px rgba(14,165,233,0.15)' }}>
                <Shield size={28} style={{ color: '#0ea5e9' }} />
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-center mb-2" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
              Password Recovery
            </h2>
            <p className="text-center text-sm mb-7" style={{ color: '#64748b', lineHeight: 1.6 }}>
              Enter your email and we'll dispatch a secure recovery link to restore access to your node.
            </p>

            {error && (
              <div className="rounded-2xl p-4 text-sm mb-5 border-2 flex items-start gap-3"
                style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                <span className="text-red-400 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="rounded-2xl p-6 border-2 text-center"
                style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.1)' }}>
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', boxShadow: '0 6px 20px rgba(16,185,129,0.2)' }}>
                  <Mail size={24} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-extrabold mb-2" style={{ color: '#065f46' }}>Recovery Link Dispatched</h3>
                <p className="text-sm" style={{ color: '#047857', lineHeight: 1.6 }}>
                  A secure reset link has been sent to <strong className="font-bold">{email}</strong>. Check your inbox and follow the instructions.
                </p>
                <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                    <Sparkles size={12} className="inline mr-1 text-emerald-400" />
                    Don't forget to check your spam folder
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 outline-none transition duration-300 text-sm font-medium"
                      style={{ 
                        background: 'rgba(255,255,255,0.6)', 
                        borderColor: 'rgba(226,232,240,0.8)',
                        color: '#0f172a'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 4px rgba(14,165,233,0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(226,232,240,0.8)'; e.target.style.boxShadow = 'none'; }}
                      placeholder="support@nemesiss.in"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ 
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', 
                    boxShadow: loading ? 'none' : '0 10px 25px rgba(14,165,233,0.3)' 
                  }}>
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      Send Recovery Link <Send size={16} />
                    </>
                  )}
                </button>
              </form>
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
