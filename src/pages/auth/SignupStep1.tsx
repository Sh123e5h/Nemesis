import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getOAuthRedirectUrl, setOAuthIntent, markAuthCallbackPending } from '../../lib/authRedirect';
import { useAuthStore } from '../../store/useAuthStore';
import { tokenManager } from '../../lib/tokenManager';
import { Eye, EyeOff, ChevronDown, X, Check, AtSign, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../../components/SEO';

const QUOTES = [
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-4.0.3&auto=format&fit=crop&w=2073&q=80" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", image: "https://images.unsplash.com/photo-1513258496099-48168024aec0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" }
];

type LegalModalProps = { title: string; content: string; onClose: () => void };

function LegalModal({ title, content, onClose }: LegalModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[min(88dvh,100%)] sm:rounded-[2rem] rounded-t-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 ease-out border border-slate-200 sm:border">
        <div className="px-4 sm:px-8 py-3 sm:py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 shrink-0 gap-3">
          <div>
            <h3 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{title}</h3>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mt-0.5 sm:mt-1">Nemesis Official Documentation</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 sm:p-3 hover:bg-white rounded-xl sm:rounded-2xl transition shadow-sm border border-transparent hover:border-slate-100 group active:scale-90">
            <X size={18} className="text-slate-400 group-hover:text-slate-900" />
          </button>
        </div>
        <div className="p-3 sm:p-8 md:p-10 flex-1 min-h-0 overflow-y-auto text-slate-800 text-xs sm:text-base leading-relaxed space-y-3 sm:space-y-6 custom-scrollbar bg-white">
          <div className="bg-sky-50 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-sky-100 text-xs sm:text-sm font-semibold text-sky-800 mb-3 sm:mb-8 flex items-center justify-between shadow-sm">
            <span>Effective Date: April 10, 2026</span>
            <span className="bg-sky-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px]">V 2.2.0</span>
          </div>
          {content.split('\n\n').map((para, i) => {
            if (para.startsWith('###')) {
              return <h4 key={i} className="text-slate-900 font-black text-sm sm:text-lg mt-4 sm:mt-10 mb-1.5 sm:mb-4 border-l-4 border-sky-500 pl-3 sm:pl-4 uppercase tracking-tight">{para.replace('### ', '')}</h4>;
            }
            return <p key={i} className="text-slate-700 leading-6 sm:leading-8 font-medium text-[11px] sm:text-base">{para}</p>;
          })}
          <div className="pt-4 sm:pt-12 border-t border-slate-100 text-[9px] sm:text-[11px] text-slate-400 text-center uppercase tracking-[0.3em] font-black">
            End of Official Document
          </div>
        </div>
        <div className="px-4 py-3 sm:p-8 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-center gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-8">
          <Link 
            to={title === "Terms of Service" ? "/terms" : "/privacy"}
            className="text-[10px] sm:text-xs font-bold text-sky-500 hover:text-sky-600 uppercase tracking-widest order-2 sm:order-1"
          >
            Read Full Version
          </Link>
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 sm:px-12 py-2.5 sm:py-3 bg-slate-900 text-white text-xs sm:text-base rounded-xl sm:rounded-2xl font-bold hover:bg-black transition shadow-xl shadow-slate-200 active:scale-95 order-1 sm:order-2">
            Accept &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SignupStep1() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthErrorMessage = searchParams.get('error');

  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(oauthErrorMessage === 'missing_permissions' ? 'missing_permissions' : '');

  // CLEANUP: LocalStorage hints for previous versions
  useEffect(() => {
    localStorage.removeItem('drive_scopes_valid');
  }, []);

  // Form states
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTOS, setShowTOS] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [isDobOpen, setIsDobOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(2000);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Username validation logic
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      if (!/^[a-z][a-z0-9_]*$/.test(username)) {
        setUsernameAvailable(false);
        return;
      }

      setCheckingUsername(true);
      // RLS prevents anonymous users from directly querying the profiles table.
      // We use the execute_readonly_query RPC to safely verify uniqueness.
      const { data, error } = await supabase.rpc('execute_readonly_query', {
        sql_query: `SELECT username FROM profiles WHERE username = '${username}'`
      });
      
      setCheckingUsername(false);
      if (error) {
        console.error("Username check error:", error);
        setUsernameAvailable(null); // Default to neutral on error
      } else {
        // If data array is empty, the username is available
        setUsernameAvailable(Array.isArray(data) && data.length === 0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleHybridSignup = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const isLocalFilled = !!(username || dob || password);

    // If any local field is started, validate everything for a high-integrity hybrid signup
    if (isLocalFilled) {
      if (!usernameAvailable) return setError('Please choose a valid & available username.');
      if (!dob) return setError('Please select your Date of Birth.');
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (password !== confirmPassword) return setError('Passwords do not match.');
      if (!termsAccepted) return setError('You must agree to the Terms of Service to continue.');
    } else {
      // Pure Social Signup — No local fields, but still need TOS
      if (!termsAccepted) return setError('Please accept the Terms of Service to continue.');
    }

    setLoading(true);
    setOAuthIntent('signup');

    // Cache profile for hybrid completion if fields were provided
    if (isLocalFilled) {
      const pendingProfile = { username, dob, gender, password };
      localStorage.setItem('pending_signup_profile', JSON.stringify(pendingProfile));
    } else {
      localStorage.removeItem('pending_signup_profile');
    }

    try {
      // ⚡ NATIVE GOOGLE SIGN-IN LOGIC
      if ((window as any).plugins && (window as any).plugins.googleplus) {
        console.log('[NativeAuth] Starting native Google login');
        const googleUser = await new Promise<any>((resolve, reject) => {
          (window as any).plugins.googleplus.login(
            {
              'webClientId': '151394384403-g9hcdcuv01rupiljqlbbn483epdpvm1g.apps.googleusercontent.com',
              'offline': true,
              'scopes': 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata'
            },
            resolve,
            reject
          );
        });

        console.log('[NativeAuth] Google user received:', googleUser?.email);

        if (!googleUser.idToken) {
          throw new Error('No identity token received from Google Play Services.');
        }

        const { data, error: authError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.idToken,
        });

        if (authError) {
          console.error('[NativeAuth] Supabase exchange error:', authError);
          throw authError;
        }

        if (data.session) {
          console.log('[NativeAuth] Session established');

          // Seed token manager with the native access token for scope verification in Step 2
          if (googleUser.accessToken) {
            tokenManager.setAccessToken(googleUser.accessToken);
          }

          markAuthCallbackPending();
          await useAuthStore.getState().setSession(data.session);

          // Use navigate instead of window.location.href to preserve SPA state and session
          navigate('/signup/username', { replace: true });
        }
      } else {
        // Fallback to browser-based OAuth
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getOAuthRedirectUrl('/signup/username'),
            scopes: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
              include_granted_scopes: 'true',
            },
          }
        });

        if (oauthError) throw oauthError;
      }
    } catch (err: any) {
      console.error('[NativeAuth] Final catch error:', err);
      const errorMsg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
      setError(errorMsg || 'Google Registration failed');
      setLoading(false);
    }
  }, [username, dob, gender, password, confirmPassword, termsAccepted, usernameAvailable, navigate]);



  return (
    <div className="flex h-[100dvh] overflow-hidden lg:min-h-screen lg:overflow-x-hidden min-w-0 w-full max-w-full">
      <SEO 
        title="Join Nemesis" 
        description="Register to unlock zero-latency collaboration and AI-enhanced productivity tools for your academic journey."
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
        </div>
      </div>

      <div className="w-full min-w-0 lg:w-1/2 bg-gradient-to-br from-sky-200/50 via-indigo-100/40 to-violet-200/45 lg:bg-slate-50 lg:overflow-y-auto flex flex-col items-center justify-center h-full lg:min-h-[100dvh] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:py-8 px-4 lg:font-auth-modern relative">
        <div className="w-full max-w-md bg-white p-6 sm:p-8 md:p-10 rounded-3xl shadow-xl border border-sky-100 shrink-0 my-auto">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-1.5">
            <img src="/logo.svg" alt="Nemesis Logo" className="w-10 h-10" />
            <span className="text-2xl font-black tracking-tight text-sky-500 uppercase tracking-[0.1em]">Nemesis</span>
          </div>
          <div className="text-center mb-3 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 mb-0.5 sm:mb-2">Create Account</h2>
            <p className="text-slate-500 text-[11px] sm:text-sm">One more step to your secure workspace.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 sm:p-4 rounded-2xl mb-4 sm:mb-6 text-xs sm:text-sm font-bold border shadow-sm flex items-start gap-3 ${
                  error === 'missing_permissions' 
                    ? 'bg-amber-50 text-amber-700 border-amber-200' 
                    : 'bg-red-50 text-red-500 border-red-200 animate-shake'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${error === 'missing_permissions' ? 'bg-amber-200/50' : 'bg-red-200/50'}`}>
                  <AlertTriangle size={16} />
                </div>
                <div className="space-y-1">
                  <p className="leading-tight">
                    {error === 'missing_permissions' 
                      ? 'Drive Permissions Required' 
                      : 'Registration Error'}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-medium opacity-90 leading-relaxed">
                    {error === 'missing_permissions' 
                      ? 'To enable workspace syncing, you MUST check all boxes on the Google consent screen. Please click "Sign up with Google" again and grant all requested permissions.'
                      : error}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleHybridSignup} className="space-y-2.5 sm:space-y-4 auth-form">
            {/* Username Field */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Username Identity</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors duration-300 z-10 pointer-events-none">
                  <AtSign size={15} strokeWidth={2.5} />
                </div>
                <input 
                  type="text" maxLength={20} required
                  autoComplete="username"
                  placeholder="nexus"
                  className={`w-full py-2 sm:py-3.5 pl-9 pr-9 border-2 rounded-xl text-sm focus:outline-none transition bg-white font-bold tracking-wide ${
                    usernameAvailable === true ? 'border-green-500 ring-4 ring-green-500/10' :
                    usernameAvailable === false ? 'border-red-500 ring-4 ring-red-500/10' : 
                    'border-slate-100 group-hover:border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 shadow-sm'
                  }`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-3 w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <Check className="absolute right-3 top-3 text-green-500 animate-in zoom-in duration-300" size={18} strokeWidth={3} />
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <X className="absolute right-3 top-3 text-red-500 animate-in zoom-in duration-300" size={18} strokeWidth={3} />
                )}
              </div>
              {usernameAvailable === false && (
                <p className="text-[10px] text-red-500 mt-1.5 font-bold ml-1 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full" />
                  Username unavailable or restricted
                </p>
              )}
              {usernameAvailable === true && (
                <p className="text-[10px] text-green-600 mt-1.5 font-bold ml-1 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full" />
                  Uplink name available
                </p>
              )}
            </div>

            {/* DOB & Gender Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Birthday</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDobOpen(!isDobOpen)}
                    className="w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50/50 text-xs text-slate-800 flex items-center justify-between"
                  >
                    <span>{dob ? new Date(dob).toLocaleDateString() : 'Select Date'}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDobOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDobOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-72 bg-[#ffffff] border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] p-4 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 ease-out">
                      <div className="flex gap-2 mb-4 font-bold text-slate-800">
                        <select 
                          className="flex-1 p-2 bg-slate-50 border-none rounded-xl text-xs cursor-pointer hover:bg-slate-100 transition" 
                          value={calYear} 
                          onChange={e => setCalYear(parseInt(e.target.value))}
                        >
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select 
                          className="flex-1 p-2 bg-slate-50 border-none rounded-xl text-xs cursor-pointer hover:bg-slate-100 transition" 
                          value={calMonth} 
                          onChange={e => setCalMonth(parseInt(e.target.value))}
                        >
                          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                          <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 42 }).map((_, i) => {
                          const firstDay = new Date(calYear, calMonth, 1).getDay();
                          const date = i + 1 - firstDay;
                          const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
                          if (date <= 0 || date > totalDays) return <div key={i} className="h-8" />;
                          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                          const isSelected = dob === dateStr;
                          return (
                            <div 
                              key={i} 
                              onClick={() => { setDob(dateStr); setIsDobOpen(false); }} 
                              className={`h-8 flex items-center justify-center text-[11px] rounded-lg cursor-pointer transition duration-200 ${
                                isSelected 
                                  ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-200 scale-110' 
                                  : 'text-slate-600 hover:bg-sky-50 hover:text-sky-600 font-medium'
                              }`}
                            >
                              {date}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 ml-1">Gender</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGenderOpen(!isGenderOpen)}
                    className="w-full p-2 border-2 border-slate-100 rounded-xl bg-slate-50/50 text-xs text-slate-800 flex items-center justify-between"
                  >
                    <span className="truncate">{gender}</span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isGenderOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGenderOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#ffffff] border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[100] overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200 ease-out">
                      {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                        <div key={g} onClick={() => { setGender(g); setIsGenderOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-sky-50 transition ${gender === g ? 'text-sky-600 font-bold bg-sky-50/50' : 'text-slate-600'}`}>
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 mb-0.5 ml-1">Create Local Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required minLength={8} placeholder="New Password"
                  autoComplete="new-password"
                  className="w-full p-2 pr-10 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 bg-slate-50/50 transition focus:outline-none text-xs sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 transition" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input 
                type="password" required minLength={8} placeholder="Confirm Password"
                autoComplete="new-password"
                className="w-full p-2 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 bg-slate-50/50 transition focus:outline-none text-xs sm:text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* TOS Checkbox */}
            <div className="flex items-start gap-2.5 p-1.5 bg-slate-50/50 rounded-xl border border-slate-100/50">
              <div className="relative flex items-center justify-center h-4 w-4 mt-0.5 shrink-0">
                <input 
                  type="checkbox" required
                  id="tos"
                  className="peer absolute inset-0 opacity-0 cursor-pointer z-10"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <div
                  className={`legal-checkbox-visual h-full w-full rounded border-2 transition flex items-center justify-center ${
                    termsAccepted ? 'legal-checkbox-visual--checked' : ''
                  }`}
                >
                  {termsAccepted && <Check className="h-2.5 w-2.5 text-white animate-in zoom-in-50 duration-200" strokeWidth={4} />}
                </div>
              </div>
              <label htmlFor="tos" className="text-[10px] sm:text-xs text-slate-500 cursor-pointer select-none leading-relaxed">
                I agree to the <button type="button" onClick={(e) => { e.preventDefault(); setShowTOS(true); }} className="text-sky-500 font-bold underline hover:text-sky-600">Terms of Service</button> and acknowledge the <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="text-sky-500 font-bold underline hover:text-sky-600">Privacy Policy</button>.
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 sm:gap-4 bg-slate-900 text-white font-black p-2.5 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-black transition-all shadow-[0_20px_40px_-15px_rgba(15,23,42,0.3)] active:scale-[0.98] disabled:opacity-50 text-xs sm:text-base mt-2 relative overflow-hidden group border border-slate-800"
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" 
                className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm" 
                alt="Google" 
              />
              <span className="relative z-10 uppercase tracking-[0.05em]">{loading ? 'Calibrating Uplink...' : 'Signup with Google'}</span>
              {loading && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
          </form>

          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-3xl animate-in fade-in duration-300">
              <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Securing Uplink...</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 sm:mt-8 sm:pt-6 border-t border-slate-100 text-center text-[11px] sm:text-sm text-slate-500">
            Already have an account? <Link to="/login" className="text-sky-500 hover:text-sky-600 transition underline-offset-4 hover:underline">Log in here</Link>
          </div>

          <div className="mt-2 sm:mt-10 text-center">
            <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 tracking-normal">
              Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTOS && (
        <LegalModal 
          title="Terms of Service" 
          content={`### 1. ACCEPTANCE OF TERMS\n\nBy accessing or using the Nemesis platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, users, and others who access or use the Service.\n\n### 2. USER ACCOUNTS & REGISTRATION\n\nTo access most features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to keep your password confidential. You are responsible for all use of your account.\n\n### 3. GOOGLE DRIVE™ & DATA INTEGRATION\n\nNemesis provides integration with Google Drive™ to facilitate its core functionality. By enabling this feature, you grant us permission to access specific 'drive.file' and 'drive.appdata' scopes. You retain full ownership of your data. Our access is strictly limited to managing Nemesis-specific files and configuration data.\n\n### 4. INTELLECTUAL PROPERTY\n\nThe Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Nemesis and its licensors. Our trademarks and trade dress may not be used without prior written consent.\n\n### 5. LIMITATION OF LIABILITY\n\nIN NO EVENT WILL NEMESIS OR ITS DIRECTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES RESULTING FROM YOUR ACCESS TO OR USE OF THE SERVICE.\n\n### 6. TERMINATION\n\nWe may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including breach of the Terms.`}
          onClose={() => setShowTOS(false)}
        />
      )}
      {showPrivacy && (
        <LegalModal 
          title="Privacy Policy" 
          content={`### 1. DATA WE COLLECT\n\nWe collect information you provide directly to us, such as your username, email address, password, date of birth, and gender. We also collect usage data to improve your synchronization experience and optimize platform performance.\n\n### 2. GOOGLE DRIVE™ SYNC & PERMISSIONS\n\nOur platform uses Google Drive™ for secure cloud storage. We specifically request access to 'drive.file' (files created by Nemesis) and 'drive.appdata' (configuration). We do not access, view, or modify any other files in your Google Drive without your explicit action.\n\nNemesis's use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.\n\n### 3. THIRD-PARTY SERVICES\n\nWe utilize industry-leading third-party services to ensure stability and security. This includes Supabase (Database & Authentication) and Google (Cloud Storage). These partners are only authorized to use your data to maintain the specific services they provide.\n\n### 4. DATA SECURITY & ENCRYPTION\n\nAll data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols. Profile information, synchronization tokens, and sensitive account data are protected by multiple layers of encryption.\n\n### 5. YOUR RIGHTS & DATA DELETION\n\nYou have the right to access, correct, or delete your personal data at any time. Through the app settings, you can initiate a 'Full Reset' which permanently wipes your profile, sync data, and files from our database and cloud storage.`}
          onClose={() => setShowPrivacy(false)}
        />
      )}
    </div>
  );
}
