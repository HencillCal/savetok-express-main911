import { corsHeaders, json, resolveShortUrl, USER_AGENT } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, url } = await req.json();
    if (!url || typeof url !== "string") {
      return json({ error: "Missing URL" }, 400);
    }
    if (!action || (action !== "resolve" && action !== "shorten")) {
      return json({ error: "Unsupported action" }, 400);
    }

    if (action === "resolve") {
      const resolved = await resolveShortUrl(url);
      return json({
        inputUrl: url,
        resolvedUrl: resolved.url,
        hops: resolved.hops,
      });
    }

    const officialToken = Deno.env.get("TINYURL_API_TOKEN");
    if (officialToken) {
      const response = await fetch("https://api.tinyurl.com/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${officialToken}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data?.tiny_url) {
        return json({ error: payload?.errors?.[0] ?? payload?.message ?? "TinyURL API failed" }, 400);
      }

      return json({
        inputUrl: url,
        shortUrl: payload.data.tiny_url,
        provider: "tinyurl-api",
      });
    }

    const legacyResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });
    const shortUrl = (await legacyResponse.text()).trim();
    if (!legacyResponse.ok || !/^https?:\/\/(?:www\.)?tinyurl\.com\//i.test(shortUrl)) {
      return json({ error: "TinyURL could not shorten that URL" }, 400);
    }

    return json({
      inputUrl: url,
      shortUrl,
      provider: "tinyurl-legacy",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
