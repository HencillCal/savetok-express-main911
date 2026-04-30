import { corsHeaders, json, resolveShortUrl, USER_AGENT, fetchWithRetry } from "../../supabase/functions/_shared/http.ts";

export const handleTinyUrl = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, url, provider } = body ?? {};
    if (!url || typeof url !== "string") return json({ error: "Missing URL" }, 400);
    if (!action || (action !== "resolve" && action !== "shorten")) return json({ error: "Unsupported action" }, 400);

    if (action === "resolve") {
      const resolved = await resolveShortUrl(url);
      return json({ inputUrl: url, resolvedUrl: resolved.url, hops: resolved.hops });
    }

    const selected = (provider && String(provider).toLowerCase()) || "tinyurl";

    if (selected === "is.gd") {
      const resp = await fetchWithRetry(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.shorturl) return json({ error: data?.errormessage ?? "is.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: data.shorturl, provider: "is.gd" });
    }

    if (selected === "v.gd") {
      const resp = await fetchWithRetry(`https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      const data = await resp.json();
      if (!resp.ok || !data?.shorturl) return json({ error: data?.errormessage ?? "v.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: data.shorturl, provider: "v.gd" });
    }

    if (selected === "da.gd") {
      const resp = await fetchWithRetry(`https://da.gd/s?url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      const text = (await resp.text()).trim();
      if (!resp.ok || !/^https?:\/\//i.test(text)) return json({ error: "da.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: text, provider: "da.gd" });
    }

    if (selected === "bitly") {
      const bitlyToken = Deno?.env?.get ? Deno.env.get("BITLY_TOKEN") : undefined;
      if (!bitlyToken) return json({ error: "Bitly not configured on server" }, 400);
      const resp = await fetchWithRetry("https://api-ssl.bitly.com/v4/shorten", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bitlyToken}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ long_url: url }),
      });
      const payload = await resp.json();
      if (!resp.ok || !payload?.link) return json({ error: payload?.message ?? "Bitly failed" }, 400);
      return json({ inputUrl: url, shortUrl: payload.link, provider: "bitly" });
    }

    const officialToken = (typeof process !== "undefined" && process.env && process.env.TINYURL_API_TOKEN) || undefined;
    if (officialToken) {
      const response = await fetchWithRetry("https://api.tinyurl.com/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${officialToken}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data?.tiny_url) return json({ error: payload?.errors?.[0] ?? payload?.message ?? "TinyURL API failed" }, 400);
      return json({ inputUrl: url, shortUrl: payload.data.tiny_url, provider: "tinyurl-api" });
    }

    const legacyResponse = await fetchWithRetry(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    const shortUrl = (await legacyResponse.text()).trim();
    if (!legacyResponse.ok || !/^https?:\/\/(?:www\.)?tinyurl\.com\//i.test(shortUrl)) return json({ error: "TinyURL could not shorten that URL" }, 400);
    return json({ inputUrl: url, shortUrl, provider: "tinyurl-legacy" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
};

export default handleTinyUrl;
