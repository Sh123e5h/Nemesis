import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { SWRConfig } from 'swr'
import { swrConfig } from './lib/swr.ts'
import { initializeReactRecoverySystem } from './lib/reactRecovery'
import './index.css'
import './styles/scrollOptimization.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Initialize React error recovery system FIRST, before anything else
initializeReactRecoverySystem();

// ✅ WEB VITALS MONITORING
// Import Web Vitals to track Core Web Vitals and report to Google Analytics
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    const reportWebVital = (metric: any) => {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', metric.name, {
          value: Math.round(metric.value),
          event_category: 'web_vitals',
          event_label: metric.id,
        });
      }
    };
    
    onCLS(reportWebVital);
    onFID(reportWebVital);
    onFCP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
  }).catch(() => {
    // Web-vitals not available, skip monitoring
  });
}

// ⚡ DEFER PWA REGISTRATION & ANALYTICS
// Do not use immediate: true. Wait for window load and network idle
// so the SW doesn't steal critical bandwidth downloading background assets.
if (typeof window !== 'undefined') {
  const initDeferredOperations = () => {
    // 1. ✅ FCP OPTIMIZATION: Inject GTag ONLY when browser is idle to minimize FCP impact
    const injectGTag = () => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-2RCN57TRCJ';
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function(...args: any[]){ window.dataLayer.push(args); };
      window.gtag('js', new Date());
      window.gtag('config', 'G-2RCN57TRCJ', { send_page_view: false });
    };

    // 2. ✅ PWA REGISTRATION: Auto-update SW and reload when new version deploys
    const initSW = () => {
      const updateSW = registerSW({
        // ⚡ onNeedRefresh fires when a new SW is waiting to activate.
        // We immediately reload so users get fresh HTML + new chunk hashes.
        // This self-heals the "error loading dynamically imported module" error.
        onNeedRefresh() {
          console.log('[PWA] New version available — reloading for fresh assets...');
          updateSW(true);
        },
        onOfflineReady() {
          console.log('[PWA] Nemesis is ready for offline use.');
        },
        onRegistered() {
          console.log('Nemesis PWA: Protocol Online');
        },
        onRegisterError(error) {
          console.error('Nemesis PWA: Registration Failure', error);
        }
      });
    };

    // Execute with maximum deference
    // Delay: 3s (analytics) and 5s (SW) ensures FCP/LCP are not blocked
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        setTimeout(injectGTag, 3000);
        setTimeout(initSW, 5000); // Shift SW further back
      });
    } else {
      setTimeout(injectGTag, 3000);
      setTimeout(initSW, 5000);
    }
  };


  if (document.readyState === 'complete') {
    initDeferredOperations();
  } else {
    window.addEventListener('load', initDeferredOperations);
  }
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <SWRConfig value={swrConfig}>
        <Suspense fallback={
          <div className="h-screen w-screen bg-[#030712] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <App />
        </Suspense>
      </SWRConfig>
    </HelmetProvider>
  </StrictMode>,
)
