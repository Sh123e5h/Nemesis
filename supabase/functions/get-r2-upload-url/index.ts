// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.433.0";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.433.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { filePath, contentType, size } = await req.json();

    // 1. Initialize Supabase Admin strictly for Server-side Usage Checks
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Compute Total usage on R2
    const { data: usageData, error: dbErr } = await supabase
      .from('storage_objects')
      .select('size_bytes')
      .eq('bucket_id', 'r2');

    if (dbErr) throw dbErr;

    const totalUsage = usageData?.reduce((sum: number, obj: any) => sum + (obj.size_bytes || 0), 0) || 0;
    const R2_LIMIT = 9.5 * 1024 * 1024 * 1024; // 9.5 GB

    if (totalUsage + (size || 0) > R2_LIMIT) {
      return new Response(JSON.stringify({ 
        error: `Cloudflare R2 9.5GB limit reached. Current usage: ${(totalUsage / 1024 / 1024 / 1024).toFixed(2)} GB` 
      }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 3. Setup S3 Client for Signature
    const client = new S3Client({
      endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: {
        accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID") || "",
        secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY") || ""
      }
    });

    const command = new PutObjectCommand({
      Bucket: Deno.env.get("R2_BUCKET_NAME"),
      Key: filePath,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    return new Response(JSON.stringify({ url }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
