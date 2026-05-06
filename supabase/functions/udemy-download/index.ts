import {
  corsHeaders,
  fetchWithRetry,
  json,
  proxyDownloadResponse,
  resolveShortUrl,
  sanitizeFilename,
  USER_AGENT,
} from "../_shared/http.ts";

// Allowed hosts for proxied downloads — common CDNs and Udemy domains.
const ALLOWED_DOWNLOAD_HOSTS = [
  "udemy.com",
  "udemycdn.com",
  "udemycdn.net",
  "cloudfront.net",
  "amazonaws.com",
  "akamaized.net",
] as const;

const extractMp4Urls = (html: string) => {
  const urls = new Set<string>();
  const mp4Regex = /https?:\\/\\/[^\"'\s>]+\\.mp4[^\"'\s>]*/gi;
  let m: RegExpExecArray | null;
  while ((m = mp4Regex.exec(html))) {
    const u = m[0];
    // keep entries that look like previews or originate from CDN hosts
    if (/preview|preview_asset|udemycdn|cloudfront|akamai|amazonaws|cdn/gi.test(u)) urls.add(u);
  }
  // also look for JSON style preview_url fields
  const jsonPreview = /"preview(?:_url)?"\s*:\s*"([^"]+)"/gi;
  while ((m = jsonPreview.exec(html))) {
    urls.add(m[1]);
  }
  return Array.from(urls);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    if (req.method === "GET" || req.method === "HEAD") {
      const url = new URL(req.url);
      const fileUrl = url.searchParams.get("file");
      const filename = sanitizeFilename(url.searchParams.get("filename") || "udemy-media");
      if (!fileUrl) return json({ error: "Missing file URL" }, 400);
      if (req.method === "HEAD") return new Response(null, { status: 204, headers: corsHeaders });
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS as unknown as string[], {
        referer: "https://www.udemy.com/",
        userAgent: USER_AGENT,
        forceRangeRequest: true,
      });
    }

    const body = await req.json();
    const requestedUrl = body?.url;
    const requestedMode = typeof body?.mode === "string" ? body.mode : "preview";
    if (!requestedUrl || typeof requestedUrl !== "string") return json({ error: "Missing Udemy URL" }, 400);

    const resolved = await resolveShortUrl(requestedUrl);
    const finalUrl = resolved.url;

    // Public preview extraction (no credentials)
    if (requestedMode === "preview") {
      const resp = await fetchWithRetry(finalUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }, { attempts: 5, backoffMs: 600 });

      if (!resp.ok) {
        // If we have an external scraper configured, try it as a fallback
        const scraper = Deno.env.get("UDEMY_SCRAPER_URL");
        if (scraper) {
          try {
            const fallback = await fetch(`${scraper.replace(/\/+$/, "")}/functions/v1/udemy-download`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ url: requestedUrl, mode: "preview" }),
            });
            if (fallback.ok) return json(await fallback.json());
          } catch {
            // ignore fallback failure and return original error below
          }
        }
        return json({ error: `Udemy page fetch failed ${resp.status}` }, 400);
      }

      const html = await resp.text();

      // Try to extract MP4 preview URLs heuristically
      let candidates = extractMp4Urls(html);
      if (!candidates.length) {
        // Try external scraper if configured
        const scraper = Deno.env.get("UDEMY_SCRAPER_URL");
        if (scraper) {
          try {
            const fallback = await fetch(`${scraper.replace(/\/+$/, "")}/functions/v1/udemy-download`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ url: requestedUrl, mode: "preview" }),
            });
            if (fallback.ok) return json(await fallback.json());
          } catch {
            // ignore fallback failure and continue
          }
        }
        return json({ error: "No public preview media found on that page" }, 404);
      }

      const items = candidates.map((u, i) => ({
        id: `preview-${i + 1}`,
        type: "video",
        title: `Preview ${i + 1}`,
        description: null,
        thumbnail: null,
        downloads: [
          {
            label: "Preview MP4",
            url: u,
            filename: `udemy-preview-${i + 1}.mp4`,
            functionName: "udemy-download",
          },
        ],
      }));

      return json({
        platform: "udemy",
        sourceType: "preview",
        title: null,
        caption: null,
        username: null,
        authorName: null,
        profilePic: null,
        cover: items[0]?.thumbnail ?? null,
        items,
        resolvedUrl: finalUrl,
      });
    }

    // Owner / instructor flow (requires Udemy API token or client credentials)
    if (requestedMode === "owner" || requestedMode === "course") {
      const token = body?.udemy_api_token || Deno.env.get("UDEMY_API_TOKEN");
      if (!token) {
        return json({
          error:
            "Owner mode requires a Udemy API token. Provide `udemy_api_token` in the request body or set the UDEMY_API_TOKEN environment variable.\n" +
            "I can implement full course exports once you confirm you own the content and provide credentials.",
        }, 400);
      }

      // Basic implementation attempt: try Udemy API search by course slug (best-effort).
      // NOTE: Udemy API access and exact endpoints may differ; this is a best-effort scaffold.
      try {
        // Try to extract a course slug from the final URL
        const slugMatch = finalUrl.match(/udemy\.com\/course\/([^\/\?]+)/i);
        const slug = slugMatch ? slugMatch[1] : null;
        if (!slug) return json({ error: "Could not determine course slug from URL" }, 400);

        // Use Udemy API search endpoint (requires valid token)
        const apiResp = await fetchWithRetry(`https://www.udemy.com/api-2.0/courses/?search=${encodeURIComponent(slug)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": USER_AGENT,
            Accept: "application/json",
          },
        }, { attempts: 3, backoffMs: 500 });

        if (!apiResp.ok) {
          const txt = await apiResp.text().catch(() => "");
          return json({ error: `Udemy API error ${apiResp.status}: ${txt}` }, 502);
        }

        const payload = await apiResp.json();
        // Sanity check — return list of courses found; full curriculum extraction requires further API calls and permission checks.
        return json({ message: "Udemy owner API scaffold: course search returned", payload });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Udemy API request failed";
        return json({ error: msg }, 500);
      }
    }

    return json({ error: "Unsupported mode" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
