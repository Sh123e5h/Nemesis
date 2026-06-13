import { supabase } from './supabase';

export type TokenState = 'valid' | 'expired' | 'refreshing' | 'dead' | 'offline' | 'pending';

interface TokenStatus {
  state: TokenState;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  lastError?: string;
  lastCheckedAt: number;
}

class GoogleTokenManager {
  private status: TokenStatus = {
    state: 'offline',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    lastCheckedAt: 0,
  };

  private listeners = new Set<(status: TokenStatus) => void>();
  private channel = new BroadcastChannel('nemesis_gdrive_auth');

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize(): void {
    const accessToken = sessionStorage.getItem('gdrive_access_token');
    const expiresAt = sessionStorage.getItem('gdrive_token_expiry');
    // Removed refresh token from localStorage to mitigate XSS risk.
    // Refresh tokens are now fetched from the encrypted profiles table via Edge Functions.

    this.status = {
      state: this.deriveState(accessToken, null, expiresAt),
      accessToken,
      refreshToken: null,
      expiresAt: expiresAt ? parseInt(expiresAt) : null,
      lastCheckedAt: Date.now(),
    };

    this.channel.onmessage = (event) => {
      if (event.data?.type === 'STATUS_UPDATE') {
        this.status = { ...this.status, ...event.data.status };
        this.notify(false);
      } else if (event.data?.type === 'REQUEST_STATUS') {
        // Another tab is asking for the latest status — respond by broadcasting.
        this.broadcast();
      }
    };

    // Ask other tabs for the latest status
    this.channel.postMessage({ type: 'REQUEST_STATUS' });
    this.notify();
  }

  private deriveState(access: string | null, refresh: string | null, expiry: string | null): TokenState {
    if (!access && !refresh) return 'offline';
    if (!access && refresh) return 'expired';
    if (expiry && parseInt(expiry) < Date.now()) return 'expired';
    return 'valid';
  }

  public subscribe(fn: (status: TokenStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  public getStatus(): TokenStatus {
    return { ...this.status };
  }

  public setAccessToken(token: string, expiresInSeconds: number = 3599): void {
    const expiresAt = Date.now() + (expiresInSeconds - 60) * 1000;
    this.status = {
      ...this.status,
      state: 'valid',
      accessToken: token,
      expiresAt,
      lastCheckedAt: Date.now(),
    };
    sessionStorage.setItem('gdrive_access_token', token);
    sessionStorage.setItem('gdrive_token_expiry', String(expiresAt));
    this.broadcast();
    this.notify();
  }

  public setRefreshToken(token: string): void {
    this.status = { ...this.status, refreshToken: token };
    // ✅ Security: refresh token is never written to localStorage.
    // The sole persistence path is the encrypted `profiles` table via syncToCloud().
    this.syncToCloud(token);
    this.broadcast();
    this.notify();
  }

  public setRefreshing(isRefreshing: boolean): void {
    if (this.status.state === 'dead' || this.status.state === 'offline') return;
    this.status = {
      ...this.status,
      state: isRefreshing ? 'refreshing' : this.deriveState(this.status.accessToken, this.status.refreshToken, String(this.status.expiresAt))
    };
    this.broadcast();
    this.notify();
  }

  public invalidate(reason: string, isPermanent: boolean): void {
    this.status = {
      ...this.status,
      state: isPermanent ? 'dead' : 'expired',
      lastError: reason,
      accessToken: isPermanent ? null : this.status.accessToken,
      lastCheckedAt: Date.now(),
    };

    if (isPermanent) {
      sessionStorage.removeItem('gdrive_access_token');
      sessionStorage.removeItem('gdrive_token_expiry');
      // No localStorage removal needed — refresh token was never stored there.
      this.syncToCloud(null);
    }

    this.broadcast();
    this.notify();
  }

  public reset(): void {
    this.status = {
      state: 'offline',
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastCheckedAt: Date.now(),
    };
    sessionStorage.removeItem('gdrive_access_token');
    sessionStorage.removeItem('gdrive_token_expiry');
    // No localStorage removal needed — refresh token was never stored there.
    this.broadcast();
    this.notify();
  }

  private broadcast(): void {
    this.channel.postMessage({ type: 'STATUS_UPDATE', status: this.status });
  }

  private notify(doBroadcast = true): void {
    if (doBroadcast) this.broadcast();
    this.listeners.forEach(fn => fn(this.status));
  }

  private async syncToCloud(token: string | null): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ gdrive_refresh_token: token }).eq('id', user.id);
    } catch (err) {
      console.warn('[TokenManager] Profile sync failed:', err);
    }
  }

  public isTokenFresh(): boolean {
    return !!(this.status.accessToken && this.status.expiresAt && this.status.expiresAt > Date.now());
  }
}

export const tokenManager = new GoogleTokenManager();
