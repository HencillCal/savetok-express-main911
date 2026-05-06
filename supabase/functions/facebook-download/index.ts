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
import { mergeMp4Response, validateMp4MergeRequest } from "../_shared/merge.ts";

const ALLOWED_DOWNLOAD_HOSTS = [
  "facebook.com",
  "fbcdn.net",
  "fna.fbcdn.net",
  "cdn.fbsbx.com",
  "scontent.xx.fbcdn.net",
] as const;

const FACEBOOK_URL_RE = /^https?:\/\/(?:(?:www|m|mbasic)\.)?(?:facebook\.com|fb\.watch)\//i;

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

const collectDashBaseUrls = (html: string, mediaKind: "video" | "audio") => {
  const decoded = decodeEscaped(html);
  const sections = decoded.match(new RegExp(`<AdaptationSet[^>]+mimeType="${mediaKind}\\/mp4"[\\s\\S]*?<\\/AdaptationSet>`, "gi")) ?? [];
  return uniq(sections.flatMap((section) => collectMatches(section, /<BaseURL>(https?:[^<]+)<\/BaseURL>/gi)));
};

const toMobileUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.hostname === "fb.watch") return value;
    url.hostname = "m.facebook.com";
    return url.toString();
  } catch {
    return value;
  }
};

const normalizeFacebookUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.hostname === "facebook.com" || url.hostname === "m.facebook.com" || url.hostname === "mbasic.facebook.com") {
      url.hostname = "www.facebook.com";
    }
    return url.toString();
  } catch {
    return value;
  }
};

const extractVideoId = (value: string) => {
  try {
    const url = new URL(value);
    const watchId = url.searchParams.get("v");
    if (watchId) return watchId;

    const reelMatch = url.pathname.match(/\/reel\/(\d+)/i);
    if (reelMatch) return reelMatch[1];

    const videosMatch = url.pathname.match(/\/videos\/(\d+)/i);
    if (videosMatch) return videosMatch[1];

    return null;
  } catch {
    return null;
  }
};

const buildPageCandidates = (value: string) => {
  const normalized = normalizeFacebookUrl(value);
  const videoId = extractVideoId(normalized);
  return uniq([
    normalized,
    ...(videoId ? [`https://www.facebook.com/watch/?v=${videoId}`] : []),
    toMobileUrl(normalized),
  ]);
};

