/**
 * React Initialization Error Recovery
 * 
 * Detects and recovers from "resolveDispatcher is null" and similar
 * React hook initialization errors that can occur during:
 * 1. Lazy module loading
 * 2. Hot Module Replacement (HMR)
 * 3. Service worker updates
 * 4. Browser cache corruption
 */

const RECOVERY_STORAGE_KEY = 'nemesis_react_recovery';
const MAX_RECOVERY_ATTEMPTS = 2;
const RECOVERY_COOLDOWN_MS = 60000; // 1 minute

export function initializeReactRecoverySystem() {
  // Catch React-specific initialization errors at the global level
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = function(...args: any[]) {
    const message = String(args[0] || '');
    
    // Detect React dispatcher errors
    if (
      message.includes('resolveDispatcher') || 
      message.includes('useState') ||
      message.includes('useContext') ||
      (args[0] instanceof Error && args[0].message.includes('resolveDispatcher'))
    ) {
      console.warn('[REACT_RECOVERY] Detected React initialization error, triggering recovery...');
      triggerReactRecovery('React hook initialization failed');
    }
    
    originalError.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    originalWarn.apply(console, args);
  };

  // Also add a global error handler
  window.addEventListener('error', (event) => {
    if (event.message && typeof event.message === 'string') {
      if (event.message.includes('resolveDispatcher') || event.message.includes('useState')) {
        triggerReactRecovery(`Global error: ${event.message}`);
      }
    }
  });

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason) {
      const reasonMsg = typeof event.reason === 'string' ? event.reason : (event.reason.message || String(event.reason));
      if (reasonMsg && (reasonMsg.includes('resolveDispatcher') || reasonMsg.includes('Failed to fetch'))) {
        triggerReactRecovery(`Unhandled rejection: ${reasonMsg}`);
        event.preventDefault();
      }
    }
  });
}

function triggerReactRecovery(reason: string) {
  const now = Date.now();
  const recoveryData = localStorage.getItem(RECOVERY_STORAGE_KEY);
  
  let attempts = 0;
  let lastRecovery = 0;

  if (recoveryData) {
    try {
      const parsed = JSON.parse(recoveryData);
      attempts = parsed.attempts || 0;
      lastRecovery = parsed.time || 0;
    } catch {
      // Invalid JSON, reset
      localStorage.removeItem(RECOVERY_STORAGE_KEY);
    }
  }

  // Check if we're in a recovery cooldown period
  if (now - lastRecovery < RECOVERY_COOLDOWN_MS) {
    console.log(`[REACT_RECOVERY] In cooldown period, waiting before retry...`);
    return;
  }

  // Check if we've exceeded max attempts
  if (attempts >= MAX_RECOVERY_ATTEMPTS) {
    console.error(`[REACT_RECOVERY] Max recovery attempts (${MAX_RECOVERY_ATTEMPTS}) exceeded.`);
    // Clear everything to allow fresh start
    clearCacheAndReload();
    return;
  }

  // Store recovery attempt
  localStorage.setItem(
    RECOVERY_STORAGE_KEY,
    JSON.stringify({
      attempts: attempts + 1,
      time: now,
      reason,
      lastError: new Date().toISOString()
    })
  );

  console.warn(`[REACT_RECOVERY] Recovery attempt ${attempts + 1}/${MAX_RECOVERY_ATTEMPTS}: ${reason}`);
  
  // Perform recovery
  performReactRecovery();
}

async function performReactRecovery() {
  try {
    // 1. Clear service worker cache
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[REACT_RECOVERY] Unregistered Service Worker');
      }
    }
  } catch (err) {
    console.warn('[REACT_RECOVERY] Could not clear service workers:', err);
  }

  try {
    // 2. Clear browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log(`[REACT_RECOVERY] Cleared cache: ${name}`);
      }
    }
  } catch (err) {
    console.warn('[REACT_RECOVERY] Could not clear caches:', err);
  }

  // 3. Force full page reload with cache bust
  const url = new URL(window.location.href);
  url.searchParams.set('v_react_recovery', Date.now().toString());
  
  console.log('[REACT_RECOVERY] Reloading application...');
  window.location.href = url.toString();
}

async function clearCacheAndReload() {
  try {
    // Clear all recovery data
    localStorage.removeItem(RECOVERY_STORAGE_KEY);
    sessionStorage.clear();
    
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
  } catch (err) {
    console.warn('[REACT_RECOVERY] Error during full cache clear:', err);
  }

  // Full reload with maximum cache bust
  const url = new URL(window.location.href);
  url.searchParams.set('v_full_reset', Date.now().toString());
  window.location.href = url.toString();
}
