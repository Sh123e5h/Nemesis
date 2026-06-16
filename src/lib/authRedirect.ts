import { Capacitor } from '@capacitor/core';
import type { Profile } from '../store/useAuthStore';

const OAUTH_INTENT_KEY = 'nemesis_oauth_intent';
const AUTH_CALLBACK_KEY = 'nemesis_auth_callback_pending';

export type OAuthIntent = 'signup' | 'login';

/** Build an OAuth redirect URL that works with both BrowserRouter and HashRouter. */
export function getOAuthRedirectUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isNative =
    typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();

  if (isNative) {
    return `${window.location.origin}/#${normalizedPath}`;
  }

  // Force HTTPS for all non-localhost origins.
  // Supabase rejects http:// redirect URLs in its allowlist, and some hosting
  // providers serve pages over http:// before the CDN upgrades to https://.
  let origin = window.location.origin;
  if (origin.startsWith('http://') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    origin = origin.replace('http://', 'https://');
  }

  return `${origin}${normalizedPath}`;
}

export function setOAuthIntent(intent: OAuthIntent): void {
  sessionStorage.setItem(OAUTH_INTENT_KEY, intent);
}

export function consumeOAuthIntent(): OAuthIntent | null {
  const intent = sessionStorage.getItem(OAUTH_INTENT_KEY);
  if (intent === 'signup' || intent === 'login') {
    sessionStorage.removeItem(OAUTH_INTENT_KEY);
    return intent;
  }
  return null;
}

export function isPasswordRecoveryCallback(): boolean {
  const search = window.location.search;
  const hash = window.location.hash;

  return search.includes('type=recovery') || hash.includes('type=recovery');
}

export function hasOAuthCallbackParams(): boolean {
  const search = window.location.search;
  const hash = window.location.hash;

  return (
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('refresh_token=')
  );
}

/** Resolve where an unexpected OAuth / recovery callback should land. */
export function resolveOAuthCallbackTarget(
  intent: OAuthIntent | null,
): string {
  if (isPasswordRecoveryCallback()) return '/reset-password';
  if (sessionStorage.getItem('gdrive_reconnecting') === 'true') return '/settings';
  if (intent === 'login') return '/home';
  return '/signup/username';
}

export function markAuthCallbackPending(): void {
  sessionStorage.setItem(AUTH_CALLBACK_KEY, '1');
}

export function clearAuthCallbackPending(): void {
  sessionStorage.removeItem(AUTH_CALLBACK_KEY);
}

export function isAuthCallbackPending(): boolean {
  return sessionStorage.getItem(AUTH_CALLBACK_KEY) === '1';
}

export function profileNeedsSignupCompletion(profile: Profile | null): boolean {
  if (!profile?.username) return true;
  return profile.username.toLowerCase().startsWith('user_');
}

/** Routes that already handle Supabase OAuth callbacks — do not reroute. */
export const OAUTH_CALLBACK_DESTINATIONS = new Set([
  '/signup/username',
  '/reset-password',
  '/home',
  '/settings',
]);
