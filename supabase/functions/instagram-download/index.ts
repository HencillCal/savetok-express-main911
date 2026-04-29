const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

const INSTAGRAM_URL_RE = /^https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|stories)\//i;
// Safe whitelist of hosts we will proxy media bytes from. Kept intentionally
// bounded — only Instagram/Meta CDNs and the small set of public extractor
// CDNs we actually rely on for redirected media URLs.
const ALLOWED_DOWNLOAD_HOSTS: readonly string[] = [
  // Instagram / Meta CDNs
  "cdninstagram.com",
  "fbcdn.net",
  "fna.fbcdn.net",
  "instagram.com",
  // Extractor CDNs that wrap the above with signed URLs
  "snapcdn.app",
  "snapinsta.app",
  "saveinsta.to",
  "igdownloader.app",
  "igram.world",
  "snapinsta.io",
  "sssinstagram.com",
  "instasave.website",
];

const MAX_DYNAMIC_HOSTS = 32;
const dynamicAllowedHosts = new Set<string>();

const isHostAllowed = (hostname: string) => {
  const h = hostname.toLowerCase();
  if (ALLOWED_DOWNLOAD_HOSTS.some((base) => h === base || h.endsWith(`.${base}`))) return true;
  if (dynamicAllowedHosts.has(h)) return true;
  return false;
};

const registerDynamicHost = (rawUrl: string) => {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (!host) return;
    if (ALLOWED_DOWNLOAD_HOSTS.some((base) => host === base || host.endsWith(`.${base}`))) return;
    // Only auto-trust hosts that look like Instagram/Meta CDN edges to stay safe.
    const looksLikeIgCdn = /(^|\.)cdninstagram\.com$/i.test(host)
      || /(^|\.)fbcdn\.net$/i.test(host)
      || /(^|\.)snapcdn\.app$/i.test(host)
      || /(^|\.)snapinsta\.(app|io)$/i.test(host);
    if (!looksLikeIgCdn) return;
    if (dynamicAllowedHosts.size >= MAX_DYNAMIC_HOSTS) return;
    dynamicAllowedHosts.add(host);
  } catch {
    // ignore malformed URLs
  }
};

type ParsedItem = {
  url: string;
  thumbnail: string | null;
  type: "image" | "video";
  filename: string;
};

const sanitizeFilename = (value: string) => value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "instagram-media";

async function proxyDownload(fileUrl: string, filename: string): Promise<Response> {
  const upstream = await fetch(fileUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://www.instagram.com/",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contentType = upstream.headers.get("Content-Type") || (filename.endsWith(".mp4") ? "video/mp4" : "image/jpeg");
  const contentLength = upstream.headers.get("Content-Length");

  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    "Cache-Control": "no-store",
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(upstream.body, { status: 200, headers });
}

const parseBetween = (source: string, start: string, end: string) => {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) return null;
  const slice = source.slice(startIndex + start.length);
  const endIndex = slice.indexOf(end);
  if (endIndex === -1) return null;
  return slice.slice(0, endIndex);
};

async function fetchSaveInstaPayload(targetUrl: string) {
  const landingHtml = await fetch("https://saveinsta.to/en/highlights", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
      Referer: "https://www.google.com/",
    },
  }).then((res) => res.text());

  const scriptChunk = parseBetween(landingHtml, 'var k_url_search="', "</script>");
  if (!scriptChunk) throw new Error("Failed to prepare Instagram fetch");

  const extractVar = (name: string) => {
    const match = scriptChunk.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`));
    return match?.[1] ?? null;
  };

  const kExp = extractVar("k_exp");
  const kToken = extractVar("k_token");

  if (!kExp || !kToken) throw new Error("Instagram token exchange failed");

  const verifyResponse = await fetch("https://saveinsta.to/api/userverify", {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://saveinsta.to",
      Referer: "https://saveinsta.to/en/video",
      "User-Agent": USER_AGENT,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ url: targetUrl }),
  }).then((res) => res.json());

  const cfToken = verifyResponse?.token;
  if (!cfToken) throw new Error("Instagram verification token missing");

  const finalResponse = await fetch("https://saveinsta.to/api/ajaxSearch", {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://saveinsta.to",
      Referer: "https://saveinsta.to/en/highlights",
      "User-Agent": USER_AGENT,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({
      k_exp: kExp,
      k_token: kToken,
      q: targetUrl,
      t: "media",
      lang: "en",
      v: "v2",
      cftoken: cfToken,
    }),
  }).then((res) => res.json());

  if (finalResponse?.status !== "ok" || !finalResponse?.data) {
    throw new Error("Could not fetch this Instagram link. Make sure it is public and still available.");
  }

  return finalResponse.data as string;
}

function parseMediaCards(html: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const cardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = cardRegex.exec(html))) {
    const block = match[1];
    const thumb = block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i)?.[1] ?? null;
    const videoHref = block.match(/<a[^>]+href="([^"]+)"[^>]*video/i)?.[1]
      ?? block.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Download Video\s*<\/a>/i)?.[1]
      ?? null;
    const imageHref = block.match(/<option[^>]+value="([^"]+)"/i)?.[1]
      ?? block.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Download Photo\s*<\/a>/i)?.[1]
      ?? null;

    const href = videoHref ?? imageHref;
    if (!href) continue;

    index += 1;
    const type = videoHref ? "video" : "image";
    registerDynamicHost(href);
    if (thumb) registerDynamicHost(thumb);
    items.push({
      url: href,
      thumbnail: thumb,
      type,
      filename: `instagram-${type}-${index}.${type === "video" ? "mp4" : "jpg"}`,
    });
  }

  return items;
}

function inferSourceType(url: string): "reel" | "post" | "story" {
  if (/\/stories\//i.test(url)) return "story";
  if (/\/reel\//i.test(url)) return "reel";
  return "post";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const u = new URL(req.url);
      const fileUrl = u.searchParams.get("file");
      const filename = sanitizeFilename(u.searchParams.get("filename") || "instagram-media");
      if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
        return new Response(JSON.stringify({ error: "Missing or invalid file URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let fileHost = "";
      try { fileHost = new URL(fileUrl).hostname; } catch { /* invalid */ }
      if (!fileHost || !isHostAllowed(fileHost)) {
        return new Response(JSON.stringify({ error: "Host not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return await proxyDownload(fileUrl, filename);
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing Instagram URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!INSTAGRAM_URL_RE.test(url)) {
      return new Response(JSON.stringify({ error: "Please enter a valid public Instagram reel, post, or story URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceType = inferSourceType(url);
    const html = await fetchSaveInstaPayload(url);
    const items = parseMediaCards(html);

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "No downloadable media found for this Instagram link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caption = html.match(/<div[^>]*class="[^\"]*post__caption[^\"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? null;
    const username = url.match(/instagram\.com\/stories\/([^/?#]+)/i)?.[1] ?? null;

    return new Response(JSON.stringify({
      sourceType,
      caption,
      username,
      profilePic: null,
      items,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("instagram-download error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});