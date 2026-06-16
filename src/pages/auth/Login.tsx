import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../../components/SEO';
import { useAuthStore } from '../../store/useAuthStore';
import { syncEngine } from '../../lib/SyncEngine';
import { profileNeedsSignupCompletion } from '../../lib/authRedirect';

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2073&q=80" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", image: "https://images.unsplash.com/photo-1513258496099-48168024aec0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "The function of education is to teach one to think intensively and to think critically. Intelligence plus character – that is the goal of true education.", author: "Dr. Martin Luther King, Jr.", image: "https://images.unsplash.com/photo-1561089489-f13d5e730d72?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Education is the ability to listen to almost anything without losing your temper or your self-confidence.", author: "Robert Frost", image: "https://images.unsplash.com/photo-1453733190371-0a9bedd82893?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Intellectual growth should commence at birth and cease only at death.", author: "Albert Einstein", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.", author: "Aristotle", image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },  
  { text: "The illiterate of the future will not be the person who cannot read. It will be the person who does not know how to learn", author: "Alvin Toffler", image: "https://images.unsplash.com/photo-1462536943532-57a629f6cc60?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Why should society feel responsible only for the education of children, and not for the education of all adults of every age?", author: "Erich Fromm", image: "https://images.unsplash.com/photo-1462536943532-57a629f6cc60?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "An education isn't how much you have committed to memory, or even how much you know. It's being able to differentiate between what you know and what you don't know.", author: "Anatole France", image: "https://images.unsplash.com/photo-1477281765962-ef34e8bb0967?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Education is a better safeguard of liberty than a standing army.", author: "Edward Everett", image: "https://images.unsplash.com/photo-1635424239131-32dc44986b56?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" }
];

