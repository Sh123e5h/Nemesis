import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { RefreshCw, ShieldAlert, Clock } from 'lucide-react';
import { lazyWithRetry as lazy } from '../lib/lazyWithRetry';
const LiveBackground = lazy(() => import('../components/LiveBackground'), 'LiveBackground');

interface MaintenanceConfig {
  enabled: boolean;
  expires_at?: string;
}

const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .maybeSingle();

        if (error) throw error;

        if (data?.value) {
          let val: MaintenanceConfig;
          try {
            val = typeof data.value === 'string' ? JSON.parse(data.value) : (data.value as MaintenanceConfig);
            if (!val || typeof val !== 'object') throw new Error('Invalid structure');
          } catch (err) {
            console.error('[Maintenance] Config parse error:', err);
            setLoading(false);
            return;
          }
          
          if (!val.enabled) {
            navigate('/');
            return;
          }
          
          if (val.expires_at) {
            const updateTime = () => {
              const expiryDate = new Date(val.expires_at!);
              if (isNaN(expiryDate.getTime())) {
                setTimeLeft(null);
                return;
              }
              const remaining = expiryDate.getTime() - Date.now();

              if (remaining <= 0) {
                window.location.reload();
              } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${mins}m ${secs}s`);
              }
            };
            updateTime();
            const timer = setInterval(updateTime, 1000);
            return () => clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('[Maintenance] Sync failure:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenance();
    const sub = supabase.channel('system_settings').on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.maintenance_mode' }, () => {
      fetchMaintenance();
    }).subscribe();

    return () => { sub.unsubscribe(); };
  }, [navigate]);

  if (loading && !timeLeft) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><RefreshCw className="animate-spin text-sky-500" /></div>;

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans bg-slate-50">
      <Suspense fallback={null}>
        <LiveBackground />
      </Suspense>


      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Branding / Icon Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
             {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-sky-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-xl rotate-3 transform hover:rotate-0 transition-transform duration-500">
              <img src="/logo.svg" alt="Nemesis" className="w-16 h-16 pointer-events-none" />
            </div>
            
            {/* Small floating utility icon */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <ShieldAlert size={18} className="text-amber-500" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
              System <span className="text-sky-600">Lockdown</span>
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              <span className="text-sky-600/60 text-xs font-bold uppercase tracking-[0.2em]">Maintenance in Progress</span>
            </div>
          </div>
        </div>

        {/* Glassmorphism Content Card (Light) */}
        <div className="backdrop-blur-xl bg-white/60 border border-white/80 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 text-center relative group overflow-hidden">
          {/* Subtle shine effect */}
          <div className="absolute -inset-x-full top-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] group-hover:inset-x-full transition duration-1000" />

          <p className="text-slate-600 text-lg leading-relaxed mb-8">
            We're currently performing essential upgrades to the <span className="text-slate-900 font-bold">Nemesis</span> infrastructure. Standard access is temporarily paused while we optimize your environment.
          </p>

          {/* Progress / Info Pills */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50/50 border border-white rounded-2xl p-4 transition-colors hover:bg-white/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Clock size={14} /> {timeLeft ? 'Remaining Time' : 'Expected Duration'}
              </div>
              <div className="text-slate-900 font-bold">{timeLeft || '~15-30 Mins'}</div>
            </div>
            <div className="bg-slate-50/50 border border-white rounded-2xl p-4 transition-colors hover:bg-white/80">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <RefreshCw size={14} /> Auto-Refresh
              </div>
              <div className="text-slate-900 font-bold">Enabled</div>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-sky-600 transition duration-300 shadow-xl shadow-sky-900/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            Check Status Now
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-400 text-xs mt-8 tracking-widest uppercase font-medium">
          Nemesis Administrative Firewall • v1.0.4
        </p>
      </div>
    </div>
  );
};

export default Maintenance;
