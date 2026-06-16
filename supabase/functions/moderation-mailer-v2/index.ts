// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@3.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * DATABASE-DRIVEN MAILING ARCHITECTURE (v2.1.0)
 * Optimized for invisible Gmail grouping-break and high-velocity dispatch.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const data = payload.record || payload;
    const { email, type = "welcome", redirect_url } = data;

    if (!email) return new Response(JSON.stringify({ error: "Missing email" }), { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 0. RATE LIMIT CHECK (60s cooldown per email/type)
    // Prevents mailer abuse and high-frequency spamming.
    const { data: recentLogs } = await supabase
      .from("mailing_logs")
      .select("created_at")
      .eq("recipient", email)
      .eq("slug", type)
      .gt("created_at", new Date(Date.now() - 60000).toISOString())
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      console.warn(`[RateLimit] Blocking repeat ${type} mail to ${email}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "MSR_RATE_LIMIT: Notification sent recently. Please wait before retrying." 
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. Settings & Template Fetching
    const [settingsRes, templateRes] = await Promise.all([
      supabase.from("mailing_settings").select("*"),
      supabase.from("mailing_templates").select("html, subject").eq("slug", type).maybeSingle()
    ]);

    // 2. Secret & Identity Resolution
    const apiKey = Deno.env.get("RESEND_API_KEY") ?? settingsRes.data?.find((s: any) => s.key === "RESEND_API_KEY")?.value;
    const senderEmail = settingsRes.data?.find((s: any) => s.key === "sender_email")?.value ?? "shiresh.kashyap@gmail.com";

    if (!apiKey) {
      console.error("[Resend] Missing RESEND_API_KEY (Env or DB)");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing RESEND_API_KEY. Add it to the 'mailing_settings' table via the Supabase Dashboard to fix." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const resend = new Resend(apiKey);
    let { html, subject } = templateRes.data ?? { html: null, subject: "NEMESIS Protocol Alert" };

    if (!html) html = `<h1>NEMESIS Intelligence Notification</h1><p>Protocol update for node ${email}.</p>`;

    // 3. Recovery Link Logic (password_reset) — FIXED: null safety
    if (type === "password_reset") {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirect_url ?? "https://nemesiss.in/reset-password" }
      });
      if (linkError) throw linkError;
      if (linkData?.properties?.action_link) {
        data.reset_link = linkData.properties.action_link;
      } else {
        throw new Error("Failed to generate recovery link");
      }
    }

    // 3. Variable Replacement
    for (const [key, value] of Object.entries(data)) {
      const re = new RegExp(`{{${key}}}`, "g");
      html = html.replace(re, String(value ?? ""));
      subject = subject.replace(re, String(value ?? ""));
    }

    // 4. INVISIBLE GROUPING-BREAK & QUOTE REMOVAL
    // We strip visible ellipses and append an invisible 'Zero-Width Space' (ZWSP) sequence.
    // Gmail sees unique subjects, but the user sees a perfectly clean subject line.
    subject = subject.trim().replace(/\.+$/, ""); // Strip trailing dots
    const zwspSequence = "\u200B".repeat(Math.floor(Math.random() * 10) + 1); // Random 1-10 invisible spaces
    subject = `${subject}${zwspSequence}`;

    // 5. Resend Dispatch
    console.log(`[Resend] Attempting dispatch to ${email} (type: ${type})`);
    const { data: resendData, error: resendError } = await resend.emails.send({
      from: `Nemesis <${senderEmail}>`,
      to: [email],
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<mailto:unsubscribe@nemesiss.in?subject=unsubscribe-${email}>`,
        "Precedence": "bulk",
        "X-Entity-Ref-ID": `${senderEmail}`
      }
    });

    if (resendError) {
      console.error(`[Resend] Logic Failure:`, resendError);
    } else {
      console.log(`[Resend] Dispatch Successful:`, resendData);
    }

    const status = !resendError ? "success" : "failure";

    // 6. Non-blocking Log
    supabase.from("mailing_logs").insert({
      recipient: email,
      slug: type,
      subject: subject.replace(/\u200B/g, " [ZWSP]"),
      status,
      error_message: resendError ? JSON.stringify(resendError) : null,
      metadata: data
    }).then();

    if (resendError) {
      return new Response(JSON.stringify({ success: false, error: resendError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, status, id: resendData?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
