import { corsHeaders, json } from "../_shared/http.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { file_b64, filename, content_type } = body ?? {};

    if (!file_b64 || !filename) {
      return json({ error: "Missing file_b64 or filename" }, 400);
    }

    // Normalize / derive a safe content type. Some clients omit or misreport GIF MIME types.
    let contentType = String(content_type ?? "");
    if (!contentType || contentType === "application/octet-stream") {
      if (/\.gif$/i.test(String(filename))) contentType = "image/gif";
    }
    if (!contentType) {
      return json({ error: "Missing content_type" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Supabase storage not configured on server" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bucket = Deno.env.get("SUPABASE_UPLOADS_BUCKET") ?? "uploads";

    // Ensure bucket exists (ignore conflict errors)
    try {
      await supabase.storage.createBucket(bucket, { public: true });
    } catch {
      // ignore
    }

    const bytes = base64ToUint8Array(String(file_b64));
    const blob = new Blob([bytes], { type: contentType });
    const sanitized = filename.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-");
    const path = `background-uploads/${Date.now()}-${Math.random().toString(36).slice(2)}-${sanitized}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob as unknown as File, {
      contentType,
      upsert: false,
    });

    if (uploadError) {
      return json({ error: uploadError.message ?? "Upload failed" }, 500);
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return json({ fileUrl: publicData.publicUrl ?? publicData.publicURL ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