const hasMediaMarkers = (html: string) =>
  /browser_native_(?:hd|sd)_url|playable_url(?:_quality_hd)?|property=["']og:(?:video|image)["']|<BaseURL>https?:|scaledImageFitWidth/i
    .test(html);

const fetchPageHtml = async (requestedUrl: string) => {
  const errors: string[] = [];

  for (const candidate of buildPageCandidates(requestedUrl)) {
    try {
      const response = await fetchWithRetry(candidate, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }, {
        attempts: 3,
        backoffMs: 400,
      });
      const html = await response.text();
      if (!response.ok) {
        errors.push(`${candidate}: ${response.status}`);
        continue;
      }

      const decodedHtml = decodeHtml(html);
      if (!hasMediaMarkers(decodedHtml)) {
        errors.push(`${candidate}: no media markers`);
        continue;
      }

      return {
        html: decodedHtml,
        resolvedUrl: response.url || candidate,
      };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }

  throw new Error(errors[0] ? `Could not fetch that Facebook page (${errors[0]})` : "Could not fetch that Facebook page");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method === "GET" || req.method === "HEAD") {
      const url = new URL(req.url);
      const fileUrl = url.searchParams.get("file");
      const audioUrl = url.searchParams.get("audio");
      const merge = url.searchParams.get("merge");
      const filename = sanitizeFilename(url.searchParams.get("filename") || "facebook-media");
      if (!fileUrl) return json({ error: "Missing file URL" }, 400);
      if (merge === "mux-mp4") {
        if (req.method === "HEAD") {
          await validateMp4MergeRequest(fileUrl, audioUrl, ALLOWED_DOWNLOAD_HOSTS, {
            referer: "https://www.facebook.com/",
          });
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        return await mergeMp4Response(fileUrl, audioUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
          referer: "https://www.facebook.com/",
          defaultFilename: "facebook-media",
        });
      }
      if (req.method === "HEAD") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
        referer: "https://www.facebook.com/",
      });
    }

    const body = await req.json();
    const requestedUrl = body?.url;
    const requestedMode = typeof body?.mode === "string" ? body.mode : "post";
    if (!requestedUrl || typeof requestedUrl !== "string") {
      return json({ error: "Missing Facebook URL" }, 400);
    }

    const resolved = await resolveShortUrl(requestedUrl);
    const finalUrl = resolved.url;
    if (!FACEBOOK_URL_RE.test(finalUrl)) {
      return json({ error: "Please enter a valid public Facebook URL" }, 400);
    }

    const page = await fetchPageHtml(finalUrl);
    const decodedHtml = page.html;
    const hdVideos = collectMatches(decodedHtml, /(?:browser_native_hd_url|playable_url_quality_hd)"?:\s*"([^"]+)"/gi);
    const sdVideos = collectMatches(decodedHtml, /(?:browser_native_sd_url|playable_url)"?:\s*"([^"]+)"/gi);
    const metaVideos = collectMatches(decodedHtml, /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/gi);
    const dashVideoUrls = collectDashBaseUrls(decodedHtml, "video");
    const dashAudioUrls = collectDashBaseUrls(decodedHtml, "audio");
    const imageUrls = collectMatches(decodedHtml, /(?:scaledImageFitWidth|image)"?:\s*\{[^}]*"uri"\s*:\s*"([^"]+)"/gi);
    const metaImages = collectMatches(decodedHtml, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);

    const progressiveVideos = uniq([...hdVideos, ...sdVideos, ...metaVideos]);
    const dashOnlyVideos = dashVideoUrls.filter((videoUrl) => !progressiveVideos.includes(videoUrl));
    const videoDownloads = uniq([...progressiveVideos, ...dashOnlyVideos]);
    const imageDownloads = uniq([...imageUrls, ...metaImages]);
    const mergedDashPrimary = !progressiveVideos.length && dashOnlyVideos[0] && dashAudioUrls[0]
      ? [{
          label: "Merged MP4",
          url: dashOnlyVideos[0],
          filename: "facebook-merged-1.mp4",
          functionName: "facebook-download",
          mergeStrategy: "mux-mp4" as const,
          mergeAudioUrl: dashAudioUrls[0],
        }]
      : [];

    const videoItems = videoDownloads.length
      ? [{
          id: "video-1",
          type: "video" as const,
          title: "Facebook video",
          description: mergedDashPrimary.length
            ? "Server will automatically merge the DASH video and audio tracks into one MP4."
            : dashOnlyVideos.length || dashAudioUrls.length
              ? "This source exposes separate DASH video and audio files."
              : null,
          thumbnail: imageDownloads[0] ?? null,
          downloads: [
            ...mergedDashPrimary,
            ...hdVideos.map((videoUrl, index) => ({
              label: `HD video ${index + 1}`,
              url: videoUrl,
              filename: `facebook-hd-${index + 1}.mp4`,
              functionName: "facebook-download",
            })),
            ...sdVideos
              .filter((videoUrl) => !hdVideos.includes(videoUrl))
              .map((videoUrl, index) => ({
                label: `SD video ${index + 1}`,
                url: videoUrl,
                filename: `facebook-sd-${index + 1}.mp4`,
                functionName: "facebook-download",
              })),
            ...dashOnlyVideos.map((videoUrl, index) => ({
              label: `DASH video ${index + 1}`,
              url: videoUrl,
              filename: `facebook-dash-video-${index + 1}.mp4`,
              functionName: "facebook-download",
            })),
            ...dashAudioUrls.map((audioUrl, index) => ({
              label: `DASH audio ${index + 1}`,
              url: audioUrl,
              filename: `facebook-dash-audio-${index + 1}.m4a`,
              functionName: "facebook-download",
            })),
          ],
        }]
      : [];

    const imageItems = imageDownloads
      .filter((imageUrl) => !imageUrl.includes("safe_image.php"))
      .map((imageUrl, index) => ({
        id: `image-${index + 1}`,
        type: "image" as const,
        title: `Image ${index + 1}`,
        thumbnail: imageUrl,
        downloads: [
          {
            label: "Original image",
            url: imageUrl,
            filename: `facebook-image-${index + 1}.jpg`,
            functionName: "facebook-download",
          },
        ],
      }));

    const items =
      requestedMode === "video" || requestedMode === "reel"
        ? videoItems
        : requestedMode === "post"
          ? [...videoItems, ...imageItems]
          : [...videoItems, ...imageItems];

    if (!items.length) {
      return json({ error: "No downloadable media found for that Facebook link" }, 404);
    }

    return json({
      platform: "facebook",
      sourceType: requestedMode,
      title: extractMeta(decodedHtml, "og:title") ?? "Facebook media",
      caption: extractMeta(decodedHtml, "og:description") ?? null,
      username: null,
      authorName: null,
      profilePic: null,
      cover: items[0]?.thumbnail ?? null,
      items,
      resolvedUrl: page.resolvedUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, message.includes("Could not fetch that Facebook page") ? 404 : 500);
  }
});
