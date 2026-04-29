import {
  corsHeaders,
  decodeHtml,
  extractMeta,
  fetchWithRetry,
  json,
  proxyDownloadResponse,
  resolveShortUrl,
  sanitizeFilename,
  uniq,
  USER_AGENT,
} from "../_shared/http.ts";

const ALLOWED_DOWNLOAD_HOSTS = [
  "linkedin.com",
  "licdn.com",
] as const;

const LINKEDIN_URL_RE = /^https?:\/\/(?:www\.)?linkedin\.com\/(?:posts\/|feed\/update\/)/i;

const decodeEscaped = (value: string) =>
  value.replace(/\\u0025/g, "%").replace(/\\u002F/g, "/").replace(/\\u0026/g, "&").replace(/\\\//g, "/");

const collectMatches = (html: string, pattern: RegExp) => {
  const items: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const value = decodeEscaped(match[1]);
    if (value.startsWith("http")) items.push(value);
  }
  return uniq(items);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const fileUrl = url.searchParams.get("file");
      const filename = sanitizeFilename(url.searchParams.get("filename") || "linkedin-media");
      if (!fileUrl) return json({ error: "Missing file URL" }, 400);
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
        referer: "https://www.linkedin.com/",
      });
    }

    const body = await req.json();
    const requestedUrl = body?.url;
    const requestedMode = typeof body?.mode === "string" ? body.mode : "post";
    if (!requestedUrl || typeof requestedUrl !== "string") {
      return json({ error: "Missing LinkedIn URL" }, 400);
    }

    const resolved = await resolveShortUrl(requestedUrl);
    const finalUrl = resolved.url;
    if (!LINKEDIN_URL_RE.test(finalUrl)) {
      return json({ error: "Please enter a valid public LinkedIn post URL" }, 400);
    }

    const response = await fetchWithRetry(finalUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    }, {
      attempts: 3,
      backoffMs: 450,
    });
    const html = await response.text();
    if (!response.ok) {
      return json({ error: "Could not fetch that LinkedIn post" }, 404);
    }

    const decodedHtml = decodeHtml(html);
    const videoUrls = collectMatches(decodedHtml, /"(https:\/\/media\.licdn\.com\/dms\/video\/[^"]+)"/gi);
    const imageUrls = collectMatches(decodedHtml, /"(https:\/\/media\.licdn\.com\/dms\/image\/[^"]+)"/gi);
    const metaImage = extractMeta(decodedHtml, "og:image");

    const videoItems = videoUrls.map((videoUrl, index) => ({
      id: `video-${index + 1}`,
      type: "video" as const,
      title: `LinkedIn video ${index + 1}`,
      thumbnail: metaImage,
      downloads: [
        {
          label: "MP4 video",
          url: videoUrl,
          filename: `linkedin-video-${index + 1}.mp4`,
          functionName: "linkedin-download",
        },
      ],
    }));

    const imageItems = uniq([...(metaImage ? [metaImage] : []), ...imageUrls]).map((imageUrl, index) => ({
      id: `image-${index + 1}`,
      type: "image" as const,
      title: `LinkedIn image ${index + 1}`,
      thumbnail: imageUrl,
      downloads: [
        {
          label: "Image",
          url: imageUrl,
          filename: `linkedin-image-${index + 1}.jpg`,
          functionName: "linkedin-download",
        },
      ],
    }));

    const items =
      requestedMode === "video"
        ? videoItems
        : requestedMode === "image"
          ? imageItems
          : [...videoItems, ...imageItems];

    if (!items.length) {
      return json({ error: "No downloadable public media found for that LinkedIn post" }, 404);
    }

    return json({
      platform: "linkedin",
      sourceType: requestedMode,
      title: extractMeta(decodedHtml, "og:title") ?? "LinkedIn post",
      caption: extractMeta(decodedHtml, "og:description") ?? null,
      username: null,
      authorName: null,
      profilePic: null,
      cover: items[0]?.thumbnail ?? null,
      items,
      resolvedUrl: finalUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
