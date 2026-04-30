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

    const removeBgKey = Deno.env.get("REMOVE_BG_API_KEY");
    if (!removeBgKey) {
      return json({ error: "Background removal not configured on server (set REMOVE_BG_API_KEY)" }, 400);
    }

    const form = new FormData();
    if (image) {
      const str = String(image);
      const match = str.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      if (match) {
        form.append("image_file_b64", match[2]);
      } else {
        form.append("image_file_b64", str);
      }
    } else {
      form.append("image_url", String(image_url));
    }

    form.append("size", "auto");
    form.append("format", "png");

    const resp = await fetchWithRetry("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": removeBgKey,
        "User-Agent": USER_AGENT,
      },
      body: form,
    }, { attempts: 3, backoffMs: 500 });

    if (!resp.ok) {
      let errMsg = `Remove.bg error ${resp.status}`;
      try {
        const payload = await resp.json();
        errMsg = payload?.errors?.[0]?.title ?? payload?.error ?? payload?.message ?? errMsg;
      } catch {
        // ignore
      }
      return json({ error: errMsg }, 400);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const b64 = arrayBufferToBase64(arrayBuffer);
    const contentType = resp.headers.get("Content-Type") ?? "image/png";
    const dataUrl = `data:${contentType};base64,${b64}`;

    return json({ resultDataUrl: dataUrl });
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
