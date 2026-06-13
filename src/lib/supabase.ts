import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are defined.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // SECURITY: Use Authorization Code + PKCE flow instead of implicit flow.
    // This satisfies Google's "secure OAuth flows" requirement and prevents
    // token interception / impersonation attacks.
    flowType: 'pkce',
  }
});

/**
 * PRODUCTION HARDENING: Query Deduplication Layer
 * Prevents identical GET requests from firing multiple times within a short window.
 */
const pendingQueries = new Map<string, Promise<any>>();

export const dedupeQuery = async <T>(key: string, queryFn: () => Promise<T>): Promise<T> => {
  if (pendingQueries.has(key)) return pendingQueries.get(key);
  
  const promise = queryFn().finally(() => {
    // Clean up after a short delay to allow for "burst" deduplication
    setTimeout(() => pendingQueries.delete(key), 500);
  });
  
  pendingQueries.set(key, promise);
  return promise;
};

/**
 * OBSERVABILITY LAYER (v1.2): Universal Crash Reporter
 * Capture client-side errors and diagnostic info into the audit log.
 */
export const recordPlatformCrash = async (error: Error, info?: any) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const stack = error.stack || 'No stack trace available';
    const message = error.message || 'Unknown Error';
    
    console.error('🛡️ Shield Active: Recording Platform Crash...', { message, stack });

    // Use a direct insert into audit_logs if the RPC isn't available
    await supabase.from('audit_logs').insert({
      action: 'CLIENT_CRASH',
      target_type: 'PLATFORM',
      metadata: {
        error: message,
        stack: stack.substring(0, 1000), // Limit stack size
        component_info: info,
        url: window.location.href,
        userAgent: navigator.userAgent,
        user_id: session?.user?.id || 'anonymous'
      }
    });
  } catch (err) {
    console.error('❌ Shield Failed to log crash:', err);
  }
};

