import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { recordPlatformCrash } from '../lib/supabase';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Set document title manually to avoid dependency on Helmet/Context during crash
    try {
      document.title = 'System Error | Nemesis';
    } catch { /* ignore title errors */ }

    // ⚡ AUTO-RECOVER FROM DYNAMIC IMPORT FAILURES (ChunkLoadErrors)
    const message = error.message;
    const isChunkError = 
      message.includes('Failed to fetch') || 
      message.includes('dynamically imported module') ||
      message.includes('Loading chunk') ||
      message.includes('Load chunk') ||
      error.name === 'ChunkLoadError' ||
      message.includes('NetworkError') ||
      message.includes('Script error') ||
      message.includes('error loading');

    if (isChunkError) {
      const SESSION_KEY = 'nemesis_global_recovery';
      const lastReload = sessionStorage.getItem(SESSION_KEY);
      const now = Date.now();
      
      if (!lastReload || now - parseInt(lastReload, 10) > 60000) {
        sessionStorage.setItem(SESSION_KEY, now.toString());
        console.warn('⚡ [GLOBAL_RECOVERY] System mismatch detected. Refreshing for latest version...');
        
        const url = new URL(window.location.href);
        url.searchParams.set('v_recovery', now.toString());
        
        setTimeout(() => {
          window.location.replace(url.toString());
        }, 800);
      }
    }

    // 🛡️ Shield Layer: Automated Log Storage
    recordPlatformCrash(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50/50 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center overflow-hidden relative font-sans">
          {/* Ambient Background Elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/20 blur-[120px] rounded-full -z-10 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/20 blur-[120px] rounded-full -z-10" />

          <div className="w-16 h-16 bg-white shadow-xl shadow-amber-200/50 rounded-3xl flex items-center justify-center mb-8 text-amber-500 animate-bounce">
            <AlertTriangle size={32} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Unexpected Disruption</h1>
          <p className="text-slate-500 mb-10 max-w-sm mx-auto font-medium leading-relaxed">
            Nemesis encountered a runtime conflict. This usually happens after a system update or a brief synchronization flicker.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs relative z-10 mx-auto">
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="group relative flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition shadow-2xl shadow-slate-900/20 active:scale-95 overflow-hidden w-full cursor-pointer"
            >
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              Soft System Reset
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            <button
              onClick={() => { window.location.href = '/home'; }}
              className="flex items-center justify-center gap-3 bg-white/80 backdrop-blur-xl text-slate-600 px-8 py-4 rounded-2xl font-bold hover:bg-white transition border border-slate-200 active:scale-95 shadow-sm w-full cursor-pointer"
            >
              <Home size={18} />
              Return Home
            </button>
          </div>

          <div className="mt-16 w-full max-w-lg mx-auto">
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/60 p-5 text-left relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Diagnostic Report</p>
                  <p className="text-[11px] text-slate-500 font-medium">Auto-generated for support triage</p>
                </div>
                <button 
                  onClick={() => {
                    const stack = this.state.error?.stack || this.state.error?.message || 'No stack trace';
                    navigator.clipboard.writeText(stack);
                    alert('Diagnostic log copied to clipboard.');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition uppercase tracking-wider cursor-pointer"
                >
                  Copy Log
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-500 bg-slate-50/80 p-3 rounded-xl border border-slate-100/60 break-words line-clamp-3 leading-relaxed">
                {this.state.error?.message || 'Unspecified runtime exception'}
              </div>
            </div>
            <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Nemesis Platform Stability Node v1.4.4</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;

