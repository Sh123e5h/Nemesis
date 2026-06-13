/// <reference path="../deno-fix.d.ts" />
/**
 * Google Drive Token Refresh Proxy for Nemesis
 * - Recieves a Google Refresh Token from the frontend.
 * - Exchanges it for a new Access Token using stored Secrets.
 * - Returns ONLY the fresh access_token to the frontend.
 * 
 * Secure deployment required:
 * `supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=...`
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Edge Function secrets (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are NOT configured in Supabase.");
    }

    // 3. Exchange refresh_token for a fresh access_token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[GDrive] Google OAuth error (${response.status}):`, data);
      return new Response(JSON.stringify({ 
        error: data.error_description || data.error,
        details: data 
      }), {
        status: 200, // Return 200 to prevent red console errors in frontend browser fetch log
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseData: Record<string, string> = { access_token: data.access_token };
    if (data.refresh_token) {
      responseData.refresh_token = data.refresh_token;
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 to prevent red console errors in frontend browser fetch log
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
