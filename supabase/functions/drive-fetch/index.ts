/**
 * Fetches Google Drive file bytes for Nemesis previews (CSV, etc.)
 * AND handles action-based requests for SyncEngine (list, status, restore).
 *
 * Verifies the caller's JWT and that they can read the material row (RLS)
 * or have a valid GDrive refresh token for actions.
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore: Deno is provided at runtime
declare const Deno: any;

import { createClient } from "@supabase/supabase-js";

function bytesToBase64(u8: Uint8Array): string {
  const chunks: string[] = [];
  const chunkSize = 8192;
  for (let i = 0; i < u8.length; i += chunkSize) {
    chunks.push(String.fromCharCode(...u8.subarray(i, i + chunkSize)));
  }
  return btoa(chunks.join(""));
}

const MAX_BYTES = 15 * 1024 * 1024;
const UA = "Mozilla/5.0 (compatible; NemesisDriveFetch/1.0)";

function extractDriveId(url: string): string | null {
  if (!url) return null;
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) {
    try {
      const u = url.startsWith("http") ? new URL(url) : new URL(url, "https://drive.google.com");
      const q = u.searchParams.get("id");
      if (q) return q;
    } catch {
      /* ignore */
    }
  }
  const m =
    url.match(/\/file\/d\/([^/?#]+)/) ||
    url.match(/\/d\/([^/?#]+)/) ||
    url.match(/[?&]id=([^&?#]+)/);
  return m ? m[1] : null;
}

function looksLikeHtml(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, Math.min(256, bytes.length))).trimStart();
  return head.startsWith("<!") || head.toLowerCase().startsWith("<html");
}

/**
 * Best-effort download for "anyone with link" Drive files (handles confirm / interstitial HTML).
 */
async function fetchDrivePublicFile(driveFileId: string): Promise<{ data: Uint8Array; mime: string } | null> {
  const base = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}`;

  const fetchOnce = async (url: string): Promise<Response> =>
    await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "*/*" },
    });

  let res = await fetchOnce(base);
  let data = new Uint8Array(await res.arrayBuffer());
  let mime = res.headers.get("content-type") || "";

  if (data.byteLength < 512 * 1024 && (mime.includes("text/html") || looksLikeHtml(data))) {
    const html = new TextDecoder().decode(data);

    const confirm = html.match(/confirm=([0-9A-Za-z_-]+)/);
    if (confirm?.[1]) {
      res = await fetchOnce(`${base}&confirm=${confirm[1]}`);
      data = new Uint8Array(await res.arrayBuffer());
      mime = res.headers.get("content-type") || "";
    }

    if (looksLikeHtml(data) || mime.includes("text/html")) {
      const uuid = html.match(/uuid=([0-9a-f-]{36})/i);
      if (uuid?.[1]) {
        const alt =
          `https://drive.usercontent.google.com/download?id=${encodeURIComponent(driveFileId)}&export=download&confirm=t&uuid=${uuid[1]}`;
        res = await fetchOnce(alt);
        data = new Uint8Array(await res.arrayBuffer());
        mime = res.headers.get("content-type") || "";
      }
    }

    /* Virus-scan interstitial: hidden form fields */
    if (looksLikeHtml(data) || mime.includes("text/html")) {
      const confirmField = html.match(/name="confirm"\s+value="([^"]*)"/);
      const idField = html.match(/name="id"\s+value="([^"]*)"/);
      if (confirmField?.[1] !== undefined && idField?.[1]) {
        const postUrl =
          `https://drive.usercontent.google.com/download?id=${encodeURIComponent(idField[1])}&export=download&confirm=${encodeURIComponent(confirmField[1])}`;
        res = await fetchOnce(postUrl);
        data = new Uint8Array(await res.arrayBuffer());
        mime = res.headers.get("content-type") || "";
      }
    }
  }

  if (!res.ok || data.byteLength === 0) return null;
  if (mime.includes("text/html") || looksLikeHtml(data)) return null;
  if (data.byteLength > MAX_BYTES) return null;

  return { data, mime: mime.split(";")[0].trim() || "application/octet-stream" };
}

/// <reference path="../deno-fix.d.ts" />

