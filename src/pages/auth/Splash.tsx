import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function Splash() {
  const { session, initialized } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialized) {
      const timer = setTimeout(() => {
        if (session) {
          navigate('/home', { replace: true });
        } else {
          // If no session, go to landing or welcome
          navigate('/', { replace: true });
        }
      }, 1000); // 1s for the premium experience to sink in
      return () => clearTimeout(timer);
    }
  }, [initialized, session, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 items-center justify-center relative overflow-hidden">
      {/* 🔮 PREMIUM MESH BACKGROUND (Animated GPU Blobs) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 dark:bg-sky-900/20 blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 dark:bg-indigo-900/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* 🚀 ELITE PAYLOADER CARD */}
        <div 
          className="glass-premium p-10 md:p-12 rounded-[3rem] border border-white/40 dark:border-white/10 flex flex-col items-center shadow-2xl shadow-sky-500/10"
          style={{ animation: 'splashEntry 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        >
          {/* LOGO CONTAINER WITH BREATHING GLOW */}
          <div className="relative mb-8">
            {/* Energy Aura */}
            <div className="absolute inset-[-10px] bg-gradient-to-tr from-sky-400 to-indigo-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />
            
            <div className="relative w-20 h-20 bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 shadow-xl border border-white/50 dark:border-white/10 flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.svg" 
                alt="Nemesis" 
                width={64} 
                height={64} 
                className="w-full h-full relative z-10 drop-shadow-sm" 
                fetchPriority="high" 
              />
              {/* Internal Shimmer */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
              Nemesis
            </h1>
            <p className="text-sky-500 dark:text-sky-400 text-[10px] font-black tracking-[0.3em] uppercase">
              Elite Academic Hub
            </p>
          </div>

          <div className="mt-12 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" style={{ animation: 'dotJump 1s infinite' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" style={{ animation: 'dotJump 1s infinite 0.2s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" style={{ animation: 'dotJump 1s infinite 0.4s' }}></div>
          </div>
        </div>
      </div>

      {/* Mandatory Legal Footer */}
      <footer className="absolute bottom-10 w-full flex flex-col items-center gap-6 opacity-0" style={{ animation: 'fadeInUp 0.8s ease-out 0.4s forwards' }}>
        <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          <a href="/terms" className="hover:text-sky-500 transition-colors">Terms</a>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a href="/privacy" className="hover:text-sky-500 transition-colors">Privacy</a>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <a href="mailto:support@nemesiss.in" className="hover:text-sky-500 transition-colors">Support</a>
        </div>
      </footer>

      <style>{`
        @keyframes splashEntry {
          from { opacity: 0; transform: scale(0.9) translateY(20px); filter: blur(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes dotJump {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

