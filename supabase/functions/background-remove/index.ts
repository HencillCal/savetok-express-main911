import { corsHeaders, json, USER_AGENT, fetchWithRetry } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { image, image_url } = body ?? {};

    if (!image && !image_url) {
      return json({ error: "Missing image (data URL) or image_url" }, 400);
    }

    // Support multiple keys: primary (comma-separated allowed) and an optional fallback.
    const primaryRaw = Deno.env.get("REMOVE_BG_API_KEY") ?? "";
    const fallbackRaw = Deno.env.get("REMOVE_BG_API_KEY_FALLBACK") ?? "";

    const keys = [
      ...primaryRaw.split(",").map((k) => k.trim()).filter(Boolean),
      ...fallbackRaw.split(",").map((k) => k.trim()).filter(Boolean),
    ];
    const uniqKeys = Array.from(new Set(keys));
    if (uniqKeys.length === 0) {
      return json({ error: "Background removal not configured on server (set REMOVE_BG_API_KEY)" }, 400);
    }

    const buildForm = () => {
      const f = new FormData();
      if (image) {
        const str = String(image);
        const match = str.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
        if (match) {
          f.append("image_file_b64", match[2]);
        } else {
          f.append("image_file_b64", str);
        }
      } else {
        f.append("image_url", String(image_url));
      }
      f.append("size", "auto");
      f.append("format", "png");
      return f;
    };

    let lastErr: string | null = null;
    for (const key of uniqKeys) {
      try {
        const form = buildForm();
        const resp = await fetchWithRetry("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: {
            "X-Api-Key": key,
            "User-Agent": USER_AGENT,
          },
          body: form,
        }, { attempts: 3, backoffMs: 500 });

        if (!resp.ok) {
          try {
            const payload = await resp.json();
            lastErr = payload?.errors?.[0]?.title ?? payload?.error ?? payload?.message ?? `Remove.bg error ${resp.status}`;
          } catch {
            lastErr = `Remove.bg error ${resp.status}`;
          }
          continue;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const b64 = arrayBufferToBase64(arrayBuffer);
        const contentType = resp.headers.get("Content-Type") ?? "image/png";
        const dataUrl = `data:${contentType};base64,${b64}`;

        return json({ resultDataUrl: dataUrl });
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }

    return json({ error: lastErr ?? "Background removal failed with configured keys" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32kb chunks
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
