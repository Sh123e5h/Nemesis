/// <reference path="../deno-fix.d.ts" />
/**
 * Google Drive Token Refresh Proxy for Nemesis (DEBUG VERSION)
 * - Enhanced logging to see what's failing
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
    console.log("📥 Received refresh request");

    if (!refreshToken) {
      console.error("❌ Missing refresh token in request");
      throw new Error("Missing refresh token");
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");

    console.log("🔍 Checking secrets:");
    console.log("   GOOGLE_CLIENT_ID:", clientId ? "✓ SET" : "❌ MISSING");

    if (!clientId) {
      const errorMsg = "Edge Function secrets (GOOGLE_CLIENT_ID) are NOT configured in Supabase.";
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("🔄 Exchanging refresh token for new access token...");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Google OAuth error (status", response.status + "):");
      console.error("   Error:", data.error);
      console.error("   Description:", data.error_description);
      
      return new Response(JSON.stringify({ 
        error: data.error_description || data.error,
        details: "Check Supabase Function logs for more info"
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Successfully got new access token from Google");
    return new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Function error:", error.message);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Check Supabase Function logs for more info"
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