// @ts-ignore: Deno is provided at runtime
Deno.serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // @ts-ignore: Deno is provided at runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    // @ts-ignore: Deno is provided at runtime
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;

    // --- Action-based logic (for SyncEngine) ---
    if (action) {
      // 1. Get Refresh Token
      const { data: profile } = await supabase
        .from("profiles")
        .select("gdrive_refresh_token, gdrive_backup_status")
        .eq("id", user.id)
        .single();

      if (!profile?.gdrive_refresh_token) throw new Error("Google Drive not connected");

      const clientId = Deno.env.get("GOOGLE_CLIENT_ID")?.trim();
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")?.trim();
      if (!clientId || !clientSecret) throw new Error("Edge Function configuration error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: profile.gdrive_refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenRes.ok) {
        let errorMsg = "Unknown error";
        try {
          const errorData = await tokenRes.json();
          errorMsg = errorData.error_description || errorData.error;
          
          if (errorData.error === 'invalid_grant') {
            await supabase.from("profiles").update({
              gdrive_backup_status: { 
                valid: false, 
                last_backup_at: (profile as any)?.gdrive_backup_status?.last_backup_at, 
                error: "Authentication revoked or expired. Please reconnect in Settings." 
              }
            }).eq("id", user.id);
          }
        } catch (e) {
          errorMsg = await tokenRes.text();
        }
        
        console.error("[GDrive] Token refresh failed:", errorMsg);
        throw new Error(`Google authentication failed: ${errorMsg}`);
      }

      const tokenData = await tokenRes.json();
      const access_token = tokenData.access_token;
      if (!access_token) throw new Error("Failed to obtain access token from Google");

      // Handle token rotation
      if (tokenData.refresh_token) {
        await supabase.from("profiles").update({
          gdrive_refresh_token: tokenData.refresh_token
        }).eq("id", user.id);
      }

      if (action === 'list') {
        const res = await fetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder", {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === 'status') {
        // Parallelize quota and usage checks
        const [aboutRes, listRes, folderRes] = await Promise.all([
          fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", {
            headers: { Authorization: `Bearer ${access_token}` }
          }),
          fetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(size)", {
            headers: { Authorization: `Bearer ${access_token}` }
          }),
          fetch(`https://www.googleapis.com/drive/v3/files?q=name+%3D+%27Nemesis_Uploads%27+and+mimeType+%3D+%27application%2Fvnd.google-apps.folder%27+and+%27me%27+in+owners&fields=files(id)`, {
            headers: { Authorization: `Bearer ${access_token}` }
          })
        ]);

        const [aboutData, listData, folderData] = await Promise.all([
          aboutRes.json(),
          listRes.json(),
          folderRes.json()
        ]);

        let nemesisUsage = (listData.files || []).reduce((acc: number, f: any) => acc + parseInt(f.size || "0"), 0);
        const folderId = folderData.files?.[0]?.id;

        if (folderId) {
          const uploadsRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=%27${folderId}%27+in+parents&fields=files(size)`, {
            headers: { Authorization: `Bearer ${access_token}` }
          });
          const uploadsData = await uploadsRes.json();
          nemesisUsage += (uploadsData.files || []).reduce((acc: number, f: any) => acc + parseInt(f.size || "0"), 0);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("gdrive_backup_status")
          .eq("id", user.id)
          .single();

        return new Response(JSON.stringify({ 
          quota: { 
            ...aboutData.storageQuota, 
            nemesis_usage: nemesisUsage,
            last_backup_at: profile?.gdrive_backup_status?.last_backup_at
          } 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (action === 'restore_all') {
        const listRes = await fetch("https://www.googleapis.com/drive/v3/files?spaces=appDataFolder", {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const listData = await listRes.json();
        const files = listData.files || [];
        
        const results: Record<string, any> = {};
        
        // Parallelize shard downloads
        await Promise.all(files.map(async (file: any) => {
          try {
            const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
              headers: { Authorization: `Bearer ${access_token}` }
            });
            const content = await contentRes.json();
            if (content) {
              const shardKey = file.name.replace('.json', '').toUpperCase();
              results[shardKey] = content;
            }
          } catch (err) {
            console.error(`[GDrive] Failed to download shard ${file.name}:`, err);
          }
        }));
        
        return new Response(JSON.stringify({ success: true, shards: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      throw new Error(`Unsupported action: ${action}`);
    }

    // --- Legacy material preview logic ---
    const materialId = body.materialId as string | undefined;
    const isGroupFile = Boolean(body.isGroupFile);

    if (!materialId || typeof materialId !== "string") {
      return new Response(JSON.stringify({ error: "materialId or action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const table = isGroupFile ? "files" : "study_materials";
    const { data: row, error: rowErr } = await supabase
      .from(table)
      .select("file_url")
      .eq("id", materialId)
      .maybeSingle();

    if (rowErr || !row?.file_url) {
      return new Response(JSON.stringify({ error: "Material not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const driveId = extractDriveId(row.file_url);
    if (!driveId) {
      return new Response(JSON.stringify({ error: "Not a Google Drive file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const file = await fetchDrivePublicFile(driveId);
    if (!file) {
      return new Response(
        JSON.stringify({
          error:
            "Could not download from Drive (file may not be link-shared, or Google returned a login page).",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const base64 = bytesToBase64(file.data);

    return new Response(
      JSON.stringify({
        base64,
        mimeType: file.mime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
