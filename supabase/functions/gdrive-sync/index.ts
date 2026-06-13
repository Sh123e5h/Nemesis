/// <reference path="../deno-fix.d.ts" />
import { createClient } from "@supabase/supabase-js";
// @ts-ignore
import { crypto } from "std/crypto/mod.ts";
// @ts-ignore
import { encode } from "std/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getMd5Hash(data: string) {
  const hashBuffer = await crypto.subtle.digest("MD5", new TextEncoder().encode(data));
  return new TextDecoder().decode(encode(new Uint8Array(hashBuffer)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // 2. Parse payload
    const payload = await req.json();
    let shards = payload.shards;

    // Support legacy single-shard payload for backward compatibility
    if (!shards && payload.fileId && payload.content) {
      shards = [{
        fileId: payload.fileId,
        fileName: payload.fileName || `${payload.fileId.toLowerCase()}.json`,
        content: payload.content
      }];
    }

    if (!shards || !Array.isArray(shards)) {
      throw new Error("Missing payload: shards array or fileId/content");
    }

    console.log(`[GDrive] Batch syncing ${shards.length} shards for user ${user.id}...`);

    // 3. Get Refresh Token from profiles (do this once)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gdrive_refresh_token, gdrive_backup_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.gdrive_refresh_token) {
      throw new Error("Google Drive not connected");
    }

    // 4. Get Google Access Token (do this once)
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim();
    
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        refresh_token: profile.gdrive_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json();
      const errorMsg = errorData.error_description || errorData.error;
      
      // If token is revoked or expired, mark it in the profile so the UI can prompt for reconnect
      if (errorData.error === 'invalid_grant') {
        await supabase.from("profiles").update({
          gdrive_backup_status: { 
            valid: false, 
            last_backup_at: profile?.gdrive_backup_status?.last_backup_at, 
            error: "Authentication revoked or expired. Please reconnect in Settings." 
          }
        }).eq("id", user.id);
      }
      
      throw new Error(`Google authentication failed: ${errorMsg}`);
    }
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;
    
    // If Google rotates the refresh token, store the new one immediately
    if (tokenData.refresh_token) {
      await supabase.from("profiles").update({
        gdrive_refresh_token: tokenData.refresh_token
      }).eq("id", user.id);
      console.log("[GDrive] Refresh token rotated and updated in profile.");
    }

    // 5. Fetch existing mappings for all shards in one query
    const { data: mappings } = await supabase
      .from("sync_mappings")
      .select("*")
      .eq("user_id", user.id)
      .in("file_id", shards.map(s => s.fileId));

    const mappingMap = new Map(mappings?.map(m => [m.file_id, m]));

    // 6. Process shards in parallel
    const results = await Promise.all(shards.map(async (shard) => {
      const { fileId, fileName, content } = shard;
      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      const hash = await getMd5Hash(contentString);
      const mapping = mappingMap.get(fileId);

      if (mapping && mapping.hash === hash) {
        return { fileId, status: "skipped" };
      }

      let driveFileId = mapping?.drive_file_id;

      try {
        if (driveFileId) {
          // UPDATE
          const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
            body: contentString,
          });
          if (!updateRes.ok) driveFileId = null;
        }

        if (!driveFileId) {
          // CREATE
          const boundary = "nemesis_boundary_" + crypto.randomUUID();
          const metadata = { name: fileName, parents: ["appDataFolder"], mimeType: "application/json" };
          const multipartBody = [
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
            `--${boundary}\r\nContent-Type: application/json\r\n\r\n${contentString}`,
            `--${boundary}--`
          ].join("\r\n");

          const createRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
            method: "POST",
            headers: { 
              Authorization: `Bearer ${access_token}`,
              "Content-Type": `multipart/related; boundary=${boundary}`
            },
            body: multipartBody,
          });
          if (!createRes.ok) throw new Error(await createRes.text());
          const driveData = await createRes.json();
          driveFileId = driveData.id;
        }

        // Update mapping in DB
        await supabase.from("sync_mappings").upsert({
          user_id: user.id,
          file_id: fileId,
          drive_file_id: driveFileId,
          hash: hash,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,file_id" });

        return { fileId, status: "success", driveFileId };
      } catch (err: any) {
        console.error(`[GDrive] Shard ${fileId} failed:`, err);
        return { fileId, status: "error", error: err.message };
      }
    }));

    // 7. Update profile timestamp (even if skipped, it's a successful sync check)
    if (results.length > 0 && results.every(r => r.status !== 'error')) {
      await supabase.from("profiles").update({
        gdrive_backup_status: { valid: true, last_backup_at: new Date().toISOString(), error: null }
      }).eq("id", user.id);
    }

    return new Response(JSON.stringify({ status: "success", results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ status: "error", error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
