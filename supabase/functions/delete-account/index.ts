// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAdminKey);

    // 1. Authenticate the trigger user
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid session token");
    }

    const userId = user.id;

    // 2. Clear related user DB data safely
    const { data: userQuizzes } = await supabase.from("quizzes").select("id").eq("created_by", userId);
    const qids = (userQuizzes ?? []).map((q: { id: string }) => q.id);
    for (let i = 0; i < qids.length; i += 200) {
      const slice = qids.slice(i, i + 200);
      await supabase.from("quiz_questions").delete().in("quiz_id", slice);
    }
    await supabase.from("quizzes").delete().eq("created_by", userId);

    // Profile updates/deletion (RLS policies usually allow cascade, but doing manually for clean separation)
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.from("study_materials").delete().eq("user_id", userId);
    await supabase.from("tasks").delete().eq("user_id", userId);

    // 3. Send Deletion Confirmation Email
    try {
      await supabase.functions.invoke('moderation-mailer-v2', {
        body: { 
          email: user.email,
          type: 'deletion'
        }
      });
      console.log('Deletion email dispatched for:', user.email);
    } catch (mailErr) {
      console.error('Failed to send deletion email (non-blocking):', mailErr);
    }

    // 4. Delete the Auth User completely from Supabase triggers
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      throw new Error(`Auth Deletion Failure: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Account deleted successfully." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
