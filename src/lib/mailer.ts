import { supabase } from './supabase';

const EDGE_FUNCTION_URL = 'https://hzostigkcsursgbbqudn.supabase.co/functions/v1/moderation-mailer-v2';

export const mailer = {
  /**
   * Dispatches an identity verification code (OTP) via the Edge Function.
   */
  sendOTP: async (email: string, code: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If we have a session, use it (though OTP often happens before session)
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      // Fallback to anon key if no session (e.g. login flow)
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        type: 'otp',
        otp_code: code,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Identity code requested recently. Please wait 60 seconds.');
      }
      const errorData = await response.json().catch(() => ({ error: 'Mailer failure' }));
      const errorMsg = typeof errorData.error === 'object' && errorData.error?.message 
        ? errorData.error.message 
        : (errorData.error || 'Identity code dispatch failed');
      throw new Error(errorMsg);
    }

    return response.json();
  },

  /**
   * Dispatches a welcome email to a new user.
   */
  sendWelcome: async (email: string, userName?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    } else {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;
    }

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        type: 'welcome',
        user_name: userName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Mailer failure' }));
      const errorMsg = typeof errorData.error === 'object' && errorData.error?.message 
        ? errorData.error.message 
        : (errorData.error || 'Welcome mail dispatch failed');
      console.error('Welcome mailer failure:', errorMsg);
    }

    return response.json();
  },

  /**
   * Dispatches a password reset link.
   */
  sendPasswordReset: async (email: string, redirectUrl: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        type: 'password_reset',
        redirect_url: redirectUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Mailer failure' }));
      const errorMsg = typeof errorData.error === 'object' && errorData.error?.message 
        ? errorData.error.message 
        : (errorData.error || 'Password reset dispatch failed');
      throw new Error(errorMsg);
    }

    return response.json();
  }
};
