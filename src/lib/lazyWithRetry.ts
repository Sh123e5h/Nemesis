import { lazy, type ComponentType } from 'react';

/**
 * A wrapper around React.lazy that automatically reloads the page
 * if a dynamic import fails due to a version mismatch (ChunkLoadError).
 *
 * STRATEGY:
 * 1. Catch the fetch/chunk error.
 * 2. Wipe ALL runtime caches (Service Worker cache + HTTP cache busting).
 * 3. Force a true hard-reload so the browser fetches fresh HTML + new chunk hashes.
 * 4. Throttle retries with sessionStorage to prevent infinite reload loops.
 *
 * WHY caches.delete() is needed:
 * Simply calling window.location.reload() or setting location.href is NOT enough
 * when a Service Worker is active — the SW will intercept the navigation and serve
 * the old cached HTML (which still references the old chunk hashes), causing an
 * endless reload loop. We must evict all SW caches first.
 */

/** Wipe all SW-managed caches and hard-reload the page. */
async function clearCachesAndReload(): Promise<never> {
  if (typeof window === 'undefined') throw new Error('Not in browser');

  try {
    // 1. Tell the active Service Worker to skip waiting and take over immediately
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        // Send SKIP_WAITING to the waiting SW so it becomes the active controller
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Small pause so the SW can activate before we reload
        await new Promise(r => setTimeout(r, 250));
      }
    }

    // 2. Delete ALL caches managed by the Service Worker so stale assets are gone
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    // Non-fatal — proceed to reload even if cache clearing fails
    console.warn('[LAZY_LOAD] Cache clearing failed, reloading anyway:', e);
  }

  // 3. Hard-reload with a cache-busting query param so CDN/proxy caches are bypassed
  const url = new URL(window.location.href);
  url.searchParams.set('_cbust', String(Date.now()));
  window.location.replace(url.toString());

  // Return a never-resolving promise — prevents React rendering during reload
  return new Promise<never>(() => {});
}

export function lazyWithRetry(
  componentImport: () => Promise<{ default: ComponentType<any> }>,
  name: string = 'Component'
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.error(`[LAZY_LOAD] Attempt failed for ${name}:`, error);

      const message = error?.message || '';

      // Broad detection — covers Chrome, Safari, Firefox, and Network errors
      const isVersionMismatch =
        message.includes('Failed to fetch') ||
        message.includes('dynamically imported module') ||
        message.includes('Loading chunk') ||
        message.includes('Load chunk') ||
        error?.name === 'ChunkLoadError' ||
        message.includes('NetworkError') ||
        message.includes('Script error') ||
        message.includes('error loading');

      if (isVersionMismatch) {
        const SESSION_KEY = `nemesis_retry_${name}`;
        const lastAttempt = sessionStorage.getItem(SESSION_KEY);
        const now = Date.now();

        // Allow at most 1 auto-recovery per component per 90 seconds.
        // If we're already within that window, abort to prevent an infinite loop.
        if (!lastAttempt || now - parseInt(lastAttempt, 10) > 90_000) {
          sessionStorage.setItem(SESSION_KEY, now.toString());
          console.warn(
            `⚡ [RECOVERY] New deployment detected (chunk "${name}" not found). ` +
            `Clearing SW caches and reloading...`
          );
          // Full SW cache wipe + hard reload — breaks the stale SW loop
          return clearCachesAndReload() as any;
        } else {
          console.error(
            `🛑 [RECOVERY] Multiple failures for ${name} within 90s — ` +
            `aborting auto-refresh to prevent infinite loop.`
          );
          throw error;
        }
      }

      throw error;
    }
  });
}