export default function Login() {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState('');
  const navigate = useNavigate();

  // Prefetch the Home page
  useEffect(() => {
    import('../Home').catch(() => {});
  }, []);

  // ⚡ BACKGROUND PRE-FETCH: Fetch identity hint while user is typing
  useEffect(() => {
    const input = email.trim().toLowerCase();
    if (input.length < 3) return;

    const timer = setTimeout(async () => {
      const cacheKey = `nemesis_id_hint_${input}`;
      if (localStorage.getItem(cacheKey)) return;

      console.log('[Login] Pre-fetching identity hint for:', input);
      supabase.rpc('get_auth_hint', { lookup_val: input }).maybeSingle().then(({ data }) => {
        if (data) {
          localStorage.setItem(cacheKey, JSON.stringify({
            email: (data as any).email,
            expiry: Date.now() + 30 * 24 * 60 * 60 * 1000
          }));
        }
      });
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [email]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLoginStep('Preparing security handshake...');

    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError('The authentication server is taking too long. This might be a network issue. Please check your internet or try again later.');
      setLoginStep('');
    }, 60000); // ⚡ Increased to 60s for Disk IO crisis

    // Also show a "Slow connection" notice after 10s to keep user informed
    const slowHandle = setTimeout(() => {
      if (!timedOut) {
        setLoginStep('Connection is slow... still trying');
      }
    }, 10000);

    try {
      const input = email.trim().toLowerCase();
      const isEmailInput = input.includes('@');
      setLoginStep('Handshaking...');

      // Get identity hint
      const cacheKey = `nemesis_id_hint_${input}`;
      let targetEmail: string | null = null;

      const cachedHintStr = localStorage.getItem(cacheKey);
      if (cachedHintStr) {
        try {
          const cachedHint = JSON.parse(cachedHintStr);
          if (cachedHint.expiry > Date.now()) {
            targetEmail = cachedHint.email;
          }
        } catch { /* invalid cache */ }
      }

      setLoginStep('Verifying identity...');
      
      const persistentCache = localStorage.getItem(cacheKey);
      
      let preAuthResult;
      if (persistentCache) {
        console.log('[Login] Using persistent identity cache:', input);
        const cached = JSON.parse(persistentCache);
        preAuthResult = { data: cached, error: null };
      } else {
        preAuthResult = await Promise.race([
          supabase.rpc('get_auth_hint', { lookup_val: input }).maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000))
        ]).catch(err => {
          if (err.message === 'TIMEOUT') return { data: null, error: { message: 'Identity check timed out' } };
          return { data: null, error: err };
        }) as any;
      }

      const { data: preAuth, error: preAuthError } = preAuthResult;

      if (preAuthError) {
        console.warn('Pre-auth lookup failed:', preAuthError.message);
        if (preAuthError.message === 'Identity check timed out') {
          if (isEmailInput) {
            console.log('[Login] Hint timeout, bypassing for email login');
          } else {
            setError('The identity server is slow. Please use your email address instead of your username for a faster login.');
            setLoading(false);
            setLoginStep('');
            return;
          }
        }
      } else if (preAuth) {
        targetEmail = (preAuth as any).email ?? targetEmail;
        
        localStorage.setItem(cacheKey, JSON.stringify({
          email: targetEmail,
          expiry: Date.now() + 30 * 24 * 60 * 60 * 1000
        }));
      }

      if (!targetEmail && isEmailInput) targetEmail = input;
      if (!targetEmail) throw new Error('Identity not found. Please check your credentials.');

      // Sign in
      setLoginStep('Authenticating...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password
      });

      if (signInError) {
        clearTimeout(timeoutHandle);
        clearTimeout(slowHandle);
        throw signInError;
      }
      if (timedOut) return;
      clearTimeout(timeoutHandle);
      clearTimeout(slowHandle);

      // Complete login
      if (data.session) {
        await useAuthStore.getState().setSession(data.session);
        
        setTimeout(() => {
          syncEngine.initialize().then(() => {
            syncEngine.performSync();
          });
        }, 2000);

        const profile = useAuthStore.getState().profile;
        if (profileNeedsSignupCompletion(profile)) {
          navigate('/signup/username', { replace: true });
        } else if (profile && !profile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/home', { replace: true });
        }
      } else {
        throw new Error('Authentication handshake failed. Please try again.');
      }

    } catch (err: unknown) {
      if (!timedOut) {
        clearTimeout(timeoutHandle);
        const errorMsg = err instanceof Error
          ? err.message
          : (typeof err === 'string' ? err : 'Authentication failed. Please verify your credentials.');
        setError(errorMsg);
        setLoading(false);
        setLoginStep('');
      }
    }
  }, [email, password, navigate]);

  return (
    <div className="flex h-[100dvh] overflow-hidden lg:min-h-screen lg:overflow-x-hidden min-w-0 w-full max-w-full">
      <SEO 
        title="Login | Nemesis" 
        description="Securely access your personal study hub and high-performance collaboration tools on the Nemesis platform."
      />
      {/* Left: Quote Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-cover bg-center transition duration-1000" style={{ backgroundImage: `url('${quote.image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.svg" alt="Nemesis Academic Platform Logo" className="w-14 h-14" />
            <h1 className="text-5xl font-bold tracking-tight text-white">Nemesis</h1>
          </div>
          <blockquote className="text-2xl font-light italic leading-relaxed text-slate-200">
            "{quote.text}"
          </blockquote>
          <p className="mt-4 text-sky-400 font-medium">— {quote.author}</p>
          <div className="mt-12 pt-8 border-t border-white/10 text-slate-400 text-sm leading-relaxed max-w-sm">
            Nemesis is a unified academic ecosystem where students sync materials, collaborate in real-time groups, and optimize their study workflow with precision tools.
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full min-w-0 lg:w-1/2 flex flex-col items-center justify-center h-full lg:min-h-[100dvh] p-4 sm:p-6 bg-gradient-to-br from-sky-200/50 via-indigo-100/40 to-violet-200/45 lg:bg-slate-50 lg:font-auth-modern relative">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-xl border border-sky-100 relative">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-1.5">
            <img src="/logo.svg" alt="Nemesis Logo" className="w-10 h-10" />
            <span className="text-2xl font-black tracking-tight text-sky-500 uppercase tracking-[0.1em]">Nemesis</span>
          </div>
          <div className="text-center mb-3 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-0.5 sm:mb-2">Welcome Back</h2>
            <p className="text-slate-500 text-[11px] sm:text-sm">Continue your high-performance journey.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-xs sm:text-sm border border-red-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <span className="font-bold block mb-0.5">Access Interrupted</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4 auth-form">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Username or Email</label>
              <input
                type="text"
                autoComplete="username"
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 text-sm transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-[11px] sm:text-xs text-sky-500 font-medium hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-slate-50 transition text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 text-white font-semibold p-3 rounded-xl hover:bg-sky-600 transition disabled:opacity-50 mt-2 relative overflow-hidden group shadow-lg shadow-sky-100"
            >
              <div className="relative z-10 flex flex-col items-center">
                <span>{loading ? 'Authenticating...' : 'Log In'}</span>
                {loginStep && <span className="text-[10px] font-medium opacity-80 mt-1 animate-pulse">{loginStep}</span>}
              </div>
              {loading && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
            </button>
          </form>

          {loading && (
            <div className="absolute inset-x-0 bottom-0 top-0 bg-white/40 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
              <div className="bg-white p-4 rounded-full shadow-2xl border border-slate-100 flex items-center gap-3 scale-90 sm:scale-100">
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{loginStep || 'Securing Identity'}</span>
              </div>
            </div>
          )}

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-slate-500">
            Don't have an account? <Link to="/signup" className="text-sky-500 font-medium hover:underline">Sign up</Link>
          </div>
          <div className="mt-2 sm:mt-10 text-center">
            <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 tracking-normal">
              Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
