import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('gdrive_refresh_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gdrive_refresh_token) {
      return new Response(JSON.stringify({ error: 'No refresh token found for user' }), { status: 400 });
    }

    const refresh_token = profile.gdrive_refresh_token;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: tokenData.error_description || 'Google refresh failed' }), { status: response.status });
    }

    return new Response(JSON.stringify(tokenData), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})