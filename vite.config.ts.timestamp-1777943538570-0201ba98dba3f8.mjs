// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/Jinwiil%20Onginjo/Desktop/savetok-express-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Jinwiil%20Onginjo/Desktop/savetok-express-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { Readable } from "node:stream";
import { componentTagger } from "file:///C:/Users/Jinwiil%20Onginjo/Desktop/savetok-express-main/node_modules/lovable-tagger/dist/index.js";

// supabase/functions/_shared/http.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type"
};
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
var json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
var sanitizeFilename = (value, fallback = "download") => value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
var isAllowedHost = (hostname, allowedHosts) => {
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};
var decodeHtml = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/gi, "/").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
var uniq = (items) => Array.from(new Set(items));
var extractMeta = (html, property) => {
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  );
  return match ? decodeHtml(match[1]) : null;
};
var isRedirectStatus = (status) => [301, 302, 303, 307, 308].includes(status);
var RETRYABLE_STATUSES = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(input, init, options) {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const backoffMs = Math.max(0, options?.backoffMs ?? 350);
  const retryableStatuses = new Set(options?.retryableStatuses ?? [...RETRYABLE_STATUSES]);
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!retryableStatuses.has(response.status) || attempt === attempts - 1) {
        return response;
      }
      await response.body?.cancel().catch(() => void 0);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network request failed");
      if (attempt === attempts - 1) break;
    }
    await sleep(backoffMs * (attempt + 1));
  }
  throw lastError ?? new Error("Request failed after retries");
}
async function resolveShortUrl(input, maxHops = 6) {
  let current = input;
  const hops = [];
  for (let index = 0; index < maxHops; index += 1) {
    let parsed;
    try {
      parsed = new URL(current);
    } catch {
      break;
    }
    const allowedShortenerHosts = [
      "tinyurl.com",
      "tiny.one",
      "is.gd",
      "v.gd",
      "da.gd",
      "bit.ly",
      "t.co",
      "tiny.cc",
      "shorturl.at",
      "rebrand.ly",
      "cutt.ly",
      "t.ly",
      "ow.ly",
      "short.io",
      "buff.ly",
      "lnkd.in",
      "trib.al",
      "soo.gd",
      "su.pr",
      "bit.do",
      "qr.ae",
      "chilp.it",
      "ity.im",
      "po.st",
      "snip.ly",
      "bc.vc",
      "u.nu"
    ];
    if (!isAllowedHost(parsed.hostname, allowedShortenerHosts)) break;
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT
      }
    });
    if (!isRedirectStatus(response.status)) break;
    const location = response.headers.get("Location");
    if (!location) break;
    current = new URL(location, current).toString();
    hops.push(current);
  }
  return { url: current, hops };
}
async function proxyDownloadResponse(fileUrl, filename, allowedHosts, options) {
  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch {
    return json({ error: "Missing or invalid file URL" }, 400);
  }
  if (!isAllowedHost(parsed.hostname, allowedHosts)) {
    return json({ error: "Host not allowed" }, 400);
  }
  const upstream = await fetchWithRetry(fileUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": options?.userAgent || USER_AGENT,
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      ...options?.referer ? { Referer: options.referer } : {},
      ...options?.forceRangeRequest ? { Range: "bytes=0-" } : {}
    }
  }, {
    attempts: 3,
    backoffMs: 500
  });
  if (!upstream.ok || !upstream.body) {
    return json({ error: `Upstream error: ${upstream.status}` }, 502);
  }
  const contentType = upstream.headers.get("Content-Type") || options?.defaultContentType || "application/octet-stream";
  const contentLength = upstream.headers.get("Content-Length");
  const headers = {
    ...corsHeaders,
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
    "Cache-Control": "no-store"
  };
  if (contentLength) headers["Content-Length"] = contentLength;
  return new Response(upstream.body, { status: 200, headers });
}

// dev/functions/merge.ts
import {
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  StreamTarget,
  UrlSource
} from "file:///C:/Users/Jinwiil%20Onginjo/Desktop/savetok-express-main/node_modules/mediabunny/dist/modules/src/index.js";
var networkHeaders = (referer, userAgent = USER_AGENT) => ({
  "User-Agent": userAgent,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  ...referer ? { Referer: referer } : {}
});
var createUrlSource = (fileUrl, referer, userAgent) => new UrlSource(fileUrl, {
  requestInit: {
    headers: networkHeaders(referer, userAgent)
  },
  fetchFn: (url, requestInit) => {
    const headers = new Headers(requestInit?.headers);
    const baseHeaders = new Headers(networkHeaders(referer, userAgent));
    baseHeaders.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
    return fetch(url, {
      ...requestInit,
      headers
    });
  },
  maxCacheSize: 16 * 1024 * 1024,
  parallelism: 2,
  getRetryDelay: (previousAttempts) => previousAttempts >= 2 ? null : 0.35 * (previousAttempts + 1)
});
var validateFileUrl = (value, allowedHosts) => {
  if (!value) throw new Error("Missing file URL");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Missing or invalid file URL");
  }
  if (!isAllowedHost(parsed.hostname, allowedHosts)) {
    throw new Error("Host not allowed");
  }
  return parsed.toString();
};
var asErrorResponse = (error) => {
  const message = error instanceof Error ? error.message : "Merge failed";
  const status = message === "Host not allowed" || message.startsWith("Missing") || message.startsWith("Unsupported") || message.startsWith("Could not read") ? 400 : 500;
  return json({ error: message }, status);
};
var createProbeInputs = (videoUrl, audioUrl, referer, userAgent) => {
  const videoInput = new Input({
    formats: [MP4, QTFF],
    source: createUrlSource(videoUrl, referer, userAgent)
  });
  const audioInput = new Input({
    formats: [MP4, QTFF],
    source: createUrlSource(audioUrl, referer, userAgent)
  });
  return { videoInput, audioInput };
};
async function probeTracks(videoUrl, audioUrl, referer, userAgent) {
  const { videoInput, audioInput } = createProbeInputs(videoUrl, audioUrl, referer, userAgent);
  try {
    const [videoTrack, audioTrack] = await Promise.all([
      videoInput.getPrimaryVideoTrack(),
      audioInput.getPrimaryAudioTrack()
    ]);
    if (!videoTrack || !audioTrack) {
      throw new Error("Could not read compatible video and audio tracks for merge");
    }
    if (!videoTrack.codec || !audioTrack.codec) {
      throw new Error("Unsupported track codec for MP4 merge");
    }
    const [videoConfig, audioConfig] = await Promise.all([
      videoTrack.getDecoderConfig(),
      audioTrack.getDecoderConfig()
    ]);
    if (!videoConfig || !audioConfig) {
      throw new Error("Missing decoder configuration for MP4 merge");
    }
    return { videoTrack, audioTrack, videoConfig, audioConfig, videoInput, audioInput };
  } catch (error) {
    videoInput.dispose();
    audioInput.dispose();
    throw error;
  }
}
var pipeVideoPackets = async (track, source, decoderConfig) => {
  const sink = new EncodedPacketSink(track);
  let first = true;
  for await (const packet of sink.packets()) {
    if (first) {
      await source.add(packet, { decoderConfig });
      first = false;
    } else {
      await source.add(packet);
    }
  }
  if (first) {
    throw new Error("Video track has no packets");
  }
};
var pipeAudioPackets = async (track, source, decoderConfig) => {
  const sink = new EncodedPacketSink(track);
  let first = true;
  for await (const packet of sink.packets()) {
    if (first) {
      await source.add(packet, { decoderConfig });
      first = false;
    } else {
      await source.add(packet);
    }
  }
  if (first) {
    throw new Error("Audio track has no packets");
  }
};
async function validateMp4MergeRequest(videoUrl, audioUrl, allowedHosts, options) {
  const safeVideoUrl = validateFileUrl(videoUrl, allowedHosts);
  const safeAudioUrl = validateFileUrl(audioUrl, allowedHosts);
  const { videoInput, audioInput } = await probeTracks(safeVideoUrl, safeAudioUrl, options?.referer, options?.userAgent);
  videoInput.dispose();
  audioInput.dispose();
}
async function mergeMp4Response(videoUrl, audioUrl, filename, allowedHosts, options) {
  try {
    const safeVideoUrl = validateFileUrl(videoUrl, allowedHosts);
    const safeAudioUrl = validateFileUrl(audioUrl, allowedHosts);
    const {
      videoTrack,
      audioTrack,
      videoConfig,
      audioConfig,
      videoInput,
      audioInput
    } = await probeTracks(safeVideoUrl, safeAudioUrl, options?.referer, options?.userAgent);
    const videoSource = new EncodedVideoPacketSource(videoTrack.codec);
    const audioSource = new EncodedAudioPacketSource(audioTrack.codec);
    const stream = new TransformStream();
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new StreamTarget(stream.writable, {
        chunked: true,
        chunkSize: 1024 * 1024
      })
    });
    output.addVideoTrack(videoSource);
    output.addAudioTrack(audioSource);
    const task = (async () => {
      try {
        await output.start();
        await Promise.all([
          pipeVideoPackets(videoTrack, videoSource, videoConfig),
          pipeAudioPackets(audioTrack, audioSource, audioConfig)
        ]);
        await output.finalize();
      } catch (error) {
        await output.cancel().catch(() => void 0);
        await stream.writable.abort(error).catch(() => void 0);
      } finally {
        videoInput.dispose();
        audioInput.dispose();
      }
    })();
    return new Response(stream.readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(filename, options?.defaultFilename ?? "merged-media")}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}

// dev/functions/facebook.ts
var ALLOWED_DOWNLOAD_HOSTS = [
  "facebook.com",
  "fbcdn.net",
  "fna.fbcdn.net",
  "cdn.fbsbx.com",
  "scontent.xx.fbcdn.net"
];
var FACEBOOK_URL_RE = /^https?:\/\/(?:(?:www|m|mbasic)\.)?(?:facebook\.com|fb\.watch)\//i;
var decodeEscaped = (value) => value.replace(/\\u0025/g, "%").replace(/\\u002F/g, "/").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
var collectMatches = (html, pattern) => {
  const items = [];
  let match;
  while (match = pattern.exec(html)) {
    const value = decodeEscaped(match[1]);
    if (value.startsWith("http")) items.push(value);
  }
  return uniq(items);
};
var collectDashBaseUrls = (html, mediaKind) => {
  const decoded = decodeEscaped(html);
  const sections = decoded.match(new RegExp(`<AdaptationSet[^>]+mimeType="${mediaKind}\\/mp4"[\\s\\S]*?<\\/AdaptationSet>`, "gi")) ?? [];
  return uniq(sections.flatMap((section) => collectMatches(section, /<BaseURL>(https?:[^<]+)<\/BaseURL>/gi)));
};
var toMobileUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname === "fb.watch") return value;
    url.hostname = "m.facebook.com";
    return url.toString();
  } catch {
    return value;
  }
};
var normalizeFacebookUrl = (value) => {
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
var extractVideoId = (value) => {
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
var buildPageCandidates = (value) => {
  const normalized = normalizeFacebookUrl(value);
  const videoId = extractVideoId(normalized);
  return uniq([
    normalized,
    ...videoId ? [`https://www.facebook.com/watch/?v=${videoId}`] : [],
    toMobileUrl(normalized)
  ]);
};
var hasMediaMarkers = (html) => /browser_native_(?:hd|sd)_url|playable_url(?:_quality_hd)?|property=["']og:(?:video|image)["']|<BaseURL>https?:|scaledImageFitWidth/i.test(html);
var fetchPageHtml = async (requestedUrl) => {
  const errors = [];
  for (const candidate of buildPageCandidates(requestedUrl)) {
    try {
      const response = await fetchWithRetry(candidate, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      }, {
        attempts: 3,
        backoffMs: 400
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
        resolvedUrl: response.url || candidate
      };
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }
  throw new Error(errors[0] ? `Could not fetch that Facebook page (${errors[0]})` : "Could not fetch that Facebook page");
};
var handleFacebookDownload = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
            referer: "https://www.facebook.com/"
          });
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        return await mergeMp4Response(fileUrl, audioUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
          referer: "https://www.facebook.com/",
          defaultFilename: "facebook-media"
        });
      }
      if (req.method === "HEAD") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
        referer: "https://www.facebook.com/"
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
    const mergedDashPrimary = !progressiveVideos.length && dashOnlyVideos[0] && dashAudioUrls[0] ? [{
      label: "Merged MP4",
      url: dashOnlyVideos[0],
      filename: "facebook-merged-1.mp4",
      functionName: "facebook-download",
      mergeStrategy: "mux-mp4",
      mergeAudioUrl: dashAudioUrls[0]
    }] : [];
    const videoItems = videoDownloads.length ? [{
      id: "video-1",
      type: "video",
      title: "Facebook video",
      description: mergedDashPrimary.length ? "Server will automatically merge the DASH video and audio tracks into one MP4." : dashOnlyVideos.length || dashAudioUrls.length ? "This source exposes separate DASH video and audio files." : null,
      thumbnail: imageDownloads[0] ?? null,
      downloads: [
        ...mergedDashPrimary,
        ...hdVideos.map((videoUrl, index) => ({
          label: `HD video ${index + 1}`,
          url: videoUrl,
          filename: `facebook-hd-${index + 1}.mp4`,
          functionName: "facebook-download"
        })),
        ...sdVideos.filter((videoUrl) => !hdVideos.includes(videoUrl)).map((videoUrl, index) => ({
          label: `SD video ${index + 1}`,
          url: videoUrl,
          filename: `facebook-sd-${index + 1}.mp4`,
          functionName: "facebook-download"
        })),
        ...dashOnlyVideos.map((videoUrl, index) => ({
          label: `DASH video ${index + 1}`,
          url: videoUrl,
          filename: `facebook-dash-video-${index + 1}.mp4`,
          functionName: "facebook-download"
        })),
        ...dashAudioUrls.map((audioUrl, index) => ({
          label: `DASH audio ${index + 1}`,
          url: audioUrl,
          filename: `facebook-dash-audio-${index + 1}.m4a`,
          functionName: "facebook-download"
        }))
      ]
    }] : [];
    const imageItems = imageDownloads.filter((imageUrl) => !imageUrl.includes("safe_image.php")).map((imageUrl, index) => ({
      id: `image-${index + 1}`,
      type: "image",
      title: `Image ${index + 1}`,
      thumbnail: imageUrl,
      downloads: [
        {
          label: "Original image",
          url: imageUrl,
          filename: `facebook-image-${index + 1}.jpg`,
          functionName: "facebook-download"
        }
      ]
    }));
    const items = requestedMode === "video" || requestedMode === "reel" ? videoItems : requestedMode === "post" ? [...videoItems, ...imageItems] : [...videoItems, ...imageItems];
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
      resolvedUrl: page.resolvedUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, message.includes("Could not fetch that Facebook page") ? 404 : 500);
  }
};

// dev/functions/paystack.ts
import { createClient } from "file:///C:/Users/Jinwiil%20Onginjo/Desktop/savetok-express-main/node_modules/@supabase/supabase-js/dist/index.mjs";
var PLAN_AMOUNT_KOBO = 3900;
var PLAN_CURRENCY = "KES";
var env = globalThis.process?.env ?? {};
var getSupabaseUrl = () => env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
var getSupabasePublishableKey = () => env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "";
var getSupabaseServiceKey = () => env.SUPABASE_SERVICE_ROLE_KEY ?? "";
var getPaystackSecretKey = () => env.PAYSTACK_SECRET_KEY ?? "";
var createAuthedClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseKey);
};
var createAdminClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
};
var requireAuthedUser = async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.replace("Bearer ", "");
  const client = createAuthedClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) {
    throw new Error("Unauthorized");
  }
  return {
    id: data.user.id,
    email: data.user.email
  };
};
var persistSubscriber = async (payload) => {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("subscribers").upsert(
    {
      user_id: payload.userId,
      email: payload.email,
      is_pro: payload.isPro,
      paystack_reference: payload.reference,
      paystack_customer_code: payload.customerCode ?? null,
      current_period_end: payload.currentPeriodEnd ?? null
    },
    { onConflict: "user_id" }
  );
};
var createPaystackReference = (userId) => `pro_${userId}_${Date.now()}`;
var handlePaystackInitialize = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const { id: userId, email } = await requireAuthedUser(req);
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      return json({ error: "PAYSTACK_SECRET_KEY is missing from .env" }, 500);
    }
    const body = await req.json().catch(() => ({}));
    const callbackUrl = typeof body?.callback_url === "string" && body.callback_url.trim().length > 0 ? body.callback_url : `${new URL(req.url).origin}/pro`;
    const reference = createPaystackReference(userId);
    const initResp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: PLAN_AMOUNT_KOBO,
        currency: PLAN_CURRENCY,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: userId, plan: "pro_monthly" }
      })
    });
    const initJson = await initResp.json();
    if (!initResp.ok || !initJson.status) {
      return json({ error: initJson.message || "Init failed" }, 502);
    }
    await persistSubscriber({
      userId,
      email,
      isPro: false,
      reference
    });
    return json({
      authorization_url: initJson.data?.authorization_url,
      access_code: initJson.data?.access_code,
      reference: initJson.data?.reference ?? reference
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return json({ error: message }, status);
  }
};
var handlePaystackVerify = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    const { id: userId, email } = await requireAuthedUser(req);
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      return json({ error: "PAYSTACK_SECRET_KEY is missing from .env" }, 500);
    }
    const body = await req.json().catch(() => ({}));
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return json({ error: "Missing reference" }, 400);
    }
    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    const verifyJson = await verifyResp.json();
    if (!verifyResp.ok || !verifyJson.status) {
      return json({ error: verifyJson.message || "Verify failed" }, 502);
    }
    const data = verifyJson.data;
    const isSuccess = data?.status === "success";
    const metadataUserId = data?.metadata?.user_id;
    if (metadataUserId && metadataUserId !== userId) {
      return json({ error: "Reference does not belong to user" }, 403);
    }
    if (!isSuccess) {
      return json({
        is_pro: false,
        status: data?.status ?? "unknown"
      });
    }
    const paidAt = data?.paid_at ? new Date(data.paid_at) : /* @__PURE__ */ new Date();
    const currentPeriodEnd = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString();
    await persistSubscriber({
      userId,
      email: email ?? data?.customer?.email ?? "",
      isPro: true,
      reference,
      customerCode: data?.customer?.customer_code ?? null,
      currentPeriodEnd
    });
    return json({
      is_pro: true,
      current_period_end: currentPeriodEnd
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return json({ error: message }, status);
  }
};

// dev/functions/youtube.ts
var ALLOWED_DOWNLOAD_HOSTS2 = [
  "googlevideo.com",
  "youtube.com",
  "youtu.be",
  "ytimg.com",
  "ggpht.com"
];
var INVIDIOUS_BASES = [
  "https://yewtu.be/api/v1",
  "https://inv.nadeko.net/api/v1",
  "https://vid.puffyan.us/api/v1"
];
var ANDROID_CLIENT_VERSION = "20.10.38";
var ANDROID_USER_AGENT = "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US; Pixel 8 Pro Build/AP1A.240505.005)";
var normalizeUrl = (url) => {
  if (url.startsWith("//")) return `https:${url}`;
  return url;
};
var numericQuality = (value) => parseInt((value ?? "0").replace(/\D/g, "") || "0", 10);
var numericBitrate = (value) => typeof value === "number" ? value : parseInt(value ?? "0", 10);
var joinRuns = (value) => {
  const text = value?.simpleText ?? value?.runs?.map((run) => run.text ?? "").join("");
  return text || void 0;
};
var extractVideoId2 = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname.endsWith("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2] ?? null;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] ?? null;
    return url.searchParams.get("v");
  } catch {
    return null;
  }
};
var extractPlaylistId = (value) => {
  try {
    const url = new URL(value);
    return url.searchParams.get("list");
  } catch {
    return null;
  }
};
var fetchFromInvidious = async (path2) => {
  let lastError = null;
  for (const base of INVIDIOUS_BASES) {
    try {
      const response = await fetchWithRetry(`${base}${path2}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json"
        }
      }, {
        attempts: 3,
        backoffMs: 450
      });
      if (!response.ok) {
        lastError = `Invidious error ${response.status}`;
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown Invidious error";
    }
  }
  throw new Error(lastError ?? "No YouTube source is available right now");
};
var extractInnertubeApiKey = (html) => html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ?? html.match(/["']INNERTUBE_API_KEY["']\s*:\s*["']([^"']+)["']/)?.[1] ?? null;
var fetchFromInnertube = async (videoId) => {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&bpctr=9999999999&has_verified=1&hl=en`;
  const watchResponse = await fetchWithRetry(watchUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    }
  }, {
    attempts: 3,
    backoffMs: 500
  });
  if (!watchResponse.ok) {
    throw new Error(`YouTube watch page error ${watchResponse.status}`);
  }
  const watchHtml = await watchResponse.text();
  const apiKey = extractInnertubeApiKey(watchHtml);
  if (!apiKey) {
    throw new Error("Could not read YouTube player configuration");
  }
  const playerResponse = await fetchWithRetry(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}&prettyPrint=false`, {
    method: "POST",
    headers: {
      "User-Agent": ANDROID_USER_AGENT,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: "https://www.youtube.com",
      Referer: watchResponse.url || watchUrl,
      "X-YouTube-Client-Name": "3",
      "X-YouTube-Client-Version": ANDROID_CLIENT_VERSION
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: ANDROID_CLIENT_VERSION,
          hl: "en",
          gl: "US"
        }
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true
    })
  }, {
    attempts: 3,
    backoffMs: 500
  });
  if (!playerResponse.ok) {
    throw new Error(`YouTube player API error ${playerResponse.status}`);
  }
  const payload = await playerResponse.json();
  const playability = payload.playabilityStatus?.status;
  if (playability && playability !== "OK") {
    throw new Error(
      payload.playabilityStatus?.reason ?? payload.playabilityStatus?.messages?.[0] ?? `YouTube playability status ${playability}`
    );
  }
  return payload;
};
var bestThumbnail = (thumbnails) => {
  const best = thumbnails?.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url ? normalizeUrl(best.url) : null;
};
var bestVideoStream = (video) => video.formatStreams?.filter((stream) => stream.url && stream.mimeType?.includes("video/mp4")).sort((a, b) => numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality))[0] ?? null;
var bestAdaptiveVideoStream = (video) => video.adaptiveFormats?.filter((stream) => stream.url && stream.mimeType?.includes("video/mp4")).sort((a, b) => numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality) || numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;
var bestAudioStream = (video) => video.adaptiveFormats?.filter((stream) => stream.url && stream.mimeType?.includes("audio/")).sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;
var bestMp4AudioStream = (video) => video.adaptiveFormats?.filter((stream) => stream.url && stream.mimeType?.includes("audio/mp4")).sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;
var audioExtension = (stream) => stream?.mimeType?.includes("webm") ? "webm" : "m4a";
var toYouTubeVideo = (payload) => ({
  title: payload.videoDetails?.title ?? joinRuns(payload.microformat?.playerMicroformatRenderer?.title) ?? "YouTube media",
  author: payload.videoDetails?.author ?? payload.microformat?.playerMicroformatRenderer?.ownerChannelName,
  authorId: payload.videoDetails?.channelId ?? payload.microformat?.playerMicroformatRenderer?.externalChannelId,
  description: payload.videoDetails?.shortDescription ?? joinRuns(payload.microformat?.playerMicroformatRenderer?.description),
  thumbnails: payload.videoDetails?.thumbnail?.thumbnails ?? payload.microformat?.playerMicroformatRenderer?.thumbnail?.thumbnails ?? [],
  formatStreams: payload.streamingData?.formats ?? [],
  adaptiveFormats: payload.streamingData?.adaptiveFormats ?? []
});
var makeVideoItem = (videoId, video, mode) => {
  const thumbnail = bestThumbnail(video.thumbnails) ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const progressiveVideoStream = bestVideoStream(video);
  const adaptiveVideoStream = progressiveVideoStream ? null : bestAdaptiveVideoStream(video);
  const videoStream = progressiveVideoStream ?? adaptiveVideoStream;
  const preferredMp4AudioStream = bestMp4AudioStream(video);
  const fallbackAudioStream = bestAudioStream(video);
  const audioStream = mode === "audio" ? fallbackAudioStream : preferredMp4AudioStream ?? fallbackAudioStream;
  const canMerge = mode !== "audio" && !progressiveVideoStream && Boolean(adaptiveVideoStream?.url) && Boolean(preferredMp4AudioStream?.url);
  const separateTracks = !progressiveVideoStream && Boolean(adaptiveVideoStream?.url) && Boolean(fallbackAudioStream?.url);
  const downloads = [];
  if (mode === "audio" && audioStream?.url) {
    downloads.push({
      label: "Audio",
      url: audioStream.url,
      filename: `${videoId}.${audioExtension(audioStream)}`,
      functionName: "youtube-download",
      quality: audioStream.audioQuality ?? null
    });
  }
  if (canMerge && adaptiveVideoStream?.url && preferredMp4AudioStream?.url) {
    downloads.push({
      label: "Merged MP4",
      url: adaptiveVideoStream.url,
      filename: `${videoId}.mp4`,
      functionName: "youtube-download",
      quality: adaptiveVideoStream.qualityLabel ?? adaptiveVideoStream.quality ?? null,
      mergeStrategy: "mux-mp4",
      mergeAudioUrl: preferredMp4AudioStream.url
    });
  }
  if (videoStream?.url) {
    downloads.push({
      label: [
        videoStream.qualityLabel ?? videoStream.quality ?? "Video",
        canMerge || separateTracks ? "video only" : null
      ].filter(Boolean).join(" "),
      url: videoStream.url,
      filename: `${videoId}.mp4`,
      functionName: "youtube-download",
      quality: videoStream.qualityLabel ?? videoStream.quality ?? null
    });
  }
  if (mode !== "audio" && audioStream?.url) {
    downloads.push({
      label: "Audio",
      url: audioStream.url,
      filename: `${videoId}.${audioExtension(audioStream)}`,
      functionName: "youtube-download",
      quality: audioStream.audioQuality ?? null
    });
  }
  downloads.push({
    label: "Thumbnail",
    url: thumbnail,
    filename: `${videoId}-thumbnail.jpg`,
    functionName: "youtube-download"
  });
  return {
    id: videoId,
    type: mode === "audio" ? "audio" : "video",
    title: video.title ?? "YouTube media",
    description: canMerge ? [video.description, "Server will automatically merge the separate video and audio tracks into one MP4."].filter(Boolean).join(" ") : separateTracks ? [video.description, "This source exposes separate video and audio files."].filter(Boolean).join(" ") : video.description ?? null,
    thumbnail,
    downloads
  };
};
var handleYouTubeDownload = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    if (req.method === "GET" || req.method === "HEAD") {
      const url = new URL(req.url);
      const fileUrl = url.searchParams.get("file");
      const audioUrl = url.searchParams.get("audio");
      const merge = url.searchParams.get("merge");
      const filename = sanitizeFilename(url.searchParams.get("filename") || "youtube-media");
      if (!fileUrl) return json({ error: "Missing file URL" }, 400);
      if (merge === "mux-mp4") {
        if (req.method === "HEAD") {
          await validateMp4MergeRequest(fileUrl, audioUrl, ALLOWED_DOWNLOAD_HOSTS2, {
            referer: "https://www.youtube.com/",
            userAgent: ANDROID_USER_AGENT
          });
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        return await mergeMp4Response(fileUrl, audioUrl, filename, ALLOWED_DOWNLOAD_HOSTS2, {
          referer: "https://www.youtube.com/",
          defaultFilename: "youtube-media",
          userAgent: ANDROID_USER_AGENT
        });
      }
      if (req.method === "HEAD") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS2, {
        referer: "https://www.youtube.com/",
        userAgent: ANDROID_USER_AGENT,
        forceRangeRequest: true
      });
    }
    const body = await req.json();
    const requestedUrl = body?.url;
    const requestedMode = typeof body?.mode === "string" ? body.mode : "video";
    if (!requestedUrl || typeof requestedUrl !== "string") {
      return json({ error: "Missing YouTube URL" }, 400);
    }
    const resolved = await resolveShortUrl(requestedUrl);
    const finalUrl = resolved.url;
    if (requestedMode === "playlist") {
      const playlistId = extractPlaylistId(finalUrl);
      if (!playlistId) {
        return json({ error: "Please enter a valid YouTube playlist URL" }, 400);
      }
      const playlist = await fetchFromInvidious(`/playlists/${playlistId}`);
      const videos = playlist.videos ?? [];
      const settled = await Promise.allSettled(
        videos.map(async (entry) => {
          if (!entry.videoId) return null;
          const payload2 = await fetchFromInnertube(entry.videoId);
          return makeVideoItem(entry.videoId, toYouTubeVideo(payload2), "video");
        })
      );
      const items = settled.map((result) => result.status === "fulfilled" ? result.value : null).filter((item2) => item2 !== null);
      if (!items.length) {
        return json({ error: "No downloadable playlist items were found" }, 404);
      }
      return json({
        platform: "youtube",
        sourceType: "playlist",
        title: playlist.title ?? "YouTube playlist",
        caption: playlist.description ?? null,
        username: playlist.authorId ?? null,
        authorName: playlist.author ?? null,
        profilePic: null,
        cover: items[0]?.thumbnail ?? null,
        items,
        resolvedUrl: finalUrl
      });
    }
    const videoId = extractVideoId2(finalUrl);
    if (!videoId) {
      return json({ error: "Please enter a valid YouTube video, Shorts, or music URL" }, 400);
    }
    const payload = await fetchFromInnertube(videoId);
    const video = toYouTubeVideo(payload);
    const item = makeVideoItem(videoId, video, requestedMode);
    if (!item.downloads.length) {
      return json({ error: "No downloadable streams were found for that video" }, 404);
    }
    return json({
      platform: "youtube",
      sourceType: requestedMode,
      title: video.title ?? "YouTube video",
      caption: video.description ?? null,
      username: video.authorId ?? null,
      authorName: video.author ?? null,
      profilePic: null,
      cover: item.thumbnail,
      items: [item],
      resolvedUrl: finalUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
};

// dev/functions/tinyurl-tools.ts
var handleTinyUrl = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const { action, url, provider } = body ?? {};
    if (!url || typeof url !== "string") return json({ error: "Missing URL" }, 400);
    if (!action || action !== "resolve" && action !== "shorten") return json({ error: "Unsupported action" }, 400);
    if (action === "resolve") {
      const resolved = await resolveShortUrl(url);
      return json({ inputUrl: url, resolvedUrl: resolved.url, hops: resolved.hops });
    }
    const selected = provider && String(provider).toLowerCase() || "tinyurl";
    if (selected === "is.gd") {
      const resp = await fetchWithRetry(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT }
      });
      const data = await resp.json();
      if (!resp.ok || !data?.shorturl) return json({ error: data?.errormessage ?? "is.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: data.shorturl, provider: "is.gd" });
    }
    if (selected === "v.gd") {
      const resp = await fetchWithRetry(`https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT }
      });
      const data = await resp.json();
      if (!resp.ok || !data?.shorturl) return json({ error: data?.errormessage ?? "v.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: data.shorturl, provider: "v.gd" });
    }
    if (selected === "da.gd") {
      const resp = await fetchWithRetry(`https://da.gd/s?url=${encodeURIComponent(url)}`, {
        headers: { "User-Agent": USER_AGENT }
      });
      const text = (await resp.text()).trim();
      if (!resp.ok || !/^https?:\/\//i.test(text)) return json({ error: "da.gd failed" }, 400);
      return json({ inputUrl: url, shortUrl: text, provider: "da.gd" });
    }
    if (selected === "bitly") {
      const bitlyToken = Deno?.env?.get ? Deno.env.get("BITLY_TOKEN") : void 0;
      if (!bitlyToken) return json({ error: "Bitly not configured on server" }, 400);
      const resp = await fetchWithRetry("https://api-ssl.bitly.com/v4/shorten", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bitlyToken}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ long_url: url })
      });
      const payload = await resp.json();
      if (!resp.ok || !payload?.link) return json({ error: payload?.message ?? "Bitly failed" }, 400);
      return json({ inputUrl: url, shortUrl: payload.link, provider: "bitly" });
    }
    const officialToken = typeof process !== "undefined" && process.env && process.env.TINYURL_API_TOKEN || void 0;
    if (officialToken) {
      const response = await fetchWithRetry("https://api.tinyurl.com/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${officialToken}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ url })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data?.tiny_url) return json({ error: payload?.errors?.[0] ?? payload?.message ?? "TinyURL API failed" }, 400);
      return json({ inputUrl: url, shortUrl: payload.data.tiny_url, provider: "tinyurl-api" });
    }
    const legacyResponse = await fetchWithRetry(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      headers: { "User-Agent": USER_AGENT }
    });
    const shortUrl = (await legacyResponse.text()).trim();
    if (!legacyResponse.ok || !/^https?:\/\/(?:www\.)?tinyurl\.com\//i.test(shortUrl)) return json({ error: "TinyURL could not shorten that URL" }, 400);
    return json({ inputUrl: url, shortUrl, provider: "tinyurl-legacy" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
};

// vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\Jinwiil Onginjo\\Desktop\\savetok-express-main";
var devFunctionHandlers = {
  "facebook-download": handleFacebookDownload,
  "youtube-download": handleYouTubeDownload,
  "paystack-initialize": handlePaystackInitialize,
  "paystack-verify": handlePaystackVerify,
  "tinyurl-tools": handleTinyUrl
};
var toWebRequest = (req) => {
  const origin = `http://${req.headers.host ?? "localhost:8080"}`;
  const url = new URL(req.url ?? "/", origin);
  const method = req.method ?? "GET";
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    }
  });
  return new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? void 0 : Readable.toWeb(req),
    duplex: method === "GET" || method === "HEAD" ? void 0 : "half"
  });
};
var writeWebResponse = async (res, response) => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  if (!response.body) {
    res.end();
    return;
  }
  await new Promise((resolve, reject) => {
    Readable.fromWeb(response.body).pipe(res).on("finish", resolve).on("error", reject);
  });
};
var devFunctionProxy = () => ({
  name: "dev-function-proxy",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url ?? "").split("?")[0];
      const match = pathname.match(/^\/functions\/v1\/([^/]+)$/);
      const functionName = match?.[1];
      const handler = functionName ? devFunctionHandlers[functionName] : null;
      if (!handler) {
        next();
        return;
      }
      try {
        const request = toWebRequest(req);
        const response = await handler(request);
        await writeWebResponse(res, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Local function proxy failed";
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  }
});
var vite_config_default = defineConfig(({ mode }) => {
  const env2 = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env2);
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false
      }
    },
    plugins: [react(), devFunctionProxy(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3VwYWJhc2UvZnVuY3Rpb25zL19zaGFyZWQvaHR0cC50cyIsICJkZXYvZnVuY3Rpb25zL21lcmdlLnRzIiwgImRldi9mdW5jdGlvbnMvZmFjZWJvb2sudHMiLCAiZGV2L2Z1bmN0aW9ucy9wYXlzdGFjay50cyIsICJkZXYvZnVuY3Rpb25zL3lvdXR1YmUudHMiLCAiZGV2L2Z1bmN0aW9ucy90aW55dXJsLXRvb2xzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEppbndpaWwgT25naW5qb1xcXFxEZXNrdG9wXFxcXHNhdmV0b2stZXhwcmVzcy1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9KaW53aWlsJTIwT25naW5qby9EZXNrdG9wL3NhdmV0b2stZXhwcmVzcy1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tIFwibm9kZTpzdHJlYW1cIjtcbmltcG9ydCB7IGNvbXBvbmVudFRhZ2dlciB9IGZyb20gXCJsb3ZhYmxlLXRhZ2dlclwiO1xuaW1wb3J0IHsgaGFuZGxlRmFjZWJvb2tEb3dubG9hZCB9IGZyb20gXCIuL2Rldi9mdW5jdGlvbnMvZmFjZWJvb2tcIjtcbmltcG9ydCB7IGhhbmRsZVBheXN0YWNrSW5pdGlhbGl6ZSwgaGFuZGxlUGF5c3RhY2tWZXJpZnkgfSBmcm9tIFwiLi9kZXYvZnVuY3Rpb25zL3BheXN0YWNrXCI7XG5pbXBvcnQgeyBoYW5kbGVZb3VUdWJlRG93bmxvYWQgfSBmcm9tIFwiLi9kZXYvZnVuY3Rpb25zL3lvdXR1YmVcIjtcbmltcG9ydCB7IGhhbmRsZVRpbnlVcmwgfSBmcm9tIFwiLi9kZXYvZnVuY3Rpb25zL3Rpbnl1cmwtdG9vbHNcIjtcblxuY29uc3QgZGV2RnVuY3Rpb25IYW5kbGVyczogUmVjb3JkPHN0cmluZywgKHJlcXVlc3Q6IFJlcXVlc3QpID0+IFByb21pc2U8UmVzcG9uc2U+PiA9IHtcbiAgXCJmYWNlYm9vay1kb3dubG9hZFwiOiBoYW5kbGVGYWNlYm9va0Rvd25sb2FkLFxuICBcInlvdXR1YmUtZG93bmxvYWRcIjogaGFuZGxlWW91VHViZURvd25sb2FkLFxuICBcInBheXN0YWNrLWluaXRpYWxpemVcIjogaGFuZGxlUGF5c3RhY2tJbml0aWFsaXplLFxuICBcInBheXN0YWNrLXZlcmlmeVwiOiBoYW5kbGVQYXlzdGFja1ZlcmlmeSxcbiAgXCJ0aW55dXJsLXRvb2xzXCI6IGhhbmRsZVRpbnlVcmwsXG59O1xuXG5jb25zdCB0b1dlYlJlcXVlc3QgPSAocmVxOiBpbXBvcnQoXCJub2RlOmh0dHBcIikuSW5jb21pbmdNZXNzYWdlKSA9PiB7XG4gIGNvbnN0IG9yaWdpbiA9IGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0ID8/IFwibG9jYWxob3N0OjgwODBcIn1gO1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgPz8gXCIvXCIsIG9yaWdpbik7XG4gIGNvbnN0IG1ldGhvZCA9IHJlcS5tZXRob2QgPz8gXCJHRVRcIjtcbiAgY29uc3QgaGVhZGVycyA9IG5ldyBIZWFkZXJzKCk7XG5cbiAgT2JqZWN0LmVudHJpZXMocmVxLmhlYWRlcnMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGhlYWRlcnMuc2V0KGtleSwgdmFsdWUpO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGhlYWRlcnMuc2V0KGtleSwgdmFsdWUuam9pbihcIiwgXCIpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBuZXcgUmVxdWVzdCh1cmwsIHtcbiAgICBtZXRob2QsXG4gICAgaGVhZGVycyxcbiAgICBib2R5OiBtZXRob2QgPT09IFwiR0VUXCIgfHwgbWV0aG9kID09PSBcIkhFQURcIiA/IHVuZGVmaW5lZCA6IFJlYWRhYmxlLnRvV2ViKHJlcSksXG4gICAgZHVwbGV4OiBtZXRob2QgPT09IFwiR0VUXCIgfHwgbWV0aG9kID09PSBcIkhFQURcIiA/IHVuZGVmaW5lZCA6IFwiaGFsZlwiLFxuICB9KTtcbn07XG5cbmNvbnN0IHdyaXRlV2ViUmVzcG9uc2UgPSBhc3luYyAocmVzOiBpbXBvcnQoXCJub2RlOmh0dHBcIikuU2VydmVyUmVzcG9uc2UsIHJlc3BvbnNlOiBSZXNwb25zZSkgPT4ge1xuICByZXMuc3RhdHVzQ29kZSA9IHJlc3BvbnNlLnN0YXR1cztcbiAgcmVzcG9uc2UuaGVhZGVycy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgcmVzLnNldEhlYWRlcihrZXksIHZhbHVlKTtcbiAgfSk7XG5cbiAgaWYgKCFyZXNwb25zZS5ib2R5KSB7XG4gICAgcmVzLmVuZCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBSZWFkYWJsZS5mcm9tV2ViKHJlc3BvbnNlLmJvZHkgYXMgZ2xvYmFsVGhpcy5SZWFkYWJsZVN0cmVhbSkucGlwZShyZXMpLm9uKFwiZmluaXNoXCIsIHJlc29sdmUpLm9uKFwiZXJyb3JcIiwgcmVqZWN0KTtcbiAgfSk7XG59O1xuXG5jb25zdCBkZXZGdW5jdGlvblByb3h5ID0gKCkgPT4gKHtcbiAgbmFtZTogXCJkZXYtZnVuY3Rpb24tcHJveHlcIixcbiAgYXBwbHk6IFwic2VydmVcIiBhcyBjb25zdCxcbiAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogaW1wb3J0KFwidml0ZVwiKS5WaXRlRGV2U2VydmVyKSB7XG4gICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IHBhdGhuYW1lID0gKHJlcS51cmwgPz8gXCJcIikuc3BsaXQoXCI/XCIpWzBdO1xuICAgICAgY29uc3QgbWF0Y2ggPSBwYXRobmFtZS5tYXRjaCgvXlxcL2Z1bmN0aW9uc1xcL3YxXFwvKFteL10rKSQvKTtcbiAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IG1hdGNoPy5bMV07XG4gICAgICBjb25zdCBoYW5kbGVyID0gZnVuY3Rpb25OYW1lID8gZGV2RnVuY3Rpb25IYW5kbGVyc1tmdW5jdGlvbk5hbWVdIDogbnVsbDtcblxuICAgICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICAgIG5leHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXF1ZXN0ID0gdG9XZWJSZXF1ZXN0KHJlcSk7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgaGFuZGxlcihyZXF1ZXN0KTtcbiAgICAgICAgYXdhaXQgd3JpdGVXZWJSZXNwb25zZShyZXMsIHJlc3BvbnNlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiTG9jYWwgZnVuY3Rpb24gcHJveHkgZmFpbGVkXCI7XG4gICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBtZXNzYWdlIH0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbn0pO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksIFwiXCIpO1xuICBPYmplY3QuYXNzaWduKHByb2Nlc3MuZW52LCBlbnYpO1xuXG4gIHJldHVybiB7XG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiBcIjo6XCIsXG4gICAgICBwb3J0OiA4MDgwLFxuICAgICAgaG1yOiB7XG4gICAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCBkZXZGdW5jdGlvblByb3h5KCksIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKV0uZmlsdGVyKEJvb2xlYW4pLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgICAgfSxcbiAgICAgIGRlZHVwZTogW1wicmVhY3RcIiwgXCJyZWFjdC1kb21cIiwgXCJyZWFjdC9qc3gtcnVudGltZVwiLCBcInJlYWN0L2pzeC1kZXYtcnVudGltZVwiLCBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiLCBcIkB0YW5zdGFjay9xdWVyeS1jb3JlXCJdLFxuICAgIH0sXG4gIH07XG59KTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcc3VwYWJhc2VcXFxcZnVuY3Rpb25zXFxcXF9zaGFyZWRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEppbndpaWwgT25naW5qb1xcXFxEZXNrdG9wXFxcXHNhdmV0b2stZXhwcmVzcy1tYWluXFxcXHN1cGFiYXNlXFxcXGZ1bmN0aW9uc1xcXFxfc2hhcmVkXFxcXGh0dHAudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0ppbndpaWwlMjBPbmdpbmpvL0Rlc2t0b3Avc2F2ZXRvay1leHByZXNzLW1haW4vc3VwYWJhc2UvZnVuY3Rpb25zL19zaGFyZWQvaHR0cC50c1wiO2V4cG9ydCBjb25zdCBjb3JzSGVhZGVycyA9IHtcbiAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVyc1wiOiBcImF1dGhvcml6YXRpb24sIHgtY2xpZW50LWluZm8sIGFwaWtleSwgY29udGVudC10eXBlXCIsXG4gIFwiQWNjZXNzLUNvbnRyb2wtRXhwb3NlLUhlYWRlcnNcIjogXCJDb250ZW50LURpc3Bvc2l0aW9uLCBDb250ZW50LUxlbmd0aCwgQ29udGVudC1UeXBlXCIsXG59O1xuXG5leHBvcnQgY29uc3QgVVNFUl9BR0VOVCA9XG4gIFwiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzOC4wLjAuMCBTYWZhcmkvNTM3LjM2XCI7XG5cbmV4cG9ydCBjb25zdCBqc29uID0gKGJvZHk6IHVua25vd24sIHN0YXR1cyA9IDIwMCkgPT5cbiAgbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KGJvZHkpLCB7XG4gICAgc3RhdHVzLFxuICAgIGhlYWRlcnM6IHsgLi4uY29yc0hlYWRlcnMsIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gIH0pO1xuXG5leHBvcnQgY29uc3Qgc2FuaXRpemVGaWxlbmFtZSA9ICh2YWx1ZTogc3RyaW5nLCBmYWxsYmFjayA9IFwiZG93bmxvYWRcIikgPT5cbiAgdmFsdWUucmVwbGFjZSgvW15hLXowLTkuXy1dKy9naSwgXCItXCIpLnJlcGxhY2UoLy0rL2csIFwiLVwiKS5yZXBsYWNlKC9eLXwtJC9nLCBcIlwiKSB8fCBmYWxsYmFjaztcblxuZXhwb3J0IGNvbnN0IGlzQWxsb3dlZEhvc3QgPSAoaG9zdG5hbWU6IHN0cmluZywgYWxsb3dlZEhvc3RzOiByZWFkb25seSBzdHJpbmdbXSkgPT4ge1xuICBjb25zdCBob3N0ID0gaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIGFsbG93ZWRIb3N0cy5zb21lKChhbGxvd2VkKSA9PiBob3N0ID09PSBhbGxvd2VkIHx8IGhvc3QuZW5kc1dpdGgoYC4ke2FsbG93ZWR9YCkpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRlY29kZUh0bWwgPSAodmFsdWU6IHN0cmluZykgPT5cbiAgdmFsdWVcbiAgICAucmVwbGFjZSgvJmFtcDsvZywgXCImXCIpXG4gICAgLnJlcGxhY2UoLyZxdW90Oy9nLCAnXCInKVxuICAgIC5yZXBsYWNlKC8mIzM5Oy9nLCBcIidcIilcbiAgICAucmVwbGFjZSgvJiN4MkY7L2dpLCBcIi9cIilcbiAgICAucmVwbGFjZSgvJmx0Oy9nLCBcIjxcIilcbiAgICAucmVwbGFjZSgvJmd0Oy9nLCBcIj5cIik7XG5cbmV4cG9ydCBjb25zdCB1bmlxID0gPFQ+KGl0ZW1zOiBUW10pID0+IEFycmF5LmZyb20obmV3IFNldChpdGVtcykpO1xuXG5leHBvcnQgY29uc3QgZXh0cmFjdE1ldGEgPSAoaHRtbDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG1hdGNoID0gaHRtbC5tYXRjaChcbiAgICBuZXcgUmVnRXhwKGA8bWV0YVtePl0rKD86cHJvcGVydHl8bmFtZSk9W1wiJ10ke3Byb3BlcnR5fVtcIiddW14+XStjb250ZW50PVtcIiddKFteXCInXSspW1wiJ11gLCBcImlcIiksXG4gICk7XG4gIHJldHVybiBtYXRjaCA/IGRlY29kZUh0bWwobWF0Y2hbMV0pIDogbnVsbDtcbn07XG5cbmNvbnN0IGlzUmVkaXJlY3RTdGF0dXMgPSAoc3RhdHVzOiBudW1iZXIpID0+IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF0uaW5jbHVkZXMoc3RhdHVzKTtcbmNvbnN0IFJFVFJZQUJMRV9TVEFUVVNFUyA9IG5ldyBTZXQoWzQwOCwgNDI1LCA0MjksIDUwMCwgNTAyLCA1MDMsIDUwNF0pO1xuY29uc3Qgc2xlZXAgPSAobXM6IG51bWJlcikgPT4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZldGNoV2l0aFJldHJ5KFxuICBpbnB1dDogc3RyaW5nIHwgVVJMIHwgUmVxdWVzdCxcbiAgaW5pdD86IFJlcXVlc3RJbml0LFxuICBvcHRpb25zPzoge1xuICAgIGF0dGVtcHRzPzogbnVtYmVyO1xuICAgIGJhY2tvZmZNcz86IG51bWJlcjtcbiAgICByZXRyeWFibGVTdGF0dXNlcz86IHJlYWRvbmx5IG51bWJlcltdO1xuICB9LFxuKSB7XG4gIGNvbnN0IGF0dGVtcHRzID0gTWF0aC5tYXgoMSwgb3B0aW9ucz8uYXR0ZW1wdHMgPz8gMyk7XG4gIGNvbnN0IGJhY2tvZmZNcyA9IE1hdGgubWF4KDAsIG9wdGlvbnM/LmJhY2tvZmZNcyA/PyAzNTApO1xuICBjb25zdCByZXRyeWFibGVTdGF0dXNlcyA9IG5ldyBTZXQob3B0aW9ucz8ucmV0cnlhYmxlU3RhdHVzZXMgPz8gWy4uLlJFVFJZQUJMRV9TVEFUVVNFU10pO1xuICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IG51bGwgPSBudWxsO1xuXG4gIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgYXR0ZW1wdHM7IGF0dGVtcHQgKz0gMSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGlucHV0LCBpbml0KTtcbiAgICAgIGlmICghcmV0cnlhYmxlU3RhdHVzZXMuaGFzKHJlc3BvbnNlLnN0YXR1cykgfHwgYXR0ZW1wdCA9PT0gYXR0ZW1wdHMgLSAxKSB7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJlc3BvbnNlLmJvZHk/LmNhbmNlbCgpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxhc3RFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihcIk5ldHdvcmsgcmVxdWVzdCBmYWlsZWRcIik7XG4gICAgICBpZiAoYXR0ZW1wdCA9PT0gYXR0ZW1wdHMgLSAxKSBicmVhaztcbiAgICB9XG5cbiAgICBhd2FpdCBzbGVlcChiYWNrb2ZmTXMgKiAoYXR0ZW1wdCArIDEpKTtcbiAgfVxuXG4gIHRocm93IGxhc3RFcnJvciA/PyBuZXcgRXJyb3IoXCJSZXF1ZXN0IGZhaWxlZCBhZnRlciByZXRyaWVzXCIpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNob3J0VXJsKGlucHV0OiBzdHJpbmcsIG1heEhvcHMgPSA2KSB7XG4gIGxldCBjdXJyZW50ID0gaW5wdXQ7XG4gIGNvbnN0IGhvcHM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1heEhvcHM7IGluZGV4ICs9IDEpIHtcbiAgICBsZXQgcGFyc2VkOiBVUkw7XG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZCA9IG5ldyBVUkwoY3VycmVudCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBPbmx5IGF0dGVtcHQgdG8gZm9sbG93IHJlZGlyZWN0cyBmb3Iga25vd24gc2hvcnRlbmVyIGhvc3RzXG4gICAgY29uc3QgYWxsb3dlZFNob3J0ZW5lckhvc3RzID0gW1xuICAgICAgXCJ0aW55dXJsLmNvbVwiLFxuICAgICAgXCJ0aW55Lm9uZVwiLFxuICAgICAgXCJpcy5nZFwiLFxuICAgICAgXCJ2LmdkXCIsXG4gICAgICBcImRhLmdkXCIsXG4gICAgICBcImJpdC5seVwiLFxuICAgICAgXCJ0LmNvXCIsXG4gICAgICBcInRpbnkuY2NcIixcbiAgICAgIFwic2hvcnR1cmwuYXRcIixcbiAgICAgIFwicmVicmFuZC5seVwiLFxuICAgICAgXCJjdXR0Lmx5XCIsXG4gICAgICBcInQubHlcIixcbiAgICAgIFwib3cubHlcIixcbiAgICAgIFwic2hvcnQuaW9cIixcbiAgICAgIFwiYnVmZi5seVwiLFxuICAgICAgXCJsbmtkLmluXCIsXG4gICAgICBcInRyaWIuYWxcIixcbiAgICAgIFwic29vLmdkXCIsXG4gICAgICBcInN1LnByXCIsXG4gICAgICBcImJpdC5kb1wiLFxuICAgICAgXCJxci5hZVwiLFxuICAgICAgXCJjaGlscC5pdFwiLFxuICAgICAgXCJpdHkuaW1cIixcbiAgICAgIFwicG8uc3RcIixcbiAgICAgIFwic25pcC5seVwiLFxuICAgICAgXCJiYy52Y1wiLFxuICAgICAgXCJ1Lm51XCIsXG4gICAgXTtcbiAgICBpZiAoIWlzQWxsb3dlZEhvc3QocGFyc2VkLmhvc3RuYW1lLCBhbGxvd2VkU2hvcnRlbmVySG9zdHMpKSBicmVhaztcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goY3VycmVudCwge1xuICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgcmVkaXJlY3Q6IFwibWFudWFsXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiVXNlci1BZ2VudFwiOiBVU0VSX0FHRU5ULFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmICghaXNSZWRpcmVjdFN0YXR1cyhyZXNwb25zZS5zdGF0dXMpKSBicmVhaztcbiAgICBjb25zdCBsb2NhdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KFwiTG9jYXRpb25cIik7XG4gICAgaWYgKCFsb2NhdGlvbikgYnJlYWs7XG4gICAgY3VycmVudCA9IG5ldyBVUkwobG9jYXRpb24sIGN1cnJlbnQpLnRvU3RyaW5nKCk7XG4gICAgaG9wcy5wdXNoKGN1cnJlbnQpO1xuICB9XG5cbiAgcmV0dXJuIHsgdXJsOiBjdXJyZW50LCBob3BzIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm94eURvd25sb2FkUmVzcG9uc2UoXG4gIGZpbGVVcmw6IHN0cmluZyxcbiAgZmlsZW5hbWU6IHN0cmluZyxcbiAgYWxsb3dlZEhvc3RzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgb3B0aW9ucz86IHtcbiAgICByZWZlcmVyPzogc3RyaW5nO1xuICAgIGRlZmF1bHRDb250ZW50VHlwZT86IHN0cmluZztcbiAgICB1c2VyQWdlbnQ/OiBzdHJpbmc7XG4gICAgZm9yY2VSYW5nZVJlcXVlc3Q/OiBib29sZWFuO1xuICB9LFxuKSB7XG4gIGxldCBwYXJzZWQ6IFVSTDtcbiAgdHJ5IHtcbiAgICBwYXJzZWQgPSBuZXcgVVJMKGZpbGVVcmwpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIk1pc3Npbmcgb3IgaW52YWxpZCBmaWxlIFVSTFwiIH0sIDQwMCk7XG4gIH1cblxuICBpZiAoIWlzQWxsb3dlZEhvc3QocGFyc2VkLmhvc3RuYW1lLCBhbGxvd2VkSG9zdHMpKSB7XG4gICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJIb3N0IG5vdCBhbGxvd2VkXCIgfSwgNDAwKTtcbiAgfVxuXG4gIGNvbnN0IHVwc3RyZWFtID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoZmlsZVVybCwge1xuICAgIHJlZGlyZWN0OiBcImZvbGxvd1wiLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiVXNlci1BZ2VudFwiOiBvcHRpb25zPy51c2VyQWdlbnQgfHwgVVNFUl9BR0VOVCxcbiAgICAgIEFjY2VwdDogXCIqLypcIixcbiAgICAgIFwiQWNjZXB0LUxhbmd1YWdlXCI6IFwiZW4tVVMsZW47cT0wLjlcIixcbiAgICAgIC4uLihvcHRpb25zPy5yZWZlcmVyID8geyBSZWZlcmVyOiBvcHRpb25zLnJlZmVyZXIgfSA6IHt9KSxcbiAgICAgIC4uLihvcHRpb25zPy5mb3JjZVJhbmdlUmVxdWVzdCA/IHsgUmFuZ2U6IFwiYnl0ZXM9MC1cIiB9IDoge30pLFxuICAgIH0sXG4gIH0sIHtcbiAgICBhdHRlbXB0czogMyxcbiAgICBiYWNrb2ZmTXM6IDUwMCxcbiAgfSk7XG5cbiAgaWYgKCF1cHN0cmVhbS5vayB8fCAhdXBzdHJlYW0uYm9keSkge1xuICAgIHJldHVybiBqc29uKHsgZXJyb3I6IGBVcHN0cmVhbSBlcnJvcjogJHt1cHN0cmVhbS5zdGF0dXN9YCB9LCA1MDIpO1xuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSB1cHN0cmVhbS5oZWFkZXJzLmdldChcIkNvbnRlbnQtVHlwZVwiKSB8fCBvcHRpb25zPy5kZWZhdWx0Q29udGVudFR5cGUgfHwgXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIjtcbiAgY29uc3QgY29udGVudExlbmd0aCA9IHVwc3RyZWFtLmhlYWRlcnMuZ2V0KFwiQ29udGVudC1MZW5ndGhcIik7XG4gIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgLi4uY29yc0hlYWRlcnMsXG4gICAgXCJDb250ZW50LVR5cGVcIjogY29udGVudFR5cGUsXG4gICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7c2FuaXRpemVGaWxlbmFtZShmaWxlbmFtZSl9XCJgLFxuICAgIFwiQ2FjaGUtQ29udHJvbFwiOiBcIm5vLXN0b3JlXCIsXG4gIH07XG4gIGlmIChjb250ZW50TGVuZ3RoKSBoZWFkZXJzW1wiQ29udGVudC1MZW5ndGhcIl0gPSBjb250ZW50TGVuZ3RoO1xuXG4gIHJldHVybiBuZXcgUmVzcG9uc2UodXBzdHJlYW0uYm9keSwgeyBzdGF0dXM6IDIwMCwgaGVhZGVycyB9KTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1xcXFxtZXJnZS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSmlud2lpbCUyME9uZ2luam8vRGVza3RvcC9zYXZldG9rLWV4cHJlc3MtbWFpbi9kZXYvZnVuY3Rpb25zL21lcmdlLnRzXCI7aW1wb3J0IHtcbiAgRW5jb2RlZEF1ZGlvUGFja2V0U291cmNlLFxuICBFbmNvZGVkUGFja2V0U2luayxcbiAgRW5jb2RlZFZpZGVvUGFja2V0U291cmNlLFxuICBJbnB1dCxcbiAgTVA0LFxuICBNcDRPdXRwdXRGb3JtYXQsXG4gIE91dHB1dCxcbiAgUVRGRixcbiAgU3RyZWFtVGFyZ2V0LFxuICBVcmxTb3VyY2UsXG59IGZyb20gXCJtZWRpYWJ1bm55XCI7XG5pbXBvcnQge1xuICBjb3JzSGVhZGVycyxcbiAgaXNBbGxvd2VkSG9zdCxcbiAganNvbixcbiAgc2FuaXRpemVGaWxlbmFtZSxcbiAgVVNFUl9BR0VOVCxcbn0gZnJvbSBcIi4uLy4uL3N1cGFiYXNlL2Z1bmN0aW9ucy9fc2hhcmVkL2h0dHAudHNcIjtcblxudHlwZSBNZXJnZVJlc3BvbnNlT3B0aW9ucyA9IHtcbiAgcmVmZXJlcj86IHN0cmluZztcbiAgZGVmYXVsdEZpbGVuYW1lPzogc3RyaW5nO1xuICB1c2VyQWdlbnQ/OiBzdHJpbmc7XG59O1xuXG5jb25zdCBuZXR3b3JrSGVhZGVycyA9IChyZWZlcmVyPzogc3RyaW5nLCB1c2VyQWdlbnQgPSBVU0VSX0FHRU5UKTogSGVhZGVyc0luaXQgPT4gKHtcbiAgXCJVc2VyLUFnZW50XCI6IHVzZXJBZ2VudCxcbiAgQWNjZXB0OiBcIiovKlwiLFxuICBcIkFjY2VwdC1MYW5ndWFnZVwiOiBcImVuLVVTLGVuO3E9MC45XCIsXG4gIC4uLihyZWZlcmVyID8geyBSZWZlcmVyOiByZWZlcmVyIH0gOiB7fSksXG59KTtcblxuY29uc3QgY3JlYXRlVXJsU291cmNlID0gKGZpbGVVcmw6IHN0cmluZywgcmVmZXJlcj86IHN0cmluZywgdXNlckFnZW50Pzogc3RyaW5nKSA9PlxuICBuZXcgVXJsU291cmNlKGZpbGVVcmwsIHtcbiAgICByZXF1ZXN0SW5pdDoge1xuICAgICAgaGVhZGVyczogbmV0d29ya0hlYWRlcnMocmVmZXJlciwgdXNlckFnZW50KSxcbiAgICB9LFxuICAgIGZldGNoRm46ICh1cmwsIHJlcXVlc3RJbml0KSA9PiB7XG4gICAgICBjb25zdCBoZWFkZXJzID0gbmV3IEhlYWRlcnMocmVxdWVzdEluaXQ/LmhlYWRlcnMpO1xuICAgICAgY29uc3QgYmFzZUhlYWRlcnMgPSBuZXcgSGVhZGVycyhuZXR3b3JrSGVhZGVycyhyZWZlcmVyLCB1c2VyQWdlbnQpKTtcbiAgICAgIGJhc2VIZWFkZXJzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgaWYgKCFoZWFkZXJzLmhhcyhrZXkpKSBoZWFkZXJzLnNldChrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgICAgICAuLi5yZXF1ZXN0SW5pdCxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgbWF4Q2FjaGVTaXplOiAxNiAqIDEwMjQgKiAxMDI0LFxuICAgIHBhcmFsbGVsaXNtOiAyLFxuICAgIGdldFJldHJ5RGVsYXk6IChwcmV2aW91c0F0dGVtcHRzOiBudW1iZXIpID0+IChwcmV2aW91c0F0dGVtcHRzID49IDIgPyBudWxsIDogMC4zNSAqIChwcmV2aW91c0F0dGVtcHRzICsgMSkpLFxuICB9KTtcblxuY29uc3QgdmFsaWRhdGVGaWxlVXJsID0gKHZhbHVlOiBzdHJpbmcgfCBudWxsLCBhbGxvd2VkSG9zdHM6IHJlYWRvbmx5IHN0cmluZ1tdKSA9PiB7XG4gIGlmICghdmFsdWUpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgZmlsZSBVUkxcIik7XG5cbiAgbGV0IHBhcnNlZDogVVJMO1xuICB0cnkge1xuICAgIHBhcnNlZCA9IG5ldyBVUkwodmFsdWUpO1xuICB9IGNhdGNoIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIG9yIGludmFsaWQgZmlsZSBVUkxcIik7XG4gIH1cblxuICBpZiAoIWlzQWxsb3dlZEhvc3QocGFyc2VkLmhvc3RuYW1lLCBhbGxvd2VkSG9zdHMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSG9zdCBub3QgYWxsb3dlZFwiKTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZWQudG9TdHJpbmcoKTtcbn07XG5cbmNvbnN0IGFzRXJyb3JSZXNwb25zZSA9IChlcnJvcjogdW5rbm93bikgPT4ge1xuICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIk1lcmdlIGZhaWxlZFwiO1xuICBjb25zdCBzdGF0dXMgPVxuICAgIG1lc3NhZ2UgPT09IFwiSG9zdCBub3QgYWxsb3dlZFwiXG4gICAgfHwgbWVzc2FnZS5zdGFydHNXaXRoKFwiTWlzc2luZ1wiKVxuICAgIHx8IG1lc3NhZ2Uuc3RhcnRzV2l0aChcIlVuc3VwcG9ydGVkXCIpXG4gICAgfHwgbWVzc2FnZS5zdGFydHNXaXRoKFwiQ291bGQgbm90IHJlYWRcIilcbiAgICAgID8gNDAwXG4gICAgICA6IDUwMDtcblxuICByZXR1cm4ganNvbih7IGVycm9yOiBtZXNzYWdlIH0sIHN0YXR1cyk7XG59O1xuXG5jb25zdCBjcmVhdGVQcm9iZUlucHV0cyA9ICh2aWRlb1VybDogc3RyaW5nLCBhdWRpb1VybDogc3RyaW5nLCByZWZlcmVyPzogc3RyaW5nLCB1c2VyQWdlbnQ/OiBzdHJpbmcpID0+IHtcbiAgY29uc3QgdmlkZW9JbnB1dCA9IG5ldyBJbnB1dCh7XG4gICAgZm9ybWF0czogW01QNCwgUVRGRl0sXG4gICAgc291cmNlOiBjcmVhdGVVcmxTb3VyY2UodmlkZW9VcmwsIHJlZmVyZXIsIHVzZXJBZ2VudCksXG4gIH0pO1xuICBjb25zdCBhdWRpb0lucHV0ID0gbmV3IElucHV0KHtcbiAgICBmb3JtYXRzOiBbTVA0LCBRVEZGXSxcbiAgICBzb3VyY2U6IGNyZWF0ZVVybFNvdXJjZShhdWRpb1VybCwgcmVmZXJlciwgdXNlckFnZW50KSxcbiAgfSk7XG5cbiAgcmV0dXJuIHsgdmlkZW9JbnB1dCwgYXVkaW9JbnB1dCB9O1xufTtcblxuYXN5bmMgZnVuY3Rpb24gcHJvYmVUcmFja3ModmlkZW9Vcmw6IHN0cmluZywgYXVkaW9Vcmw6IHN0cmluZywgcmVmZXJlcj86IHN0cmluZywgdXNlckFnZW50Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHsgdmlkZW9JbnB1dCwgYXVkaW9JbnB1dCB9ID0gY3JlYXRlUHJvYmVJbnB1dHModmlkZW9VcmwsIGF1ZGlvVXJsLCByZWZlcmVyLCB1c2VyQWdlbnQpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgW3ZpZGVvVHJhY2ssIGF1ZGlvVHJhY2tdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgdmlkZW9JbnB1dC5nZXRQcmltYXJ5VmlkZW9UcmFjaygpLFxuICAgICAgYXVkaW9JbnB1dC5nZXRQcmltYXJ5QXVkaW9UcmFjaygpLFxuICAgIF0pO1xuXG4gICAgaWYgKCF2aWRlb1RyYWNrIHx8ICFhdWRpb1RyYWNrKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVhZCBjb21wYXRpYmxlIHZpZGVvIGFuZCBhdWRpbyB0cmFja3MgZm9yIG1lcmdlXCIpO1xuICAgIH1cblxuICAgIGlmICghdmlkZW9UcmFjay5jb2RlYyB8fCAhYXVkaW9UcmFjay5jb2RlYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgdHJhY2sgY29kZWMgZm9yIE1QNCBtZXJnZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBbdmlkZW9Db25maWcsIGF1ZGlvQ29uZmlnXSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHZpZGVvVHJhY2suZ2V0RGVjb2RlckNvbmZpZygpLFxuICAgICAgYXVkaW9UcmFjay5nZXREZWNvZGVyQ29uZmlnKCksXG4gICAgXSk7XG5cbiAgICBpZiAoIXZpZGVvQ29uZmlnIHx8ICFhdWRpb0NvbmZpZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBkZWNvZGVyIGNvbmZpZ3VyYXRpb24gZm9yIE1QNCBtZXJnZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB2aWRlb1RyYWNrLCBhdWRpb1RyYWNrLCB2aWRlb0NvbmZpZywgYXVkaW9Db25maWcsIHZpZGVvSW5wdXQsIGF1ZGlvSW5wdXQgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB2aWRlb0lucHV0LmRpc3Bvc2UoKTtcbiAgICBhdWRpb0lucHV0LmRpc3Bvc2UoKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5jb25zdCBwaXBlVmlkZW9QYWNrZXRzID0gYXN5bmMgKFxuICB0cmFjazogYW55LFxuICBzb3VyY2U6IGFueSxcbiAgZGVjb2RlckNvbmZpZzogdW5rbm93bixcbikgPT4ge1xuICBjb25zdCBzaW5rID0gbmV3IEVuY29kZWRQYWNrZXRTaW5rKHRyYWNrKTtcbiAgbGV0IGZpcnN0ID0gdHJ1ZTtcblxuICBmb3IgYXdhaXQgKGNvbnN0IHBhY2tldCBvZiBzaW5rLnBhY2tldHMoKSkge1xuICAgIGlmIChmaXJzdCkge1xuICAgICAgYXdhaXQgc291cmNlLmFkZChwYWNrZXQsIHsgZGVjb2RlckNvbmZpZyB9KTtcbiAgICAgIGZpcnN0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHNvdXJjZS5hZGQocGFja2V0KTtcbiAgICB9XG4gIH1cblxuICBpZiAoZmlyc3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJWaWRlbyB0cmFjayBoYXMgbm8gcGFja2V0c1wiKTtcbiAgfVxufTtcblxuY29uc3QgcGlwZUF1ZGlvUGFja2V0cyA9IGFzeW5jIChcbiAgdHJhY2s6IGFueSxcbiAgc291cmNlOiBhbnksXG4gIGRlY29kZXJDb25maWc6IHVua25vd24sXG4pID0+IHtcbiAgY29uc3Qgc2luayA9IG5ldyBFbmNvZGVkUGFja2V0U2luayh0cmFjayk7XG4gIGxldCBmaXJzdCA9IHRydWU7XG5cbiAgZm9yIGF3YWl0IChjb25zdCBwYWNrZXQgb2Ygc2luay5wYWNrZXRzKCkpIHtcbiAgICBpZiAoZmlyc3QpIHtcbiAgICAgIGF3YWl0IHNvdXJjZS5hZGQocGFja2V0LCB7IGRlY29kZXJDb25maWcgfSk7XG4gICAgICBmaXJzdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBzb3VyY2UuYWRkKHBhY2tldCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGZpcnN0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXVkaW8gdHJhY2sgaGFzIG5vIHBhY2tldHNcIik7XG4gIH1cbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB2YWxpZGF0ZU1wNE1lcmdlUmVxdWVzdChcbiAgdmlkZW9Vcmw6IHN0cmluZyB8IG51bGwsXG4gIGF1ZGlvVXJsOiBzdHJpbmcgfCBudWxsLFxuICBhbGxvd2VkSG9zdHM6IHJlYWRvbmx5IHN0cmluZ1tdLFxuICBvcHRpb25zPzogTWVyZ2VSZXNwb25zZU9wdGlvbnMsXG4pIHtcbiAgY29uc3Qgc2FmZVZpZGVvVXJsID0gdmFsaWRhdGVGaWxlVXJsKHZpZGVvVXJsLCBhbGxvd2VkSG9zdHMpO1xuICBjb25zdCBzYWZlQXVkaW9VcmwgPSB2YWxpZGF0ZUZpbGVVcmwoYXVkaW9VcmwsIGFsbG93ZWRIb3N0cyk7XG4gIGNvbnN0IHsgdmlkZW9JbnB1dCwgYXVkaW9JbnB1dCB9ID0gYXdhaXQgcHJvYmVUcmFja3Moc2FmZVZpZGVvVXJsLCBzYWZlQXVkaW9VcmwsIG9wdGlvbnM/LnJlZmVyZXIsIG9wdGlvbnM/LnVzZXJBZ2VudCk7XG4gIHZpZGVvSW5wdXQuZGlzcG9zZSgpO1xuICBhdWRpb0lucHV0LmRpc3Bvc2UoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1lcmdlTXA0UmVzcG9uc2UoXG4gIHZpZGVvVXJsOiBzdHJpbmcgfCBudWxsLFxuICBhdWRpb1VybDogc3RyaW5nIHwgbnVsbCxcbiAgZmlsZW5hbWU6IHN0cmluZyxcbiAgYWxsb3dlZEhvc3RzOiByZWFkb25seSBzdHJpbmdbXSxcbiAgb3B0aW9ucz86IE1lcmdlUmVzcG9uc2VPcHRpb25zLFxuKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc2FmZVZpZGVvVXJsID0gdmFsaWRhdGVGaWxlVXJsKHZpZGVvVXJsLCBhbGxvd2VkSG9zdHMpO1xuICAgIGNvbnN0IHNhZmVBdWRpb1VybCA9IHZhbGlkYXRlRmlsZVVybChhdWRpb1VybCwgYWxsb3dlZEhvc3RzKTtcblxuICAgIGNvbnN0IHtcbiAgICAgIHZpZGVvVHJhY2ssXG4gICAgICBhdWRpb1RyYWNrLFxuICAgICAgdmlkZW9Db25maWcsXG4gICAgICBhdWRpb0NvbmZpZyxcbiAgICAgIHZpZGVvSW5wdXQsXG4gICAgICBhdWRpb0lucHV0LFxuICAgIH0gPSBhd2FpdCBwcm9iZVRyYWNrcyhzYWZlVmlkZW9VcmwsIHNhZmVBdWRpb1VybCwgb3B0aW9ucz8ucmVmZXJlciwgb3B0aW9ucz8udXNlckFnZW50KTtcblxuICAgIGNvbnN0IHZpZGVvU291cmNlID0gbmV3IEVuY29kZWRWaWRlb1BhY2tldFNvdXJjZSh2aWRlb1RyYWNrLmNvZGVjKTtcbiAgICBjb25zdCBhdWRpb1NvdXJjZSA9IG5ldyBFbmNvZGVkQXVkaW9QYWNrZXRTb3VyY2UoYXVkaW9UcmFjay5jb2RlYyk7XG4gICAgY29uc3Qgc3RyZWFtID0gbmV3IFRyYW5zZm9ybVN0cmVhbTxVaW50OEFycmF5LCBVaW50OEFycmF5PigpO1xuICAgIGNvbnN0IG91dHB1dCA9IG5ldyBPdXRwdXQoe1xuICAgICAgZm9ybWF0OiBuZXcgTXA0T3V0cHV0Rm9ybWF0KCksXG4gICAgICB0YXJnZXQ6IG5ldyBTdHJlYW1UYXJnZXQoc3RyZWFtLndyaXRhYmxlLCB7XG4gICAgICAgIGNodW5rZWQ6IHRydWUsXG4gICAgICAgIGNodW5rU2l6ZTogMTAyNCAqIDEwMjQsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIG91dHB1dC5hZGRWaWRlb1RyYWNrKHZpZGVvU291cmNlKTtcbiAgICBvdXRwdXQuYWRkQXVkaW9UcmFjayhhdWRpb1NvdXJjZSk7XG5cbiAgICBjb25zdCB0YXNrID0gKGFzeW5jICgpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IG91dHB1dC5zdGFydCgpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgcGlwZVZpZGVvUGFja2V0cyh2aWRlb1RyYWNrLCB2aWRlb1NvdXJjZSwgdmlkZW9Db25maWcpLFxuICAgICAgICAgIHBpcGVBdWRpb1BhY2tldHMoYXVkaW9UcmFjaywgYXVkaW9Tb3VyY2UsIGF1ZGlvQ29uZmlnKSxcbiAgICAgICAgXSk7XG4gICAgICAgIGF3YWl0IG91dHB1dC5maW5hbGl6ZSgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgYXdhaXQgb3V0cHV0LmNhbmNlbCgpLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgIGF3YWl0IHN0cmVhbS53cml0YWJsZS5hYm9ydChlcnJvcikuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIHZpZGVvSW5wdXQuZGlzcG9zZSgpO1xuICAgICAgICBhdWRpb0lucHV0LmRpc3Bvc2UoKTtcbiAgICAgIH1cbiAgICB9KSgpO1xuXG4gICAgdm9pZCB0YXNrO1xuXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShzdHJlYW0ucmVhZGFibGUsIHtcbiAgICAgIHN0YXR1czogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAuLi5jb3JzSGVhZGVycyxcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJ2aWRlby9tcDRcIixcbiAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCI6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7c2FuaXRpemVGaWxlbmFtZShmaWxlbmFtZSwgb3B0aW9ucz8uZGVmYXVsdEZpbGVuYW1lID8/IFwibWVyZ2VkLW1lZGlhXCIpfVwiYCxcbiAgICAgICAgXCJDYWNoZS1Db250cm9sXCI6IFwibm8tc3RvcmVcIixcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIGFzRXJyb3JSZXNwb25zZShlcnJvcik7XG4gIH1cbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1xcXFxmYWNlYm9vay50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSmlud2lpbCUyME9uZ2luam8vRGVza3RvcC9zYXZldG9rLWV4cHJlc3MtbWFpbi9kZXYvZnVuY3Rpb25zL2ZhY2Vib29rLnRzXCI7aW1wb3J0IHtcbiAgY29yc0hlYWRlcnMsXG4gIGRlY29kZUh0bWwsXG4gIGV4dHJhY3RNZXRhLFxuICBmZXRjaFdpdGhSZXRyeSxcbiAganNvbixcbiAgcHJveHlEb3dubG9hZFJlc3BvbnNlLFxuICByZXNvbHZlU2hvcnRVcmwsXG4gIHNhbml0aXplRmlsZW5hbWUsXG4gIHVuaXEsXG4gIFVTRVJfQUdFTlQsXG59IGZyb20gXCIuLi8uLi9zdXBhYmFzZS9mdW5jdGlvbnMvX3NoYXJlZC9odHRwLnRzXCI7XG5pbXBvcnQgeyBtZXJnZU1wNFJlc3BvbnNlLCB2YWxpZGF0ZU1wNE1lcmdlUmVxdWVzdCB9IGZyb20gXCIuL21lcmdlLnRzXCI7XG5cbmNvbnN0IEFMTE9XRURfRE9XTkxPQURfSE9TVFMgPSBbXG4gIFwiZmFjZWJvb2suY29tXCIsXG4gIFwiZmJjZG4ubmV0XCIsXG4gIFwiZm5hLmZiY2RuLm5ldFwiLFxuICBcImNkbi5mYnNieC5jb21cIixcbiAgXCJzY29udGVudC54eC5mYmNkbi5uZXRcIixcbl0gYXMgY29uc3Q7XG5cbmNvbnN0IEZBQ0VCT09LX1VSTF9SRSA9IC9eaHR0cHM/OlxcL1xcLyg/Oig/Ond3d3xtfG1iYXNpYylcXC4pPyg/OmZhY2Vib29rXFwuY29tfGZiXFwud2F0Y2gpXFwvL2k7XG5cbmNvbnN0IGRlY29kZUVzY2FwZWQgPSAodmFsdWU6IHN0cmluZykgPT5cbiAgdmFsdWUucmVwbGFjZSgvXFxcXHUwMDI1L2csIFwiJVwiKS5yZXBsYWNlKC9cXFxcdTAwMkYvZywgXCIvXCIpLnJlcGxhY2UoL1xcXFx1MDAyNi9nLCBcIiZcIikucmVwbGFjZSgvXFxcXFxcLy9nLCBcIi9cIik7XG5cbmNvbnN0IGNvbGxlY3RNYXRjaGVzID0gKGh0bWw6IHN0cmluZywgcGF0dGVybjogUmVnRXhwKSA9PiB7XG4gIGNvbnN0IGl0ZW1zOiBzdHJpbmdbXSA9IFtdO1xuICBsZXQgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSB8IG51bGw7XG4gIHdoaWxlICgobWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoaHRtbCkpKSB7XG4gICAgY29uc3QgdmFsdWUgPSBkZWNvZGVFc2NhcGVkKG1hdGNoWzFdKTtcbiAgICBpZiAodmFsdWUuc3RhcnRzV2l0aChcImh0dHBcIikpIGl0ZW1zLnB1c2godmFsdWUpO1xuICB9XG4gIHJldHVybiB1bmlxKGl0ZW1zKTtcbn07XG5cbmNvbnN0IGNvbGxlY3REYXNoQmFzZVVybHMgPSAoaHRtbDogc3RyaW5nLCBtZWRpYUtpbmQ6IFwidmlkZW9cIiB8IFwiYXVkaW9cIikgPT4ge1xuICBjb25zdCBkZWNvZGVkID0gZGVjb2RlRXNjYXBlZChodG1sKTtcbiAgY29uc3Qgc2VjdGlvbnMgPSBkZWNvZGVkLm1hdGNoKG5ldyBSZWdFeHAoYDxBZGFwdGF0aW9uU2V0W14+XSttaW1lVHlwZT1cIiR7bWVkaWFLaW5kfVxcXFwvbXA0XCJbXFxcXHNcXFxcU10qPzxcXFxcL0FkYXB0YXRpb25TZXQ+YCwgXCJnaVwiKSkgPz8gW107XG4gIHJldHVybiB1bmlxKHNlY3Rpb25zLmZsYXRNYXAoKHNlY3Rpb24pID0+IGNvbGxlY3RNYXRjaGVzKHNlY3Rpb24sIC88QmFzZVVSTD4oaHR0cHM/OltePF0rKTxcXC9CYXNlVVJMPi9naSkpKTtcbn07XG5cbmNvbnN0IHRvTW9iaWxlVXJsID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHZhbHVlKTtcbiAgICBpZiAodXJsLmhvc3RuYW1lID09PSBcImZiLndhdGNoXCIpIHJldHVybiB2YWx1ZTtcbiAgICB1cmwuaG9zdG5hbWUgPSBcIm0uZmFjZWJvb2suY29tXCI7XG4gICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbn07XG5cbmNvbnN0IG5vcm1hbGl6ZUZhY2Vib29rVXJsID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHZhbHVlKTtcbiAgICBpZiAodXJsLmhvc3RuYW1lID09PSBcImZhY2Vib29rLmNvbVwiIHx8IHVybC5ob3N0bmFtZSA9PT0gXCJtLmZhY2Vib29rLmNvbVwiIHx8IHVybC5ob3N0bmFtZSA9PT0gXCJtYmFzaWMuZmFjZWJvb2suY29tXCIpIHtcbiAgICAgIHVybC5ob3N0bmFtZSA9IFwid3d3LmZhY2Vib29rLmNvbVwiO1xuICAgIH1cbiAgICByZXR1cm4gdXJsLnRvU3RyaW5nKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxufTtcblxuY29uc3QgZXh0cmFjdFZpZGVvSWQgPSAodmFsdWU6IHN0cmluZykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICAgIGNvbnN0IHdhdGNoSWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcInZcIik7XG4gICAgaWYgKHdhdGNoSWQpIHJldHVybiB3YXRjaElkO1xuXG4gICAgY29uc3QgcmVlbE1hdGNoID0gdXJsLnBhdGhuYW1lLm1hdGNoKC9cXC9yZWVsXFwvKFxcZCspL2kpO1xuICAgIGlmIChyZWVsTWF0Y2gpIHJldHVybiByZWVsTWF0Y2hbMV07XG5cbiAgICBjb25zdCB2aWRlb3NNYXRjaCA9IHVybC5wYXRobmFtZS5tYXRjaCgvXFwvdmlkZW9zXFwvKFxcZCspL2kpO1xuICAgIGlmICh2aWRlb3NNYXRjaCkgcmV0dXJuIHZpZGVvc01hdGNoWzFdO1xuXG4gICAgcmV0dXJuIG51bGw7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuXG5jb25zdCBidWlsZFBhZ2VDYW5kaWRhdGVzID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZUZhY2Vib29rVXJsKHZhbHVlKTtcbiAgY29uc3QgdmlkZW9JZCA9IGV4dHJhY3RWaWRlb0lkKG5vcm1hbGl6ZWQpO1xuICByZXR1cm4gdW5pcShbXG4gICAgbm9ybWFsaXplZCxcbiAgICAuLi4odmlkZW9JZCA/IFtgaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tL3dhdGNoLz92PSR7dmlkZW9JZH1gXSA6IFtdKSxcbiAgICB0b01vYmlsZVVybChub3JtYWxpemVkKSxcbiAgXSk7XG59O1xuXG5jb25zdCBoYXNNZWRpYU1hcmtlcnMgPSAoaHRtbDogc3RyaW5nKSA9PlxuICAvYnJvd3Nlcl9uYXRpdmVfKD86aGR8c2QpX3VybHxwbGF5YWJsZV91cmwoPzpfcXVhbGl0eV9oZCk/fHByb3BlcnR5PVtcIiddb2c6KD86dmlkZW98aW1hZ2UpW1wiJ118PEJhc2VVUkw+aHR0cHM/OnxzY2FsZWRJbWFnZUZpdFdpZHRoL2lcbiAgICAudGVzdChodG1sKTtcblxuY29uc3QgZmV0Y2hQYWdlSHRtbCA9IGFzeW5jIChyZXF1ZXN0ZWRVcmw6IHN0cmluZykgPT4ge1xuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgYnVpbGRQYWdlQ2FuZGlkYXRlcyhyZXF1ZXN0ZWRVcmwpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoY2FuZGlkYXRlLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogVVNFUl9BR0VOVCxcbiAgICAgICAgICBBY2NlcHQ6IFwidGV4dC9odG1sLGFwcGxpY2F0aW9uL3hodG1sK3htbCxhcHBsaWNhdGlvbi94bWw7cT0wLjksKi8qO3E9MC44XCIsXG4gICAgICAgIH0sXG4gICAgICB9LCB7XG4gICAgICAgIGF0dGVtcHRzOiAzLFxuICAgICAgICBiYWNrb2ZmTXM6IDQwMCxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgaHRtbCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgZXJyb3JzLnB1c2goYCR7Y2FuZGlkYXRlfTogJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBkZWNvZGVkSHRtbCA9IGRlY29kZUh0bWwoaHRtbCk7XG4gICAgICBpZiAoIWhhc01lZGlhTWFya2VycyhkZWNvZGVkSHRtbCkpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goYCR7Y2FuZGlkYXRlfTogbm8gbWVkaWEgbWFya2Vyc2ApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaHRtbDogZGVjb2RlZEh0bWwsXG4gICAgICAgIHJlc29sdmVkVXJsOiByZXNwb25zZS51cmwgfHwgY2FuZGlkYXRlLFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZXJyb3JzLnB1c2goYCR7Y2FuZGlkYXRlfTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwicmVxdWVzdCBmYWlsZWRcIn1gKTtcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JzWzBdID8gYENvdWxkIG5vdCBmZXRjaCB0aGF0IEZhY2Vib29rIHBhZ2UgKCR7ZXJyb3JzWzBdfSlgIDogXCJDb3VsZCBub3QgZmV0Y2ggdGhhdCBGYWNlYm9vayBwYWdlXCIpO1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZUZhY2Vib29rRG93bmxvYWQgPSBhc3luYyAocmVxOiBSZXF1ZXN0KSA9PiB7XG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJva1wiLCB7IGhlYWRlcnM6IGNvcnNIZWFkZXJzIH0pO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIiB8fCByZXEubWV0aG9kID09PSBcIkhFQURcIikge1xuICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsKTtcbiAgICAgIGNvbnN0IGZpbGVVcmwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImZpbGVcIik7XG4gICAgICBjb25zdCBhdWRpb1VybCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwiYXVkaW9cIik7XG4gICAgICBjb25zdCBtZXJnZSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwibWVyZ2VcIik7XG4gICAgICBjb25zdCBmaWxlbmFtZSA9IHNhbml0aXplRmlsZW5hbWUodXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJmaWxlbmFtZVwiKSB8fCBcImZhY2Vib29rLW1lZGlhXCIpO1xuICAgICAgaWYgKCFmaWxlVXJsKSByZXR1cm4ganNvbih7IGVycm9yOiBcIk1pc3NpbmcgZmlsZSBVUkxcIiB9LCA0MDApO1xuICAgICAgaWYgKG1lcmdlID09PSBcIm11eC1tcDRcIikge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpIHtcbiAgICAgICAgICBhd2FpdCB2YWxpZGF0ZU1wNE1lcmdlUmVxdWVzdChmaWxlVXJsLCBhdWRpb1VybCwgQUxMT1dFRF9ET1dOTE9BRF9IT1NUUywge1xuICAgICAgICAgICAgcmVmZXJlcjogXCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vXCIsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMjA0LCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYXdhaXQgbWVyZ2VNcDRSZXNwb25zZShmaWxlVXJsLCBhdWRpb1VybCwgZmlsZW5hbWUsIEFMTE9XRURfRE9XTkxPQURfSE9TVFMsIHtcbiAgICAgICAgICByZWZlcmVyOiBcImh0dHBzOi8vd3d3LmZhY2Vib29rLmNvbS9cIixcbiAgICAgICAgICBkZWZhdWx0RmlsZW5hbWU6IFwiZmFjZWJvb2stbWVkaWFcIixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMjA0LCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhd2FpdCBwcm94eURvd25sb2FkUmVzcG9uc2UoZmlsZVVybCwgZmlsZW5hbWUsIEFMTE9XRURfRE9XTkxPQURfSE9TVFMsIHtcbiAgICAgICAgcmVmZXJlcjogXCJodHRwczovL3d3dy5mYWNlYm9vay5jb20vXCIsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxLmpzb24oKTtcbiAgICBjb25zdCByZXF1ZXN0ZWRVcmwgPSBib2R5Py51cmw7XG4gICAgY29uc3QgcmVxdWVzdGVkTW9kZSA9IHR5cGVvZiBib2R5Py5tb2RlID09PSBcInN0cmluZ1wiID8gYm9keS5tb2RlIDogXCJwb3N0XCI7XG4gICAgaWYgKCFyZXF1ZXN0ZWRVcmwgfHwgdHlwZW9mIHJlcXVlc3RlZFVybCAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJNaXNzaW5nIEZhY2Vib29rIFVSTFwiIH0sIDQwMCk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlU2hvcnRVcmwocmVxdWVzdGVkVXJsKTtcbiAgICBjb25zdCBmaW5hbFVybCA9IHJlc29sdmVkLnVybDtcbiAgICBpZiAoIUZBQ0VCT09LX1VSTF9SRS50ZXN0KGZpbmFsVXJsKSkge1xuICAgICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJQbGVhc2UgZW50ZXIgYSB2YWxpZCBwdWJsaWMgRmFjZWJvb2sgVVJMXCIgfSwgNDAwKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYWdlID0gYXdhaXQgZmV0Y2hQYWdlSHRtbChmaW5hbFVybCk7XG4gICAgY29uc3QgZGVjb2RlZEh0bWwgPSBwYWdlLmh0bWw7XG4gICAgY29uc3QgaGRWaWRlb3MgPSBjb2xsZWN0TWF0Y2hlcyhkZWNvZGVkSHRtbCwgLyg/OmJyb3dzZXJfbmF0aXZlX2hkX3VybHxwbGF5YWJsZV91cmxfcXVhbGl0eV9oZClcIj86XFxzKlwiKFteXCJdKylcIi9naSk7XG4gICAgY29uc3Qgc2RWaWRlb3MgPSBjb2xsZWN0TWF0Y2hlcyhkZWNvZGVkSHRtbCwgLyg/OmJyb3dzZXJfbmF0aXZlX3NkX3VybHxwbGF5YWJsZV91cmwpXCI/OlxccypcIihbXlwiXSspXCIvZ2kpO1xuICAgIGNvbnN0IG1ldGFWaWRlb3MgPSBjb2xsZWN0TWF0Y2hlcyhkZWNvZGVkSHRtbCwgLzxtZXRhW14+XStwcm9wZXJ0eT1bXCInXW9nOnZpZGVvW1wiJ11bXj5dK2NvbnRlbnQ9W1wiJ10oW15cIiddKylbXCInXS9naSk7XG4gICAgY29uc3QgZGFzaFZpZGVvVXJscyA9IGNvbGxlY3REYXNoQmFzZVVybHMoZGVjb2RlZEh0bWwsIFwidmlkZW9cIik7XG4gICAgY29uc3QgZGFzaEF1ZGlvVXJscyA9IGNvbGxlY3REYXNoQmFzZVVybHMoZGVjb2RlZEh0bWwsIFwiYXVkaW9cIik7XG4gICAgY29uc3QgaW1hZ2VVcmxzID0gY29sbGVjdE1hdGNoZXMoZGVjb2RlZEh0bWwsIC8oPzpzY2FsZWRJbWFnZUZpdFdpZHRofGltYWdlKVwiPzpcXHMqXFx7W159XSpcInVyaVwiXFxzKjpcXHMqXCIoW15cIl0rKVwiL2dpKTtcbiAgICBjb25zdCBtZXRhSW1hZ2VzID0gY29sbGVjdE1hdGNoZXMoZGVjb2RlZEh0bWwsIC88bWV0YVtePl0rcHJvcGVydHk9W1wiJ11vZzppbWFnZVtcIiddW14+XStjb250ZW50PVtcIiddKFteXCInXSspW1wiJ10vZ2kpO1xuXG4gICAgY29uc3QgcHJvZ3Jlc3NpdmVWaWRlb3MgPSB1bmlxKFsuLi5oZFZpZGVvcywgLi4uc2RWaWRlb3MsIC4uLm1ldGFWaWRlb3NdKTtcbiAgICBjb25zdCBkYXNoT25seVZpZGVvcyA9IGRhc2hWaWRlb1VybHMuZmlsdGVyKCh2aWRlb1VybCkgPT4gIXByb2dyZXNzaXZlVmlkZW9zLmluY2x1ZGVzKHZpZGVvVXJsKSk7XG4gICAgY29uc3QgdmlkZW9Eb3dubG9hZHMgPSB1bmlxKFsuLi5wcm9ncmVzc2l2ZVZpZGVvcywgLi4uZGFzaE9ubHlWaWRlb3NdKTtcbiAgICBjb25zdCBpbWFnZURvd25sb2FkcyA9IHVuaXEoWy4uLmltYWdlVXJscywgLi4ubWV0YUltYWdlc10pO1xuICAgIGNvbnN0IG1lcmdlZERhc2hQcmltYXJ5ID0gIXByb2dyZXNzaXZlVmlkZW9zLmxlbmd0aCAmJiBkYXNoT25seVZpZGVvc1swXSAmJiBkYXNoQXVkaW9VcmxzWzBdXG4gICAgICA/IFt7XG4gICAgICAgICAgbGFiZWw6IFwiTWVyZ2VkIE1QNFwiLFxuICAgICAgICAgIHVybDogZGFzaE9ubHlWaWRlb3NbMF0sXG4gICAgICAgICAgZmlsZW5hbWU6IFwiZmFjZWJvb2stbWVyZ2VkLTEubXA0XCIsXG4gICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImZhY2Vib29rLWRvd25sb2FkXCIsXG4gICAgICAgICAgbWVyZ2VTdHJhdGVneTogXCJtdXgtbXA0XCIgYXMgY29uc3QsXG4gICAgICAgICAgbWVyZ2VBdWRpb1VybDogZGFzaEF1ZGlvVXJsc1swXSxcbiAgICAgICAgfV1cbiAgICAgIDogW107XG5cbiAgICBjb25zdCB2aWRlb0l0ZW1zID0gdmlkZW9Eb3dubG9hZHMubGVuZ3RoXG4gICAgICA/IFt7XG4gICAgICAgICAgaWQ6IFwidmlkZW8tMVwiLFxuICAgICAgICAgIHR5cGU6IFwidmlkZW9cIiBhcyBjb25zdCxcbiAgICAgICAgICB0aXRsZTogXCJGYWNlYm9vayB2aWRlb1wiLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBtZXJnZWREYXNoUHJpbWFyeS5sZW5ndGhcbiAgICAgICAgICAgID8gXCJTZXJ2ZXIgd2lsbCBhdXRvbWF0aWNhbGx5IG1lcmdlIHRoZSBEQVNIIHZpZGVvIGFuZCBhdWRpbyB0cmFja3MgaW50byBvbmUgTVA0LlwiXG4gICAgICAgICAgICA6IGRhc2hPbmx5VmlkZW9zLmxlbmd0aCB8fCBkYXNoQXVkaW9VcmxzLmxlbmd0aFxuICAgICAgICAgICAgICA/IFwiVGhpcyBzb3VyY2UgZXhwb3NlcyBzZXBhcmF0ZSBEQVNIIHZpZGVvIGFuZCBhdWRpbyBmaWxlcy5cIlxuICAgICAgICAgICAgICA6IG51bGwsXG4gICAgICAgICAgdGh1bWJuYWlsOiBpbWFnZURvd25sb2Fkc1swXSA/PyBudWxsLFxuICAgICAgICAgIGRvd25sb2FkczogW1xuICAgICAgICAgICAgLi4ubWVyZ2VkRGFzaFByaW1hcnksXG4gICAgICAgICAgICAuLi5oZFZpZGVvcy5tYXAoKHZpZGVvVXJsLCBpbmRleCkgPT4gKHtcbiAgICAgICAgICAgICAgbGFiZWw6IGBIRCB2aWRlbyAke2luZGV4ICsgMX1gLFxuICAgICAgICAgICAgICB1cmw6IHZpZGVvVXJsLFxuICAgICAgICAgICAgICBmaWxlbmFtZTogYGZhY2Vib29rLWhkLSR7aW5kZXggKyAxfS5tcDRgLFxuICAgICAgICAgICAgICBmdW5jdGlvbk5hbWU6IFwiZmFjZWJvb2stZG93bmxvYWRcIixcbiAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgIC4uLnNkVmlkZW9zXG4gICAgICAgICAgICAgIC5maWx0ZXIoKHZpZGVvVXJsKSA9PiAhaGRWaWRlb3MuaW5jbHVkZXModmlkZW9VcmwpKVxuICAgICAgICAgICAgICAubWFwKCh2aWRlb1VybCwgaW5kZXgpID0+ICh7XG4gICAgICAgICAgICAgICAgbGFiZWw6IGBTRCB2aWRlbyAke2luZGV4ICsgMX1gLFxuICAgICAgICAgICAgICAgIHVybDogdmlkZW9VcmwsXG4gICAgICAgICAgICAgICAgZmlsZW5hbWU6IGBmYWNlYm9vay1zZC0ke2luZGV4ICsgMX0ubXA0YCxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbk5hbWU6IFwiZmFjZWJvb2stZG93bmxvYWRcIixcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgLi4uZGFzaE9ubHlWaWRlb3MubWFwKCh2aWRlb1VybCwgaW5kZXgpID0+ICh7XG4gICAgICAgICAgICAgIGxhYmVsOiBgREFTSCB2aWRlbyAke2luZGV4ICsgMX1gLFxuICAgICAgICAgICAgICB1cmw6IHZpZGVvVXJsLFxuICAgICAgICAgICAgICBmaWxlbmFtZTogYGZhY2Vib29rLWRhc2gtdmlkZW8tJHtpbmRleCArIDF9Lm1wNGAsXG4gICAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogXCJmYWNlYm9vay1kb3dubG9hZFwiLFxuICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgLi4uZGFzaEF1ZGlvVXJscy5tYXAoKGF1ZGlvVXJsLCBpbmRleCkgPT4gKHtcbiAgICAgICAgICAgICAgbGFiZWw6IGBEQVNIIGF1ZGlvICR7aW5kZXggKyAxfWAsXG4gICAgICAgICAgICAgIHVybDogYXVkaW9VcmwsXG4gICAgICAgICAgICAgIGZpbGVuYW1lOiBgZmFjZWJvb2stZGFzaC1hdWRpby0ke2luZGV4ICsgMX0ubTRhYCxcbiAgICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImZhY2Vib29rLWRvd25sb2FkXCIsXG4gICAgICAgICAgICB9KSksXG4gICAgICAgICAgXSxcbiAgICAgICAgfV1cbiAgICAgIDogW107XG5cbiAgICBjb25zdCBpbWFnZUl0ZW1zID0gaW1hZ2VEb3dubG9hZHNcbiAgICAgIC5maWx0ZXIoKGltYWdlVXJsKSA9PiAhaW1hZ2VVcmwuaW5jbHVkZXMoXCJzYWZlX2ltYWdlLnBocFwiKSlcbiAgICAgIC5tYXAoKGltYWdlVXJsLCBpbmRleCkgPT4gKHtcbiAgICAgICAgaWQ6IGBpbWFnZS0ke2luZGV4ICsgMX1gLFxuICAgICAgICB0eXBlOiBcImltYWdlXCIgYXMgY29uc3QsXG4gICAgICAgIHRpdGxlOiBgSW1hZ2UgJHtpbmRleCArIDF9YCxcbiAgICAgICAgdGh1bWJuYWlsOiBpbWFnZVVybCxcbiAgICAgICAgZG93bmxvYWRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwiT3JpZ2luYWwgaW1hZ2VcIixcbiAgICAgICAgICAgIHVybDogaW1hZ2VVcmwsXG4gICAgICAgICAgICBmaWxlbmFtZTogYGZhY2Vib29rLWltYWdlLSR7aW5kZXggKyAxfS5qcGdgLFxuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiBcImZhY2Vib29rLWRvd25sb2FkXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pKTtcblxuICAgIGNvbnN0IGl0ZW1zID1cbiAgICAgIHJlcXVlc3RlZE1vZGUgPT09IFwidmlkZW9cIiB8fCByZXF1ZXN0ZWRNb2RlID09PSBcInJlZWxcIlxuICAgICAgICA/IHZpZGVvSXRlbXNcbiAgICAgICAgOiByZXF1ZXN0ZWRNb2RlID09PSBcInBvc3RcIlxuICAgICAgICAgID8gWy4uLnZpZGVvSXRlbXMsIC4uLmltYWdlSXRlbXNdXG4gICAgICAgICAgOiBbLi4udmlkZW9JdGVtcywgLi4uaW1hZ2VJdGVtc107XG5cbiAgICBpZiAoIWl0ZW1zLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJObyBkb3dubG9hZGFibGUgbWVkaWEgZm91bmQgZm9yIHRoYXQgRmFjZWJvb2sgbGlua1wiIH0sIDQwNCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGpzb24oe1xuICAgICAgcGxhdGZvcm06IFwiZmFjZWJvb2tcIixcbiAgICAgIHNvdXJjZVR5cGU6IHJlcXVlc3RlZE1vZGUsXG4gICAgICB0aXRsZTogZXh0cmFjdE1ldGEoZGVjb2RlZEh0bWwsIFwib2c6dGl0bGVcIikgPz8gXCJGYWNlYm9vayBtZWRpYVwiLFxuICAgICAgY2FwdGlvbjogZXh0cmFjdE1ldGEoZGVjb2RlZEh0bWwsIFwib2c6ZGVzY3JpcHRpb25cIikgPz8gbnVsbCxcbiAgICAgIHVzZXJuYW1lOiBudWxsLFxuICAgICAgYXV0aG9yTmFtZTogbnVsbCxcbiAgICAgIHByb2ZpbGVQaWM6IG51bGwsXG4gICAgICBjb3ZlcjogaXRlbXNbMF0/LnRodW1ibmFpbCA/PyBudWxsLFxuICAgICAgaXRlbXMsXG4gICAgICByZXNvbHZlZFVybDogcGFnZS5yZXNvbHZlZFVybCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gZXJyb3JcIjtcbiAgICByZXR1cm4ganNvbih7IGVycm9yOiBtZXNzYWdlIH0sIG1lc3NhZ2UuaW5jbHVkZXMoXCJDb3VsZCBub3QgZmV0Y2ggdGhhdCBGYWNlYm9vayBwYWdlXCIpID8gNDA0IDogNTAwKTtcbiAgfVxufTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1xcXFxwYXlzdGFjay50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvSmlud2lpbCUyME9uZ2luam8vRGVza3RvcC9zYXZldG9rLWV4cHJlc3MtbWFpbi9kZXYvZnVuY3Rpb25zL3BheXN0YWNrLnRzXCI7aW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkBzdXBhYmFzZS9zdXBhYmFzZS1qc1wiO1xyXG5pbXBvcnQge1xyXG4gIGNvcnNIZWFkZXJzLFxyXG4gIGpzb24sXHJcbn0gZnJvbSBcIi4uLy4uL3N1cGFiYXNlL2Z1bmN0aW9ucy9fc2hhcmVkL2h0dHAudHNcIjtcclxuXHJcbmNvbnN0IFBMQU5fQU1PVU5UX0tPQk8gPSAzOTAwO1xyXG5jb25zdCBQTEFOX0NVUlJFTkNZID0gXCJLRVNcIjtcclxuXHJcbnR5cGUgUGF5c3RhY2tBdXRoVXNlciA9IHtcclxuICBpZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbn07XHJcblxyXG50eXBlIFBheXN0YWNrSW5pdFJlc3BvbnNlID0ge1xyXG4gIHN0YXR1czogYm9vbGVhbjtcclxuICBtZXNzYWdlPzogc3RyaW5nO1xyXG4gIGRhdGE/OiB7XHJcbiAgICBhdXRob3JpemF0aW9uX3VybD86IHN0cmluZztcclxuICAgIGFjY2Vzc19jb2RlPzogc3RyaW5nO1xyXG4gICAgcmVmZXJlbmNlPzogc3RyaW5nO1xyXG4gIH07XHJcbn07XHJcblxyXG50eXBlIFBheXN0YWNrVmVyaWZ5UmVzcG9uc2UgPSB7XHJcbiAgc3RhdHVzOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U/OiBzdHJpbmc7XHJcbiAgZGF0YT86IHtcclxuICAgIHN0YXR1cz86IHN0cmluZztcclxuICAgIHBhaWRfYXQ/OiBzdHJpbmc7XHJcbiAgICBjdXN0b21lcj86IHtcclxuICAgICAgZW1haWw/OiBzdHJpbmc7XHJcbiAgICAgIGN1c3RvbWVyX2NvZGU/OiBzdHJpbmc7XHJcbiAgICB9O1xyXG4gICAgbWV0YWRhdGE/OiB7XHJcbiAgICAgIHVzZXJfaWQ/OiBzdHJpbmc7XHJcbiAgICAgIHBsYW4/OiBzdHJpbmc7XHJcbiAgICB9O1xyXG4gIH07XHJcbn07XHJcblxyXG5jb25zdCBlbnYgPSAoZ2xvYmFsVGhpcyBhcyB0eXBlb2YgZ2xvYmFsVGhpcyAmIHtcclxuICBwcm9jZXNzPzogeyBlbnY/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCB1bmRlZmluZWQ+IH07XHJcbn0pLnByb2Nlc3M/LmVudiA/PyB7fTtcclxuXHJcbmNvbnN0IGdldFN1cGFiYXNlVXJsID0gKCkgPT4gZW52LlZJVEVfU1VQQUJBU0VfVVJMID8/IGVudi5TVVBBQkFTRV9VUkwgPz8gXCJcIjtcclxuY29uc3QgZ2V0U3VwYWJhc2VQdWJsaXNoYWJsZUtleSA9ICgpID0+IGVudi5WSVRFX1NVUEFCQVNFX1BVQkxJU0hBQkxFX0tFWSA/PyBlbnYuU1VQQUJBU0VfUFVCTElTSEFCTEVfS0VZID8/IFwiXCI7XHJcbmNvbnN0IGdldFN1cGFiYXNlU2VydmljZUtleSA9ICgpID0+IGVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZID8/IFwiXCI7XHJcbmNvbnN0IGdldFBheXN0YWNrU2VjcmV0S2V5ID0gKCkgPT4gZW52LlBBWVNUQUNLX1NFQ1JFVF9LRVkgPz8gXCJcIjtcclxuXHJcbmNvbnN0IGNyZWF0ZUF1dGhlZENsaWVudCA9ICgpID0+IHtcclxuICBjb25zdCBzdXBhYmFzZVVybCA9IGdldFN1cGFiYXNlVXJsKCk7XHJcbiAgY29uc3Qgc3VwYWJhc2VLZXkgPSBnZXRTdXBhYmFzZVB1Ymxpc2hhYmxlS2V5KCk7XHJcblxyXG4gIGlmICghc3VwYWJhc2VVcmwgfHwgIXN1cGFiYXNlS2V5KSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIFN1cGFiYXNlIGVudmlyb25tZW50IHZhcmlhYmxlc1wiKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBjcmVhdGVDbGllbnQoc3VwYWJhc2VVcmwsIHN1cGFiYXNlS2V5KTtcclxufTtcclxuXHJcbmNvbnN0IGNyZWF0ZUFkbWluQ2xpZW50ID0gKCkgPT4ge1xyXG4gIGNvbnN0IHN1cGFiYXNlVXJsID0gZ2V0U3VwYWJhc2VVcmwoKTtcclxuICBjb25zdCBzZXJ2aWNlS2V5ID0gZ2V0U3VwYWJhc2VTZXJ2aWNlS2V5KCk7XHJcblxyXG4gIGlmICghc3VwYWJhc2VVcmwgfHwgIXNlcnZpY2VLZXkpIHJldHVybiBudWxsO1xyXG5cclxuICByZXR1cm4gY3JlYXRlQ2xpZW50KHN1cGFiYXNlVXJsLCBzZXJ2aWNlS2V5KTtcclxufTtcclxuXHJcbmNvbnN0IHJlcXVpcmVBdXRoZWRVc2VyID0gYXN5bmMgKHJlcTogUmVxdWVzdCk6IFByb21pc2U8UGF5c3RhY2tBdXRoVXNlcj4gPT4ge1xyXG4gIGNvbnN0IGF1dGhIZWFkZXIgPSByZXEuaGVhZGVycy5nZXQoXCJBdXRob3JpemF0aW9uXCIpO1xyXG4gIGlmICghYXV0aEhlYWRlcj8uc3RhcnRzV2l0aChcIkJlYXJlciBcIikpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIlVuYXV0aG9yaXplZFwiKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5yZXBsYWNlKFwiQmVhcmVyIFwiLCBcIlwiKTtcclxuICBjb25zdCBjbGllbnQgPSBjcmVhdGVBdXRoZWRDbGllbnQoKTtcclxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBjbGllbnQuYXV0aC5nZXRVc2VyKHRva2VuKTtcclxuXHJcbiAgaWYgKGVycm9yIHx8ICFkYXRhLnVzZXI/LmlkIHx8ICFkYXRhLnVzZXIuZW1haWwpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIlVuYXV0aG9yaXplZFwiKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBpZDogZGF0YS51c2VyLmlkLFxyXG4gICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcclxuICB9O1xyXG59O1xyXG5cclxuY29uc3QgcGVyc2lzdFN1YnNjcmliZXIgPSBhc3luYyAocGF5bG9hZDoge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgaXNQcm86IGJvb2xlYW47XHJcbiAgcmVmZXJlbmNlOiBzdHJpbmc7XHJcbiAgY3VzdG9tZXJDb2RlPzogc3RyaW5nIHwgbnVsbDtcclxuICBjdXJyZW50UGVyaW9kRW5kPzogc3RyaW5nIHwgbnVsbDtcclxufSkgPT4ge1xyXG4gIGNvbnN0IGFkbWluID0gY3JlYXRlQWRtaW5DbGllbnQoKTtcclxuICBpZiAoIWFkbWluKSByZXR1cm47XHJcblxyXG4gIGF3YWl0IGFkbWluLmZyb20oXCJzdWJzY3JpYmVyc1wiKS51cHNlcnQoXHJcbiAgICB7XHJcbiAgICAgIHVzZXJfaWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICBlbWFpbDogcGF5bG9hZC5lbWFpbCxcclxuICAgICAgaXNfcHJvOiBwYXlsb2FkLmlzUHJvLFxyXG4gICAgICBwYXlzdGFja19yZWZlcmVuY2U6IHBheWxvYWQucmVmZXJlbmNlLFxyXG4gICAgICBwYXlzdGFja19jdXN0b21lcl9jb2RlOiBwYXlsb2FkLmN1c3RvbWVyQ29kZSA/PyBudWxsLFxyXG4gICAgICBjdXJyZW50X3BlcmlvZF9lbmQ6IHBheWxvYWQuY3VycmVudFBlcmlvZEVuZCA/PyBudWxsLFxyXG4gICAgfSxcclxuICAgIHsgb25Db25mbGljdDogXCJ1c2VyX2lkXCIgfSxcclxuICApO1xyXG59O1xyXG5cclxuY29uc3QgY3JlYXRlUGF5c3RhY2tSZWZlcmVuY2UgPSAodXNlcklkOiBzdHJpbmcpID0+IGBwcm9fJHt1c2VySWR9XyR7RGF0ZS5ub3coKX1gO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZVBheXN0YWNrSW5pdGlhbGl6ZSA9IGFzeW5jIChyZXE6IFJlcXVlc3QpID0+IHtcclxuICBpZiAocmVxLm1ldGhvZCA9PT0gXCJPUFRJT05TXCIpIHtcclxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UoXCJva1wiLCB7IGhlYWRlcnM6IGNvcnNIZWFkZXJzIH0pO1xyXG4gIH1cclxuXHJcbiAgaWYgKHJlcS5tZXRob2QgIT09IFwiUE9TVFwiKSB7XHJcbiAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIk1ldGhvZCBub3QgYWxsb3dlZFwiIH0sIDQwNSk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgeyBpZDogdXNlcklkLCBlbWFpbCB9ID0gYXdhaXQgcmVxdWlyZUF1dGhlZFVzZXIocmVxKTtcclxuICAgIGNvbnN0IHNlY3JldEtleSA9IGdldFBheXN0YWNrU2VjcmV0S2V5KCk7XHJcblxyXG4gICAgaWYgKCFzZWNyZXRLZXkpIHtcclxuICAgICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJQQVlTVEFDS19TRUNSRVRfS0VZIGlzIG1pc3NpbmcgZnJvbSAuZW52XCIgfSwgNTAwKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKTtcclxuICAgIGNvbnN0IGNhbGxiYWNrVXJsID1cclxuICAgICAgdHlwZW9mIGJvZHk/LmNhbGxiYWNrX3VybCA9PT0gXCJzdHJpbmdcIiAmJiBib2R5LmNhbGxiYWNrX3VybC50cmltKCkubGVuZ3RoID4gMFxyXG4gICAgICAgID8gYm9keS5jYWxsYmFja191cmxcclxuICAgICAgICA6IGAke25ldyBVUkwocmVxLnVybCkub3JpZ2lufS9wcm9gO1xyXG5cclxuICAgIGNvbnN0IHJlZmVyZW5jZSA9IGNyZWF0ZVBheXN0YWNrUmVmZXJlbmNlKHVzZXJJZCk7XHJcblxyXG4gICAgY29uc3QgaW5pdFJlc3AgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vYXBpLnBheXN0YWNrLmNvL3RyYW5zYWN0aW9uL2luaXRpYWxpemVcIiwge1xyXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3NlY3JldEtleX1gLFxyXG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZW1haWwsXHJcbiAgICAgICAgYW1vdW50OiBQTEFOX0FNT1VOVF9LT0JPLFxyXG4gICAgICAgIGN1cnJlbmN5OiBQTEFOX0NVUlJFTkNZLFxyXG4gICAgICAgIHJlZmVyZW5jZSxcclxuICAgICAgICBjYWxsYmFja191cmw6IGNhbGxiYWNrVXJsLFxyXG4gICAgICAgIG1ldGFkYXRhOiB7IHVzZXJfaWQ6IHVzZXJJZCwgcGxhbjogXCJwcm9fbW9udGhseVwiIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgaW5pdEpzb24gPSAoYXdhaXQgaW5pdFJlc3AuanNvbigpKSBhcyBQYXlzdGFja0luaXRSZXNwb25zZTtcclxuXHJcbiAgICBpZiAoIWluaXRSZXNwLm9rIHx8ICFpbml0SnNvbi5zdGF0dXMpIHtcclxuICAgICAgcmV0dXJuIGpzb24oeyBlcnJvcjogaW5pdEpzb24ubWVzc2FnZSB8fCBcIkluaXQgZmFpbGVkXCIgfSwgNTAyKTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCBwZXJzaXN0U3Vic2NyaWJlcih7XHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGlzUHJvOiBmYWxzZSxcclxuICAgICAgcmVmZXJlbmNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGpzb24oe1xyXG4gICAgICBhdXRob3JpemF0aW9uX3VybDogaW5pdEpzb24uZGF0YT8uYXV0aG9yaXphdGlvbl91cmwsXHJcbiAgICAgIGFjY2Vzc19jb2RlOiBpbml0SnNvbi5kYXRhPy5hY2Nlc3NfY29kZSxcclxuICAgICAgcmVmZXJlbmNlOiBpbml0SnNvbi5kYXRhPy5yZWZlcmVuY2UgPz8gcmVmZXJlbmNlLFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5rbm93biBlcnJvclwiO1xyXG4gICAgY29uc3Qgc3RhdHVzID0gbWVzc2FnZSA9PT0gXCJVbmF1dGhvcml6ZWRcIiA/IDQwMSA6IDUwMDtcclxuICAgIHJldHVybiBqc29uKHsgZXJyb3I6IG1lc3NhZ2UgfSwgc3RhdHVzKTtcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlUGF5c3RhY2tWZXJpZnkgPSBhc3luYyAocmVxOiBSZXF1ZXN0KSA9PiB7XHJcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XHJcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKFwib2tcIiwgeyBoZWFkZXJzOiBjb3JzSGVhZGVycyB9KTtcclxuICB9XHJcblxyXG4gIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikge1xyXG4gICAgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJNZXRob2Qgbm90IGFsbG93ZWRcIiB9LCA0MDUpO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHsgaWQ6IHVzZXJJZCwgZW1haWwgfSA9IGF3YWl0IHJlcXVpcmVBdXRoZWRVc2VyKHJlcSk7XHJcbiAgICBjb25zdCBzZWNyZXRLZXkgPSBnZXRQYXlzdGFja1NlY3JldEtleSgpO1xyXG5cclxuICAgIGlmICghc2VjcmV0S2V5KSB7XHJcbiAgICAgIHJldHVybiBqc29uKHsgZXJyb3I6IFwiUEFZU1RBQ0tfU0VDUkVUX0tFWSBpcyBtaXNzaW5nIGZyb20gLmVudlwiIH0sIDUwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcS5qc29uKCkuY2F0Y2goKCkgPT4gKHt9KSk7XHJcbiAgICBjb25zdCByZWZlcmVuY2UgPSB0eXBlb2YgYm9keT8ucmVmZXJlbmNlID09PSBcInN0cmluZ1wiID8gYm9keS5yZWZlcmVuY2UudHJpbSgpIDogXCJcIjtcclxuICAgIGlmICghcmVmZXJlbmNlKSB7XHJcbiAgICAgIHJldHVybiBqc29uKHsgZXJyb3I6IFwiTWlzc2luZyByZWZlcmVuY2VcIiB9LCA0MDApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHZlcmlmeVJlc3AgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9hcGkucGF5c3RhY2suY28vdHJhbnNhY3Rpb24vdmVyaWZ5LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlZmVyZW5jZSl9YCwge1xyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3NlY3JldEtleX1gLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdmVyaWZ5SnNvbiA9IChhd2FpdCB2ZXJpZnlSZXNwLmpzb24oKSkgYXMgUGF5c3RhY2tWZXJpZnlSZXNwb25zZTtcclxuXHJcbiAgICBpZiAoIXZlcmlmeVJlc3Aub2sgfHwgIXZlcmlmeUpzb24uc3RhdHVzKSB7XHJcbiAgICAgIHJldHVybiBqc29uKHsgZXJyb3I6IHZlcmlmeUpzb24ubWVzc2FnZSB8fCBcIlZlcmlmeSBmYWlsZWRcIiB9LCA1MDIpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRhdGEgPSB2ZXJpZnlKc29uLmRhdGE7XHJcbiAgICBjb25zdCBpc1N1Y2Nlc3MgPSBkYXRhPy5zdGF0dXMgPT09IFwic3VjY2Vzc1wiO1xyXG4gICAgY29uc3QgbWV0YWRhdGFVc2VySWQgPSBkYXRhPy5tZXRhZGF0YT8udXNlcl9pZDtcclxuXHJcbiAgICBpZiAobWV0YWRhdGFVc2VySWQgJiYgbWV0YWRhdGFVc2VySWQgIT09IHVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIlJlZmVyZW5jZSBkb2VzIG5vdCBiZWxvbmcgdG8gdXNlclwiIH0sIDQwMyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFpc1N1Y2Nlc3MpIHtcclxuICAgICAgcmV0dXJuIGpzb24oe1xyXG4gICAgICAgIGlzX3BybzogZmFsc2UsXHJcbiAgICAgICAgc3RhdHVzOiBkYXRhPy5zdGF0dXMgPz8gXCJ1bmtub3duXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHBhaWRBdCA9IGRhdGE/LnBhaWRfYXQgPyBuZXcgRGF0ZShkYXRhLnBhaWRfYXQpIDogbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IGN1cnJlbnRQZXJpb2RFbmQgPSBuZXcgRGF0ZShwYWlkQXQuZ2V0VGltZSgpICsgMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgIGF3YWl0IHBlcnNpc3RTdWJzY3JpYmVyKHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogZW1haWwgPz8gZGF0YT8uY3VzdG9tZXI/LmVtYWlsID8/IFwiXCIsXHJcbiAgICAgIGlzUHJvOiB0cnVlLFxyXG4gICAgICByZWZlcmVuY2UsXHJcbiAgICAgIGN1c3RvbWVyQ29kZTogZGF0YT8uY3VzdG9tZXI/LmN1c3RvbWVyX2NvZGUgPz8gbnVsbCxcclxuICAgICAgY3VycmVudFBlcmlvZEVuZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBqc29uKHtcclxuICAgICAgaXNfcHJvOiB0cnVlLFxyXG4gICAgICBjdXJyZW50X3BlcmlvZF9lbmQ6IGN1cnJlbnRQZXJpb2RFbmQsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmtub3duIGVycm9yXCI7XHJcbiAgICBjb25zdCBzdGF0dXMgPSBtZXNzYWdlID09PSBcIlVuYXV0aG9yaXplZFwiID8gNDAxIDogNTAwO1xyXG4gICAgcmV0dXJuIGpzb24oeyBlcnJvcjogbWVzc2FnZSB9LCBzdGF0dXMpO1xyXG4gIH1cclxufTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKaW53aWlsIE9uZ2luam9cXFxcRGVza3RvcFxcXFxzYXZldG9rLWV4cHJlc3MtbWFpblxcXFxkZXZcXFxcZnVuY3Rpb25zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKaW53aWlsIE9uZ2luam9cXFxcRGVza3RvcFxcXFxzYXZldG9rLWV4cHJlc3MtbWFpblxcXFxkZXZcXFxcZnVuY3Rpb25zXFxcXHlvdXR1YmUudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL0ppbndpaWwlMjBPbmdpbmpvL0Rlc2t0b3Avc2F2ZXRvay1leHByZXNzLW1haW4vZGV2L2Z1bmN0aW9ucy95b3V0dWJlLnRzXCI7aW1wb3J0IHtcbiAgY29yc0hlYWRlcnMsXG4gIGZldGNoV2l0aFJldHJ5LFxuICBqc29uLFxuICBwcm94eURvd25sb2FkUmVzcG9uc2UsXG4gIHJlc29sdmVTaG9ydFVybCxcbiAgc2FuaXRpemVGaWxlbmFtZSxcbiAgVVNFUl9BR0VOVCxcbn0gZnJvbSBcIi4uLy4uL3N1cGFiYXNlL2Z1bmN0aW9ucy9fc2hhcmVkL2h0dHAudHNcIjtcbmltcG9ydCB7IG1lcmdlTXA0UmVzcG9uc2UsIHZhbGlkYXRlTXA0TWVyZ2VSZXF1ZXN0IH0gZnJvbSBcIi4vbWVyZ2UudHNcIjtcblxuY29uc3QgQUxMT1dFRF9ET1dOTE9BRF9IT1NUUyA9IFtcbiAgXCJnb29nbGV2aWRlby5jb21cIixcbiAgXCJ5b3V0dWJlLmNvbVwiLFxuICBcInlvdXR1LmJlXCIsXG4gIFwieXRpbWcuY29tXCIsXG4gIFwiZ2dwaHQuY29tXCIsXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBJTlZJRElPVVNfQkFTRVMgPSBbXG4gIFwiaHR0cHM6Ly95ZXd0dS5iZS9hcGkvdjFcIixcbiAgXCJodHRwczovL2ludi5uYWRla28ubmV0L2FwaS92MVwiLFxuICBcImh0dHBzOi8vdmlkLnB1ZmZ5YW4udXMvYXBpL3YxXCIsXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBBTkRST0lEX0NMSUVOVF9WRVJTSU9OID0gXCIyMC4xMC4zOFwiO1xuY29uc3QgQU5EUk9JRF9VU0VSX0FHRU5UID1cbiAgXCJjb20uZ29vZ2xlLmFuZHJvaWQueW91dHViZS8yMC4xMC4zOCAoTGludXg7IFU7IEFuZHJvaWQgMTQ7IGVuX1VTOyBQaXhlbCA4IFBybyBCdWlsZC9BUDFBLjI0MDUwNS4wMDUpXCI7XG5cbnR5cGUgVGh1bWJuYWlsID0ge1xuICB1cmw6IHN0cmluZztcbiAgd2lkdGg/OiBudW1iZXI7XG4gIGhlaWdodD86IG51bWJlcjtcbn07XG5cbnR5cGUgU3RyZWFtRm9ybWF0ID0ge1xuICB1cmw/OiBzdHJpbmc7XG4gIG1pbWVUeXBlPzogc3RyaW5nO1xuICBhdWRpb1F1YWxpdHk/OiBzdHJpbmc7XG4gIGJpdHJhdGU/OiBzdHJpbmcgfCBudW1iZXI7XG4gIHF1YWxpdHlMYWJlbD86IHN0cmluZztcbiAgcXVhbGl0eT86IHN0cmluZztcbn07XG5cbnR5cGUgWW91VHViZVZpZGVvID0ge1xuICB0aXRsZT86IHN0cmluZztcbiAgYXV0aG9yPzogc3RyaW5nO1xuICBhdXRob3JJZD86IHN0cmluZztcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHRodW1ibmFpbHM/OiBUaHVtYm5haWxbXTtcbiAgZm9ybWF0U3RyZWFtcz86IFN0cmVhbUZvcm1hdFtdO1xuICBhZGFwdGl2ZUZvcm1hdHM/OiBTdHJlYW1Gb3JtYXRbXTtcbn07XG5cbnR5cGUgSW52aWRpb3VzUGxheWxpc3QgPSB7XG4gIHRpdGxlPzogc3RyaW5nO1xuICBhdXRob3I/OiBzdHJpbmc7XG4gIGF1dGhvcklkPzogc3RyaW5nO1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcbiAgdmlkZW9zPzogQXJyYXk8e1xuICAgIHRpdGxlPzogc3RyaW5nO1xuICAgIHZpZGVvSWQ/OiBzdHJpbmc7XG4gICAgdmlkZW9UaHVtYm5haWxzPzogVGh1bWJuYWlsW107XG4gIH0+O1xufTtcblxudHlwZSBUZXh0UnVuID0ge1xuICB0ZXh0Pzogc3RyaW5nO1xufTtcblxudHlwZSBUZXh0VmFsdWUgPSB7XG4gIHNpbXBsZVRleHQ/OiBzdHJpbmc7XG4gIHJ1bnM/OiBUZXh0UnVuW107XG59O1xuXG50eXBlIFBsYXllclJlc3BvbnNlID0ge1xuICBwbGF5YWJpbGl0eVN0YXR1cz86IHtcbiAgICBzdGF0dXM/OiBzdHJpbmc7XG4gICAgcmVhc29uPzogc3RyaW5nO1xuICAgIG1lc3NhZ2VzPzogc3RyaW5nW107XG4gIH07XG4gIHZpZGVvRGV0YWlscz86IHtcbiAgICB0aXRsZT86IHN0cmluZztcbiAgICBhdXRob3I/OiBzdHJpbmc7XG4gICAgY2hhbm5lbElkPzogc3RyaW5nO1xuICAgIHNob3J0RGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gICAgdGh1bWJuYWlsPzoge1xuICAgICAgdGh1bWJuYWlscz86IFRodW1ibmFpbFtdO1xuICAgIH07XG4gIH07XG4gIG1pY3JvZm9ybWF0Pzoge1xuICAgIHBsYXllck1pY3JvZm9ybWF0UmVuZGVyZXI/OiB7XG4gICAgICB0aXRsZT86IFRleHRWYWx1ZTtcbiAgICAgIGRlc2NyaXB0aW9uPzogVGV4dFZhbHVlO1xuICAgICAgb3duZXJDaGFubmVsTmFtZT86IHN0cmluZztcbiAgICAgIGV4dGVybmFsQ2hhbm5lbElkPzogc3RyaW5nO1xuICAgICAgdGh1bWJuYWlsPzoge1xuICAgICAgICB0aHVtYm5haWxzPzogVGh1bWJuYWlsW107XG4gICAgICB9O1xuICAgIH07XG4gIH07XG4gIHN0cmVhbWluZ0RhdGE/OiB7XG4gICAgZm9ybWF0cz86IFN0cmVhbUZvcm1hdFtdO1xuICAgIGFkYXB0aXZlRm9ybWF0cz86IFN0cmVhbUZvcm1hdFtdO1xuICB9O1xufTtcblxuY29uc3Qgbm9ybWFsaXplVXJsID0gKHVybDogc3RyaW5nKSA9PiB7XG4gIGlmICh1cmwuc3RhcnRzV2l0aChcIi8vXCIpKSByZXR1cm4gYGh0dHBzOiR7dXJsfWA7XG4gIHJldHVybiB1cmw7XG59O1xuXG5jb25zdCBudW1lcmljUXVhbGl0eSA9ICh2YWx1ZTogc3RyaW5nIHwgdW5kZWZpbmVkKSA9PlxuICBwYXJzZUludCgodmFsdWUgPz8gXCIwXCIpLnJlcGxhY2UoL1xcRC9nLCBcIlwiKSB8fCBcIjBcIiwgMTApO1xuXG5jb25zdCBudW1lcmljQml0cmF0ZSA9ICh2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkKSA9PlxuICB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgPyB2YWx1ZSA6IHBhcnNlSW50KHZhbHVlID8/IFwiMFwiLCAxMCk7XG5cbmNvbnN0IGpvaW5SdW5zID0gKHZhbHVlOiBUZXh0VmFsdWUgfCB1bmRlZmluZWQpID0+IHtcbiAgY29uc3QgdGV4dCA9IHZhbHVlPy5zaW1wbGVUZXh0ID8/IHZhbHVlPy5ydW5zPy5tYXAoKHJ1bikgPT4gcnVuLnRleHQgPz8gXCJcIikuam9pbihcIlwiKTtcbiAgcmV0dXJuIHRleHQgfHwgdW5kZWZpbmVkO1xufTtcblxuY29uc3QgZXh0cmFjdFZpZGVvSWQgPSAodmFsdWU6IHN0cmluZykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICAgIGlmICh1cmwuaG9zdG5hbWUuZW5kc1dpdGgoXCJ5b3V0dS5iZVwiKSkgcmV0dXJuIHVybC5wYXRobmFtZS5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pWzBdID8/IG51bGw7XG4gICAgaWYgKHVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL3Nob3J0cy9cIikpIHJldHVybiB1cmwucGF0aG5hbWUuc3BsaXQoXCIvXCIpWzJdID8/IG51bGw7XG4gICAgaWYgKHVybC5wYXRobmFtZS5zdGFydHNXaXRoKFwiL2VtYmVkL1wiKSkgcmV0dXJuIHVybC5wYXRobmFtZS5zcGxpdChcIi9cIilbMl0gPz8gbnVsbDtcbiAgICByZXR1cm4gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJ2XCIpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcblxuY29uc3QgZXh0cmFjdFBsYXlsaXN0SWQgPSAodmFsdWU6IHN0cmluZykgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwodmFsdWUpO1xuICAgIHJldHVybiB1cmwuc2VhcmNoUGFyYW1zLmdldChcImxpc3RcIik7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59O1xuXG5jb25zdCBmZXRjaEZyb21JbnZpZGlvdXMgPSBhc3luYyA8VD4ocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUPiA9PiB7XG4gIGxldCBsYXN0RXJyb3I6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICBmb3IgKGNvbnN0IGJhc2Ugb2YgSU5WSURJT1VTX0JBU0VTKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoYCR7YmFzZX0ke3BhdGh9YCwge1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IFVTRVJfQUdFTlQsXG4gICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgfSxcbiAgICAgIH0sIHtcbiAgICAgICAgYXR0ZW1wdHM6IDMsXG4gICAgICAgIGJhY2tvZmZNczogNDUwLFxuICAgICAgfSk7XG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgIGxhc3RFcnJvciA9IGBJbnZpZGlvdXMgZXJyb3IgJHtyZXNwb25zZS5zdGF0dXN9YDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpIGFzIFQ7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxhc3RFcnJvciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJVbmtub3duIEludmlkaW91cyBlcnJvclwiO1xuICAgIH1cbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IobGFzdEVycm9yID8/IFwiTm8gWW91VHViZSBzb3VyY2UgaXMgYXZhaWxhYmxlIHJpZ2h0IG5vd1wiKTtcbn07XG5cbmNvbnN0IGV4dHJhY3RJbm5lcnR1YmVBcGlLZXkgPSAoaHRtbDogc3RyaW5nKSA9PlxuICBodG1sLm1hdGNoKC9cIklOTkVSVFVCRV9BUElfS0VZXCI6XCIoW15cIl0rKVwiLyk/LlsxXVxuICA/PyBodG1sLm1hdGNoKC9bXCInXUlOTkVSVFVCRV9BUElfS0VZW1wiJ11cXHMqOlxccypbXCInXShbXlwiJ10rKVtcIiddLyk/LlsxXVxuICA/PyBudWxsO1xuXG5jb25zdCBmZXRjaEZyb21Jbm5lcnR1YmUgPSBhc3luYyAodmlkZW9JZDogc3RyaW5nKTogUHJvbWlzZTxQbGF5ZXJSZXNwb25zZT4gPT4ge1xuICBjb25zdCB3YXRjaFVybCA9IGBodHRwczovL3d3dy55b3V0dWJlLmNvbS93YXRjaD92PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHZpZGVvSWQpfSZicGN0cj05OTk5OTk5OTk5Jmhhc192ZXJpZmllZD0xJmhsPWVuYDtcbiAgY29uc3Qgd2F0Y2hSZXNwb25zZSA9IGF3YWl0IGZldGNoV2l0aFJldHJ5KHdhdGNoVXJsLCB7XG4gICAgaGVhZGVyczoge1xuICAgICAgXCJVc2VyLUFnZW50XCI6IFVTRVJfQUdFTlQsXG4gICAgICBBY2NlcHQ6IFwidGV4dC9odG1sLGFwcGxpY2F0aW9uL3hodG1sK3htbCxhcHBsaWNhdGlvbi94bWw7cT0wLjksKi8qO3E9MC44XCIsXG4gICAgICBcIkFjY2VwdC1MYW5ndWFnZVwiOiBcImVuLVVTLGVuO3E9MC45XCIsXG4gICAgfSxcbiAgfSwge1xuICAgIGF0dGVtcHRzOiAzLFxuICAgIGJhY2tvZmZNczogNTAwLFxuICB9KTtcblxuICBpZiAoIXdhdGNoUmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFlvdVR1YmUgd2F0Y2ggcGFnZSBlcnJvciAke3dhdGNoUmVzcG9uc2Uuc3RhdHVzfWApO1xuICB9XG5cbiAgY29uc3Qgd2F0Y2hIdG1sID0gYXdhaXQgd2F0Y2hSZXNwb25zZS50ZXh0KCk7XG4gIGNvbnN0IGFwaUtleSA9IGV4dHJhY3RJbm5lcnR1YmVBcGlLZXkod2F0Y2hIdG1sKTtcbiAgaWYgKCFhcGlLZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcmVhZCBZb3VUdWJlIHBsYXllciBjb25maWd1cmF0aW9uXCIpO1xuICB9XG5cbiAgY29uc3QgcGxheWVyUmVzcG9uc2UgPSBhd2FpdCBmZXRjaFdpdGhSZXRyeShgaHR0cHM6Ly93d3cueW91dHViZS5jb20veW91dHViZWkvdjEvcGxheWVyP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudChhcGlLZXkpfSZwcmV0dHlQcmludD1mYWxzZWAsIHtcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiVXNlci1BZ2VudFwiOiBBTkRST0lEX1VTRVJfQUdFTlQsXG4gICAgICBBY2NlcHQ6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICBcIkFjY2VwdC1MYW5ndWFnZVwiOiBcImVuLVVTLGVuO3E9MC45XCIsXG4gICAgICBPcmlnaW46IFwiaHR0cHM6Ly93d3cueW91dHViZS5jb21cIixcbiAgICAgIFJlZmVyZXI6IHdhdGNoUmVzcG9uc2UudXJsIHx8IHdhdGNoVXJsLFxuICAgICAgXCJYLVlvdVR1YmUtQ2xpZW50LU5hbWVcIjogXCIzXCIsXG4gICAgICBcIlgtWW91VHViZS1DbGllbnQtVmVyc2lvblwiOiBBTkRST0lEX0NMSUVOVF9WRVJTSU9OLFxuICAgIH0sXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgY29udGV4dDoge1xuICAgICAgICBjbGllbnQ6IHtcbiAgICAgICAgICBjbGllbnROYW1lOiBcIkFORFJPSURcIixcbiAgICAgICAgICBjbGllbnRWZXJzaW9uOiBBTkRST0lEX0NMSUVOVF9WRVJTSU9OLFxuICAgICAgICAgIGhsOiBcImVuXCIsXG4gICAgICAgICAgZ2w6IFwiVVNcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB2aWRlb0lkLFxuICAgICAgY29udGVudENoZWNrT2s6IHRydWUsXG4gICAgICByYWN5Q2hlY2tPazogdHJ1ZSxcbiAgICB9KSxcbiAgfSwge1xuICAgIGF0dGVtcHRzOiAzLFxuICAgIGJhY2tvZmZNczogNTAwLFxuICB9KTtcblxuICBpZiAoIXBsYXllclJlc3BvbnNlLm9rKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBZb3VUdWJlIHBsYXllciBBUEkgZXJyb3IgJHtwbGF5ZXJSZXNwb25zZS5zdGF0dXN9YCk7XG4gIH1cblxuICBjb25zdCBwYXlsb2FkID0gYXdhaXQgcGxheWVyUmVzcG9uc2UuanNvbigpIGFzIFBsYXllclJlc3BvbnNlO1xuICBjb25zdCBwbGF5YWJpbGl0eSA9IHBheWxvYWQucGxheWFiaWxpdHlTdGF0dXM/LnN0YXR1cztcbiAgaWYgKHBsYXlhYmlsaXR5ICYmIHBsYXlhYmlsaXR5ICE9PSBcIk9LXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBwYXlsb2FkLnBsYXlhYmlsaXR5U3RhdHVzPy5yZWFzb25cbiAgICAgID8/IHBheWxvYWQucGxheWFiaWxpdHlTdGF0dXM/Lm1lc3NhZ2VzPy5bMF1cbiAgICAgID8/IGBZb3VUdWJlIHBsYXlhYmlsaXR5IHN0YXR1cyAke3BsYXlhYmlsaXR5fWAsXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBwYXlsb2FkO1xufTtcblxuY29uc3QgYmVzdFRodW1ibmFpbCA9ICh0aHVtYm5haWxzOiBUaHVtYm5haWxbXSB8IHVuZGVmaW5lZCkgPT4ge1xuICBjb25zdCBiZXN0ID0gdGh1bWJuYWlscz8uc2xpY2UoKS5zb3J0KChhLCBiKSA9PiAoYi53aWR0aCA/PyAwKSAtIChhLndpZHRoID8/IDApKVswXTtcbiAgcmV0dXJuIGJlc3Q/LnVybCA/IG5vcm1hbGl6ZVVybChiZXN0LnVybCkgOiBudWxsO1xufTtcblxuY29uc3QgYmVzdFZpZGVvU3RyZWFtID0gKHZpZGVvOiBZb3VUdWJlVmlkZW8pID0+XG4gIHZpZGVvLmZvcm1hdFN0cmVhbXNcbiAgICA/LmZpbHRlcigoc3RyZWFtKSA9PiBzdHJlYW0udXJsICYmIHN0cmVhbS5taW1lVHlwZT8uaW5jbHVkZXMoXCJ2aWRlby9tcDRcIikpXG4gICAgLnNvcnQoKGEsIGIpID0+IG51bWVyaWNRdWFsaXR5KGIucXVhbGl0eUxhYmVsID8/IGIucXVhbGl0eSkgLSBudW1lcmljUXVhbGl0eShhLnF1YWxpdHlMYWJlbCA/PyBhLnF1YWxpdHkpKVswXSA/PyBudWxsO1xuXG5jb25zdCBiZXN0QWRhcHRpdmVWaWRlb1N0cmVhbSA9ICh2aWRlbzogWW91VHViZVZpZGVvKSA9PlxuICB2aWRlby5hZGFwdGl2ZUZvcm1hdHNcbiAgICA/LmZpbHRlcigoc3RyZWFtKSA9PiBzdHJlYW0udXJsICYmIHN0cmVhbS5taW1lVHlwZT8uaW5jbHVkZXMoXCJ2aWRlby9tcDRcIikpXG4gICAgLnNvcnQoKGEsIGIpID0+XG4gICAgICBudW1lcmljUXVhbGl0eShiLnF1YWxpdHlMYWJlbCA/PyBiLnF1YWxpdHkpIC0gbnVtZXJpY1F1YWxpdHkoYS5xdWFsaXR5TGFiZWwgPz8gYS5xdWFsaXR5KVxuICAgICAgfHwgbnVtZXJpY0JpdHJhdGUoYi5iaXRyYXRlKSAtIG51bWVyaWNCaXRyYXRlKGEuYml0cmF0ZSkpWzBdID8/IG51bGw7XG5cbmNvbnN0IGJlc3RBdWRpb1N0cmVhbSA9ICh2aWRlbzogWW91VHViZVZpZGVvKSA9PlxuICB2aWRlby5hZGFwdGl2ZUZvcm1hdHNcbiAgICA/LmZpbHRlcigoc3RyZWFtKSA9PiBzdHJlYW0udXJsICYmIHN0cmVhbS5taW1lVHlwZT8uaW5jbHVkZXMoXCJhdWRpby9cIikpXG4gICAgLnNvcnQoKGEsIGIpID0+IG51bWVyaWNCaXRyYXRlKGIuYml0cmF0ZSkgLSBudW1lcmljQml0cmF0ZShhLmJpdHJhdGUpKVswXSA/PyBudWxsO1xuXG5jb25zdCBiZXN0TXA0QXVkaW9TdHJlYW0gPSAodmlkZW86IFlvdVR1YmVWaWRlbykgPT5cbiAgdmlkZW8uYWRhcHRpdmVGb3JtYXRzXG4gICAgPy5maWx0ZXIoKHN0cmVhbSkgPT4gc3RyZWFtLnVybCAmJiBzdHJlYW0ubWltZVR5cGU/LmluY2x1ZGVzKFwiYXVkaW8vbXA0XCIpKVxuICAgIC5zb3J0KChhLCBiKSA9PiBudW1lcmljQml0cmF0ZShiLmJpdHJhdGUpIC0gbnVtZXJpY0JpdHJhdGUoYS5iaXRyYXRlKSlbMF0gPz8gbnVsbDtcblxuY29uc3QgYXVkaW9FeHRlbnNpb24gPSAoc3RyZWFtOiBTdHJlYW1Gb3JtYXQgfCBudWxsIHwgdW5kZWZpbmVkKSA9PlxuICBzdHJlYW0/Lm1pbWVUeXBlPy5pbmNsdWRlcyhcIndlYm1cIikgPyBcIndlYm1cIiA6IFwibTRhXCI7XG5cbmNvbnN0IHRvWW91VHViZVZpZGVvID0gKHBheWxvYWQ6IFBsYXllclJlc3BvbnNlKTogWW91VHViZVZpZGVvID0+ICh7XG4gIHRpdGxlOiBwYXlsb2FkLnZpZGVvRGV0YWlscz8udGl0bGUgPz8gam9pblJ1bnMocGF5bG9hZC5taWNyb2Zvcm1hdD8ucGxheWVyTWljcm9mb3JtYXRSZW5kZXJlcj8udGl0bGUpID8/IFwiWW91VHViZSBtZWRpYVwiLFxuICBhdXRob3I6IHBheWxvYWQudmlkZW9EZXRhaWxzPy5hdXRob3IgPz8gcGF5bG9hZC5taWNyb2Zvcm1hdD8ucGxheWVyTWljcm9mb3JtYXRSZW5kZXJlcj8ub3duZXJDaGFubmVsTmFtZSxcbiAgYXV0aG9ySWQ6IHBheWxvYWQudmlkZW9EZXRhaWxzPy5jaGFubmVsSWQgPz8gcGF5bG9hZC5taWNyb2Zvcm1hdD8ucGxheWVyTWljcm9mb3JtYXRSZW5kZXJlcj8uZXh0ZXJuYWxDaGFubmVsSWQsXG4gIGRlc2NyaXB0aW9uOiBwYXlsb2FkLnZpZGVvRGV0YWlscz8uc2hvcnREZXNjcmlwdGlvbiA/PyBqb2luUnVucyhwYXlsb2FkLm1pY3JvZm9ybWF0Py5wbGF5ZXJNaWNyb2Zvcm1hdFJlbmRlcmVyPy5kZXNjcmlwdGlvbiksXG4gIHRodW1ibmFpbHM6XG4gICAgcGF5bG9hZC52aWRlb0RldGFpbHM/LnRodW1ibmFpbD8udGh1bWJuYWlsc1xuICAgID8/IHBheWxvYWQubWljcm9mb3JtYXQ/LnBsYXllck1pY3JvZm9ybWF0UmVuZGVyZXI/LnRodW1ibmFpbD8udGh1bWJuYWlsc1xuICAgID8/IFtdLFxuICBmb3JtYXRTdHJlYW1zOiBwYXlsb2FkLnN0cmVhbWluZ0RhdGE/LmZvcm1hdHMgPz8gW10sXG4gIGFkYXB0aXZlRm9ybWF0czogcGF5bG9hZC5zdHJlYW1pbmdEYXRhPy5hZGFwdGl2ZUZvcm1hdHMgPz8gW10sXG59KTtcblxuY29uc3QgbWFrZVZpZGVvSXRlbSA9ICh2aWRlb0lkOiBzdHJpbmcsIHZpZGVvOiBZb3VUdWJlVmlkZW8sIG1vZGU6IHN0cmluZykgPT4ge1xuICBjb25zdCB0aHVtYm5haWwgPSBiZXN0VGh1bWJuYWlsKHZpZGVvLnRodW1ibmFpbHMpXG4gICAgPz8gYGh0dHBzOi8vaS55dGltZy5jb20vdmkvJHt2aWRlb0lkfS9tYXhyZXNkZWZhdWx0LmpwZ2A7XG4gIGNvbnN0IHByb2dyZXNzaXZlVmlkZW9TdHJlYW0gPSBiZXN0VmlkZW9TdHJlYW0odmlkZW8pO1xuICBjb25zdCBhZGFwdGl2ZVZpZGVvU3RyZWFtID0gcHJvZ3Jlc3NpdmVWaWRlb1N0cmVhbSA/IG51bGwgOiBiZXN0QWRhcHRpdmVWaWRlb1N0cmVhbSh2aWRlbyk7XG4gIGNvbnN0IHZpZGVvU3RyZWFtID0gcHJvZ3Jlc3NpdmVWaWRlb1N0cmVhbSA/PyBhZGFwdGl2ZVZpZGVvU3RyZWFtO1xuICBjb25zdCBwcmVmZXJyZWRNcDRBdWRpb1N0cmVhbSA9IGJlc3RNcDRBdWRpb1N0cmVhbSh2aWRlbyk7XG4gIGNvbnN0IGZhbGxiYWNrQXVkaW9TdHJlYW0gPSBiZXN0QXVkaW9TdHJlYW0odmlkZW8pO1xuICBjb25zdCBhdWRpb1N0cmVhbSA9IG1vZGUgPT09IFwiYXVkaW9cIlxuICAgID8gZmFsbGJhY2tBdWRpb1N0cmVhbVxuICAgIDogcHJlZmVycmVkTXA0QXVkaW9TdHJlYW0gPz8gZmFsbGJhY2tBdWRpb1N0cmVhbTtcbiAgY29uc3QgY2FuTWVyZ2UgPSBtb2RlICE9PSBcImF1ZGlvXCJcbiAgICAmJiAhcHJvZ3Jlc3NpdmVWaWRlb1N0cmVhbVxuICAgICYmIEJvb2xlYW4oYWRhcHRpdmVWaWRlb1N0cmVhbT8udXJsKVxuICAgICYmIEJvb2xlYW4ocHJlZmVycmVkTXA0QXVkaW9TdHJlYW0/LnVybCk7XG4gIGNvbnN0IHNlcGFyYXRlVHJhY2tzID0gIXByb2dyZXNzaXZlVmlkZW9TdHJlYW0gJiYgQm9vbGVhbihhZGFwdGl2ZVZpZGVvU3RyZWFtPy51cmwpICYmIEJvb2xlYW4oZmFsbGJhY2tBdWRpb1N0cmVhbT8udXJsKTtcbiAgY29uc3QgZG93bmxvYWRzID0gW107XG5cbiAgaWYgKG1vZGUgPT09IFwiYXVkaW9cIiAmJiBhdWRpb1N0cmVhbT8udXJsKSB7XG4gICAgZG93bmxvYWRzLnB1c2goe1xuICAgICAgbGFiZWw6IFwiQXVkaW9cIixcbiAgICAgIHVybDogYXVkaW9TdHJlYW0udXJsLFxuICAgICAgZmlsZW5hbWU6IGAke3ZpZGVvSWR9LiR7YXVkaW9FeHRlbnNpb24oYXVkaW9TdHJlYW0pfWAsXG4gICAgICBmdW5jdGlvbk5hbWU6IFwieW91dHViZS1kb3dubG9hZFwiLFxuICAgICAgcXVhbGl0eTogYXVkaW9TdHJlYW0uYXVkaW9RdWFsaXR5ID8/IG51bGwsXG4gICAgfSk7XG4gIH1cbiAgaWYgKGNhbk1lcmdlICYmIGFkYXB0aXZlVmlkZW9TdHJlYW0/LnVybCAmJiBwcmVmZXJyZWRNcDRBdWRpb1N0cmVhbT8udXJsKSB7XG4gICAgZG93bmxvYWRzLnB1c2goe1xuICAgICAgbGFiZWw6IFwiTWVyZ2VkIE1QNFwiLFxuICAgICAgdXJsOiBhZGFwdGl2ZVZpZGVvU3RyZWFtLnVybCxcbiAgICAgIGZpbGVuYW1lOiBgJHt2aWRlb0lkfS5tcDRgLFxuICAgICAgZnVuY3Rpb25OYW1lOiBcInlvdXR1YmUtZG93bmxvYWRcIixcbiAgICAgIHF1YWxpdHk6IGFkYXB0aXZlVmlkZW9TdHJlYW0ucXVhbGl0eUxhYmVsID8/IGFkYXB0aXZlVmlkZW9TdHJlYW0ucXVhbGl0eSA/PyBudWxsLFxuICAgICAgbWVyZ2VTdHJhdGVneTogXCJtdXgtbXA0XCIgYXMgY29uc3QsXG4gICAgICBtZXJnZUF1ZGlvVXJsOiBwcmVmZXJyZWRNcDRBdWRpb1N0cmVhbS51cmwsXG4gICAgfSk7XG4gIH1cbiAgaWYgKHZpZGVvU3RyZWFtPy51cmwpIHtcbiAgICBkb3dubG9hZHMucHVzaCh7XG4gICAgICBsYWJlbDogW1xuICAgICAgICB2aWRlb1N0cmVhbS5xdWFsaXR5TGFiZWwgPz8gdmlkZW9TdHJlYW0ucXVhbGl0eSA/PyBcIlZpZGVvXCIsXG4gICAgICAgIGNhbk1lcmdlIHx8IHNlcGFyYXRlVHJhY2tzID8gXCJ2aWRlbyBvbmx5XCIgOiBudWxsLFxuICAgICAgXS5maWx0ZXIoQm9vbGVhbikuam9pbihcIiBcIiksXG4gICAgICB1cmw6IHZpZGVvU3RyZWFtLnVybCxcbiAgICAgIGZpbGVuYW1lOiBgJHt2aWRlb0lkfS5tcDRgLFxuICAgICAgZnVuY3Rpb25OYW1lOiBcInlvdXR1YmUtZG93bmxvYWRcIixcbiAgICAgIHF1YWxpdHk6IHZpZGVvU3RyZWFtLnF1YWxpdHlMYWJlbCA/PyB2aWRlb1N0cmVhbS5xdWFsaXR5ID8/IG51bGwsXG4gICAgfSk7XG4gIH1cbiAgaWYgKG1vZGUgIT09IFwiYXVkaW9cIiAmJiBhdWRpb1N0cmVhbT8udXJsKSB7XG4gICAgZG93bmxvYWRzLnB1c2goe1xuICAgICAgbGFiZWw6IFwiQXVkaW9cIixcbiAgICAgIHVybDogYXVkaW9TdHJlYW0udXJsLFxuICAgICAgZmlsZW5hbWU6IGAke3ZpZGVvSWR9LiR7YXVkaW9FeHRlbnNpb24oYXVkaW9TdHJlYW0pfWAsXG4gICAgICBmdW5jdGlvbk5hbWU6IFwieW91dHViZS1kb3dubG9hZFwiLFxuICAgICAgcXVhbGl0eTogYXVkaW9TdHJlYW0uYXVkaW9RdWFsaXR5ID8/IG51bGwsXG4gICAgfSk7XG4gIH1cbiAgZG93bmxvYWRzLnB1c2goe1xuICAgIGxhYmVsOiBcIlRodW1ibmFpbFwiLFxuICAgIHVybDogdGh1bWJuYWlsLFxuICAgIGZpbGVuYW1lOiBgJHt2aWRlb0lkfS10aHVtYm5haWwuanBnYCxcbiAgICBmdW5jdGlvbk5hbWU6IFwieW91dHViZS1kb3dubG9hZFwiLFxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGlkOiB2aWRlb0lkLFxuICAgIHR5cGU6IG1vZGUgPT09IFwiYXVkaW9cIiA/IFwiYXVkaW9cIiA6IFwidmlkZW9cIixcbiAgICB0aXRsZTogdmlkZW8udGl0bGUgPz8gXCJZb3VUdWJlIG1lZGlhXCIsXG4gICAgZGVzY3JpcHRpb246XG4gICAgICBjYW5NZXJnZVxuICAgICAgICA/IFt2aWRlby5kZXNjcmlwdGlvbiwgXCJTZXJ2ZXIgd2lsbCBhdXRvbWF0aWNhbGx5IG1lcmdlIHRoZSBzZXBhcmF0ZSB2aWRlbyBhbmQgYXVkaW8gdHJhY2tzIGludG8gb25lIE1QNC5cIl1cbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgLmpvaW4oXCIgXCIpXG4gICAgICAgIDogc2VwYXJhdGVUcmFja3NcbiAgICAgICAgICA/IFt2aWRlby5kZXNjcmlwdGlvbiwgXCJUaGlzIHNvdXJjZSBleHBvc2VzIHNlcGFyYXRlIHZpZGVvIGFuZCBhdWRpbyBmaWxlcy5cIl1cbiAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAgIC5qb2luKFwiIFwiKVxuICAgICAgICAgIDogdmlkZW8uZGVzY3JpcHRpb24gPz8gbnVsbCxcbiAgICB0aHVtYm5haWwsXG4gICAgZG93bmxvYWRzLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZVlvdVR1YmVEb3dubG9hZCA9IGFzeW5jIChyZXE6IFJlcXVlc3QpID0+IHtcbiAgaWYgKHJlcS5tZXRob2QgPT09IFwiT1BUSU9OU1wiKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIm9rXCIsIHsgaGVhZGVyczogY29yc0hlYWRlcnMgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiIHx8IHJlcS5tZXRob2QgPT09IFwiSEVBRFwiKSB7XG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwpO1xuICAgICAgY29uc3QgZmlsZVVybCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwiZmlsZVwiKTtcbiAgICAgIGNvbnN0IGF1ZGlvVXJsID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJhdWRpb1wiKTtcbiAgICAgIGNvbnN0IG1lcmdlID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJtZXJnZVwiKTtcbiAgICAgIGNvbnN0IGZpbGVuYW1lID0gc2FuaXRpemVGaWxlbmFtZSh1cmwuc2VhcmNoUGFyYW1zLmdldChcImZpbGVuYW1lXCIpIHx8IFwieW91dHViZS1tZWRpYVwiKTtcbiAgICAgIGlmICghZmlsZVVybCkgcmV0dXJuIGpzb24oeyBlcnJvcjogXCJNaXNzaW5nIGZpbGUgVVJMXCIgfSwgNDAwKTtcbiAgICAgIGlmIChtZXJnZSA9PT0gXCJtdXgtbXA0XCIpIHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiSEVBRFwiKSB7XG4gICAgICAgICAgYXdhaXQgdmFsaWRhdGVNcDRNZXJnZVJlcXVlc3QoZmlsZVVybCwgYXVkaW9VcmwsIEFMTE9XRURfRE9XTkxPQURfSE9TVFMsIHtcbiAgICAgICAgICAgIHJlZmVyZXI6IFwiaHR0cHM6Ly93d3cueW91dHViZS5jb20vXCIsXG4gICAgICAgICAgICB1c2VyQWdlbnQ6IEFORFJPSURfVVNFUl9BR0VOVCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gbmV3IFJlc3BvbnNlKG51bGwsIHsgc3RhdHVzOiAyMDQsIGhlYWRlcnM6IGNvcnNIZWFkZXJzIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBtZXJnZU1wNFJlc3BvbnNlKGZpbGVVcmwsIGF1ZGlvVXJsLCBmaWxlbmFtZSwgQUxMT1dFRF9ET1dOTE9BRF9IT1NUUywge1xuICAgICAgICAgIHJlZmVyZXI6IFwiaHR0cHM6Ly93d3cueW91dHViZS5jb20vXCIsXG4gICAgICAgICAgZGVmYXVsdEZpbGVuYW1lOiBcInlvdXR1YmUtbWVkaWFcIixcbiAgICAgICAgICB1c2VyQWdlbnQ6IEFORFJPSURfVVNFUl9BR0VOVCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJIRUFEXCIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7IHN0YXR1czogMjA0LCBoZWFkZXJzOiBjb3JzSGVhZGVycyB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhd2FpdCBwcm94eURvd25sb2FkUmVzcG9uc2UoZmlsZVVybCwgZmlsZW5hbWUsIEFMTE9XRURfRE9XTkxPQURfSE9TVFMsIHtcbiAgICAgICAgcmVmZXJlcjogXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9cIixcbiAgICAgICAgdXNlckFnZW50OiBBTkRST0lEX1VTRVJfQUdFTlQsXG4gICAgICAgIGZvcmNlUmFuZ2VSZXF1ZXN0OiB0cnVlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcS5qc29uKCk7XG4gICAgY29uc3QgcmVxdWVzdGVkVXJsID0gYm9keT8udXJsO1xuICAgIGNvbnN0IHJlcXVlc3RlZE1vZGUgPSB0eXBlb2YgYm9keT8ubW9kZSA9PT0gXCJzdHJpbmdcIiA/IGJvZHkubW9kZSA6IFwidmlkZW9cIjtcbiAgICBpZiAoIXJlcXVlc3RlZFVybCB8fCB0eXBlb2YgcmVxdWVzdGVkVXJsICE9PSBcInN0cmluZ1wiKSB7XG4gICAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIk1pc3NpbmcgWW91VHViZSBVUkxcIiB9LCA0MDApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgcmVzb2x2ZVNob3J0VXJsKHJlcXVlc3RlZFVybCk7XG4gICAgY29uc3QgZmluYWxVcmwgPSByZXNvbHZlZC51cmw7XG5cbiAgICBpZiAocmVxdWVzdGVkTW9kZSA9PT0gXCJwbGF5bGlzdFwiKSB7XG4gICAgICBjb25zdCBwbGF5bGlzdElkID0gZXh0cmFjdFBsYXlsaXN0SWQoZmluYWxVcmwpO1xuICAgICAgaWYgKCFwbGF5bGlzdElkKSB7XG4gICAgICAgIHJldHVybiBqc29uKHsgZXJyb3I6IFwiUGxlYXNlIGVudGVyIGEgdmFsaWQgWW91VHViZSBwbGF5bGlzdCBVUkxcIiB9LCA0MDApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwbGF5bGlzdCA9IGF3YWl0IGZldGNoRnJvbUludmlkaW91czxJbnZpZGlvdXNQbGF5bGlzdD4oYC9wbGF5bGlzdHMvJHtwbGF5bGlzdElkfWApO1xuICAgICAgY29uc3QgdmlkZW9zID0gcGxheWxpc3QudmlkZW9zID8/IFtdO1xuICAgICAgY29uc3Qgc2V0dGxlZCA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChcbiAgICAgICAgdmlkZW9zLm1hcChhc3luYyAoZW50cnkpID0+IHtcbiAgICAgICAgICBpZiAoIWVudHJ5LnZpZGVvSWQpIHJldHVybiBudWxsO1xuICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBmZXRjaEZyb21Jbm5lcnR1YmUoZW50cnkudmlkZW9JZCk7XG4gICAgICAgICAgcmV0dXJuIG1ha2VWaWRlb0l0ZW0oZW50cnkudmlkZW9JZCwgdG9Zb3VUdWJlVmlkZW8ocGF5bG9hZCksIFwidmlkZW9cIik7XG4gICAgICAgIH0pLFxuICAgICAgKTtcblxuICAgICAgY29uc3QgaXRlbXMgPSBzZXR0bGVkXG4gICAgICAgIC5tYXAoKHJlc3VsdCkgPT4gKHJlc3VsdC5zdGF0dXMgPT09IFwiZnVsZmlsbGVkXCIgPyByZXN1bHQudmFsdWUgOiBudWxsKSlcbiAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbSAhPT0gbnVsbCk7XG5cbiAgICAgIGlmICghaXRlbXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBqc29uKHsgZXJyb3I6IFwiTm8gZG93bmxvYWRhYmxlIHBsYXlsaXN0IGl0ZW1zIHdlcmUgZm91bmRcIiB9LCA0MDQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ganNvbih7XG4gICAgICAgIHBsYXRmb3JtOiBcInlvdXR1YmVcIixcbiAgICAgICAgc291cmNlVHlwZTogXCJwbGF5bGlzdFwiLFxuICAgICAgICB0aXRsZTogcGxheWxpc3QudGl0bGUgPz8gXCJZb3VUdWJlIHBsYXlsaXN0XCIsXG4gICAgICAgIGNhcHRpb246IHBsYXlsaXN0LmRlc2NyaXB0aW9uID8/IG51bGwsXG4gICAgICAgIHVzZXJuYW1lOiBwbGF5bGlzdC5hdXRob3JJZCA/PyBudWxsLFxuICAgICAgICBhdXRob3JOYW1lOiBwbGF5bGlzdC5hdXRob3IgPz8gbnVsbCxcbiAgICAgICAgcHJvZmlsZVBpYzogbnVsbCxcbiAgICAgICAgY292ZXI6IGl0ZW1zWzBdPy50aHVtYm5haWwgPz8gbnVsbCxcbiAgICAgICAgaXRlbXMsXG4gICAgICAgIHJlc29sdmVkVXJsOiBmaW5hbFVybCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHZpZGVvSWQgPSBleHRyYWN0VmlkZW9JZChmaW5hbFVybCk7XG4gICAgaWYgKCF2aWRlb0lkKSB7XG4gICAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIlBsZWFzZSBlbnRlciBhIHZhbGlkIFlvdVR1YmUgdmlkZW8sIFNob3J0cywgb3IgbXVzaWMgVVJMXCIgfSwgNDAwKTtcbiAgICB9XG5cbiAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgZmV0Y2hGcm9tSW5uZXJ0dWJlKHZpZGVvSWQpO1xuICAgIGNvbnN0IHZpZGVvID0gdG9Zb3VUdWJlVmlkZW8ocGF5bG9hZCk7XG4gICAgY29uc3QgaXRlbSA9IG1ha2VWaWRlb0l0ZW0odmlkZW9JZCwgdmlkZW8sIHJlcXVlc3RlZE1vZGUpO1xuICAgIGlmICghaXRlbS5kb3dubG9hZHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4ganNvbih7IGVycm9yOiBcIk5vIGRvd25sb2FkYWJsZSBzdHJlYW1zIHdlcmUgZm91bmQgZm9yIHRoYXQgdmlkZW9cIiB9LCA0MDQpO1xuICAgIH1cblxuICAgIHJldHVybiBqc29uKHtcbiAgICAgIHBsYXRmb3JtOiBcInlvdXR1YmVcIixcbiAgICAgIHNvdXJjZVR5cGU6IHJlcXVlc3RlZE1vZGUsXG4gICAgICB0aXRsZTogdmlkZW8udGl0bGUgPz8gXCJZb3VUdWJlIHZpZGVvXCIsXG4gICAgICBjYXB0aW9uOiB2aWRlby5kZXNjcmlwdGlvbiA/PyBudWxsLFxuICAgICAgdXNlcm5hbWU6IHZpZGVvLmF1dGhvcklkID8/IG51bGwsXG4gICAgICBhdXRob3JOYW1lOiB2aWRlby5hdXRob3IgPz8gbnVsbCxcbiAgICAgIHByb2ZpbGVQaWM6IG51bGwsXG4gICAgICBjb3ZlcjogaXRlbS50aHVtYm5haWwsXG4gICAgICBpdGVtczogW2l0ZW1dLFxuICAgICAgcmVzb2x2ZWRVcmw6IGZpbmFsVXJsLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFwiVW5rbm93biBlcnJvclwiO1xuICAgIHJldHVybiBqc29uKHsgZXJyb3I6IG1lc3NhZ2UgfSwgNTAwKTtcbiAgfVxufTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcSmlud2lpbCBPbmdpbmpvXFxcXERlc2t0b3BcXFxcc2F2ZXRvay1leHByZXNzLW1haW5cXFxcZGV2XFxcXGZ1bmN0aW9uc1xcXFx0aW55dXJsLXRvb2xzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9KaW53aWlsJTIwT25naW5qby9EZXNrdG9wL3NhdmV0b2stZXhwcmVzcy1tYWluL2Rldi9mdW5jdGlvbnMvdGlueXVybC10b29scy50c1wiO2ltcG9ydCB7IGNvcnNIZWFkZXJzLCBqc29uLCByZXNvbHZlU2hvcnRVcmwsIFVTRVJfQUdFTlQsIGZldGNoV2l0aFJldHJ5IH0gZnJvbSBcIi4uLy4uL3N1cGFiYXNlL2Z1bmN0aW9ucy9fc2hhcmVkL2h0dHAudHNcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVUaW55VXJsID0gYXN5bmMgKHJlcTogUmVxdWVzdCkgPT4ge1xyXG4gIGlmIChyZXEubWV0aG9kID09PSBcIk9QVElPTlNcIikge1xyXG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShcIm9rXCIsIHsgaGVhZGVyczogY29yc0hlYWRlcnMgfSk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcS5qc29uKCk7XHJcbiAgICBjb25zdCB7IGFjdGlvbiwgdXJsLCBwcm92aWRlciB9ID0gYm9keSA/PyB7fTtcclxuICAgIGlmICghdXJsIHx8IHR5cGVvZiB1cmwgIT09IFwic3RyaW5nXCIpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiTWlzc2luZyBVUkxcIiB9LCA0MDApO1xyXG4gICAgaWYgKCFhY3Rpb24gfHwgKGFjdGlvbiAhPT0gXCJyZXNvbHZlXCIgJiYgYWN0aW9uICE9PSBcInNob3J0ZW5cIikpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiVW5zdXBwb3J0ZWQgYWN0aW9uXCIgfSwgNDAwKTtcclxuXHJcbiAgICBpZiAoYWN0aW9uID09PSBcInJlc29sdmVcIikge1xyXG4gICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVTaG9ydFVybCh1cmwpO1xyXG4gICAgICByZXR1cm4ganNvbih7IGlucHV0VXJsOiB1cmwsIHJlc29sdmVkVXJsOiByZXNvbHZlZC51cmwsIGhvcHM6IHJlc29sdmVkLmhvcHMgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2VsZWN0ZWQgPSAocHJvdmlkZXIgJiYgU3RyaW5nKHByb3ZpZGVyKS50b0xvd2VyQ2FzZSgpKSB8fCBcInRpbnl1cmxcIjtcclxuXHJcbiAgICBpZiAoc2VsZWN0ZWQgPT09IFwiaXMuZ2RcIikge1xyXG4gICAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoYGh0dHBzOi8vaXMuZ2QvY3JlYXRlLnBocD9mb3JtYXQ9anNvbiZ1cmw9JHtlbmNvZGVVUklDb21wb25lbnQodXJsKX1gLCB7XHJcbiAgICAgICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogVVNFUl9BR0VOVCB9LFxyXG4gICAgICB9KTtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3AuanNvbigpO1xyXG4gICAgICBpZiAoIXJlc3Aub2sgfHwgIWRhdGE/LnNob3J0dXJsKSByZXR1cm4ganNvbih7IGVycm9yOiBkYXRhPy5lcnJvcm1lc3NhZ2UgPz8gXCJpcy5nZCBmYWlsZWRcIiB9LCA0MDApO1xyXG4gICAgICByZXR1cm4ganNvbih7IGlucHV0VXJsOiB1cmwsIHNob3J0VXJsOiBkYXRhLnNob3J0dXJsLCBwcm92aWRlcjogXCJpcy5nZFwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChzZWxlY3RlZCA9PT0gXCJ2LmdkXCIpIHtcclxuICAgICAgY29uc3QgcmVzcCA9IGF3YWl0IGZldGNoV2l0aFJldHJ5KGBodHRwczovL3YuZ2QvY3JlYXRlLnBocD9mb3JtYXQ9anNvbiZ1cmw9JHtlbmNvZGVVUklDb21wb25lbnQodXJsKX1gLCB7XHJcbiAgICAgICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogVVNFUl9BR0VOVCB9LFxyXG4gICAgICB9KTtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3AuanNvbigpO1xyXG4gICAgICBpZiAoIXJlc3Aub2sgfHwgIWRhdGE/LnNob3J0dXJsKSByZXR1cm4ganNvbih7IGVycm9yOiBkYXRhPy5lcnJvcm1lc3NhZ2UgPz8gXCJ2LmdkIGZhaWxlZFwiIH0sIDQwMCk7XHJcbiAgICAgIHJldHVybiBqc29uKHsgaW5wdXRVcmw6IHVybCwgc2hvcnRVcmw6IGRhdGEuc2hvcnR1cmwsIHByb3ZpZGVyOiBcInYuZ2RcIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc2VsZWN0ZWQgPT09IFwiZGEuZ2RcIikge1xyXG4gICAgICBjb25zdCByZXNwID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoYGh0dHBzOi8vZGEuZ2Qvcz91cmw9JHtlbmNvZGVVUklDb21wb25lbnQodXJsKX1gLCB7XHJcbiAgICAgICAgaGVhZGVyczogeyBcIlVzZXItQWdlbnRcIjogVVNFUl9BR0VOVCB9LFxyXG4gICAgICB9KTtcclxuICAgICAgY29uc3QgdGV4dCA9IChhd2FpdCByZXNwLnRleHQoKSkudHJpbSgpO1xyXG4gICAgICBpZiAoIXJlc3Aub2sgfHwgIS9eaHR0cHM/OlxcL1xcLy9pLnRlc3QodGV4dCkpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiZGEuZ2QgZmFpbGVkXCIgfSwgNDAwKTtcclxuICAgICAgcmV0dXJuIGpzb24oeyBpbnB1dFVybDogdXJsLCBzaG9ydFVybDogdGV4dCwgcHJvdmlkZXI6IFwiZGEuZ2RcIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc2VsZWN0ZWQgPT09IFwiYml0bHlcIikge1xyXG4gICAgICBjb25zdCBiaXRseVRva2VuID0gRGVubz8uZW52Py5nZXQgPyBEZW5vLmVudi5nZXQoXCJCSVRMWV9UT0tFTlwiKSA6IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKCFiaXRseVRva2VuKSByZXR1cm4ganNvbih7IGVycm9yOiBcIkJpdGx5IG5vdCBjb25maWd1cmVkIG9uIHNlcnZlclwiIH0sIDQwMCk7XHJcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBmZXRjaFdpdGhSZXRyeShcImh0dHBzOi8vYXBpLXNzbC5iaXRseS5jb20vdjQvc2hvcnRlblwiLCB7XHJcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7Yml0bHlUb2tlbn1gLFxyXG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXHJcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogVVNFUl9BR0VOVCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbG9uZ191cmw6IHVybCB9KSxcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwLmpzb24oKTtcclxuICAgICAgaWYgKCFyZXNwLm9rIHx8ICFwYXlsb2FkPy5saW5rKSByZXR1cm4ganNvbih7IGVycm9yOiBwYXlsb2FkPy5tZXNzYWdlID8/IFwiQml0bHkgZmFpbGVkXCIgfSwgNDAwKTtcclxuICAgICAgcmV0dXJuIGpzb24oeyBpbnB1dFVybDogdXJsLCBzaG9ydFVybDogcGF5bG9hZC5saW5rLCBwcm92aWRlcjogXCJiaXRseVwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG9mZmljaWFsVG9rZW4gPSAodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2Vzcy5lbnYgJiYgcHJvY2Vzcy5lbnYuVElOWVVSTF9BUElfVE9LRU4pIHx8IHVuZGVmaW5lZDtcclxuICAgIGlmIChvZmZpY2lhbFRva2VuKSB7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoXCJodHRwczovL2FwaS50aW55dXJsLmNvbS9jcmVhdGVcIiwge1xyXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke29mZmljaWFsVG9rZW59YCxcclxuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxyXG4gICAgICAgICAgXCJVc2VyLUFnZW50XCI6IFVTRVJfQUdFTlQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHVybCB9KSxcclxuICAgICAgfSk7XHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2sgfHwgIXBheWxvYWQ/LmRhdGE/LnRpbnlfdXJsKSByZXR1cm4ganNvbih7IGVycm9yOiBwYXlsb2FkPy5lcnJvcnM/LlswXSA/PyBwYXlsb2FkPy5tZXNzYWdlID8/IFwiVGlueVVSTCBBUEkgZmFpbGVkXCIgfSwgNDAwKTtcclxuICAgICAgcmV0dXJuIGpzb24oeyBpbnB1dFVybDogdXJsLCBzaG9ydFVybDogcGF5bG9hZC5kYXRhLnRpbnlfdXJsLCBwcm92aWRlcjogXCJ0aW55dXJsLWFwaVwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxlZ2FjeVJlc3BvbnNlID0gYXdhaXQgZmV0Y2hXaXRoUmV0cnkoYGh0dHBzOi8vdGlueXVybC5jb20vYXBpLWNyZWF0ZS5waHA/dXJsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHVybCl9YCwge1xyXG4gICAgICBoZWFkZXJzOiB7IFwiVXNlci1BZ2VudFwiOiBVU0VSX0FHRU5UIH0sXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IHNob3J0VXJsID0gKGF3YWl0IGxlZ2FjeVJlc3BvbnNlLnRleHQoKSkudHJpbSgpO1xyXG4gICAgaWYgKCFsZWdhY3lSZXNwb25zZS5vayB8fCAhL15odHRwcz86XFwvXFwvKD86d3d3XFwuKT90aW55dXJsXFwuY29tXFwvL2kudGVzdChzaG9ydFVybCkpIHJldHVybiBqc29uKHsgZXJyb3I6IFwiVGlueVVSTCBjb3VsZCBub3Qgc2hvcnRlbiB0aGF0IFVSTFwiIH0sIDQwMCk7XHJcbiAgICByZXR1cm4ganNvbih7IGlucHV0VXJsOiB1cmwsIHNob3J0VXJsLCBwcm92aWRlcjogXCJ0aW55dXJsLWxlZ2FjeVwiIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBcIlVua25vd24gZXJyb3JcIjtcclxuICAgIHJldHVybiBqc29uKHsgZXJyb3I6IG1lc3NhZ2UgfSwgNTAwKTtcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBoYW5kbGVUaW55VXJsO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZWLFNBQVMsY0FBYyxlQUFlO0FBQ25ZLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyx1QkFBdUI7OztBQ0o2WSxJQUFNLGNBQWM7QUFBQSxFQUMvYiwrQkFBK0I7QUFBQSxFQUMvQixnQ0FBZ0M7QUFBQSxFQUNoQyxpQ0FBaUM7QUFDbkM7QUFFTyxJQUFNLGFBQ1g7QUFFSyxJQUFNLE9BQU8sQ0FBQyxNQUFlLFNBQVMsUUFDM0MsSUFBSSxTQUFTLEtBQUssVUFBVSxJQUFJLEdBQUc7QUFBQSxFQUNqQztBQUFBLEVBQ0EsU0FBUyxFQUFFLEdBQUcsYUFBYSxnQkFBZ0IsbUJBQW1CO0FBQ2hFLENBQUM7QUFFSSxJQUFNLG1CQUFtQixDQUFDLE9BQWUsV0FBVyxlQUN6RCxNQUFNLFFBQVEsbUJBQW1CLEdBQUcsRUFBRSxRQUFRLE9BQU8sR0FBRyxFQUFFLFFBQVEsVUFBVSxFQUFFLEtBQUs7QUFFOUUsSUFBTSxnQkFBZ0IsQ0FBQyxVQUFrQixpQkFBb0M7QUFDbEYsUUFBTSxPQUFPLFNBQVMsWUFBWTtBQUNsQyxTQUFPLGFBQWEsS0FBSyxDQUFDLFlBQVksU0FBUyxXQUFXLEtBQUssU0FBUyxJQUFJLE9BQU8sRUFBRSxDQUFDO0FBQ3hGO0FBRU8sSUFBTSxhQUFhLENBQUMsVUFDekIsTUFDRyxRQUFRLFVBQVUsR0FBRyxFQUNyQixRQUFRLFdBQVcsR0FBRyxFQUN0QixRQUFRLFVBQVUsR0FBRyxFQUNyQixRQUFRLFlBQVksR0FBRyxFQUN2QixRQUFRLFNBQVMsR0FBRyxFQUNwQixRQUFRLFNBQVMsR0FBRztBQUVsQixJQUFNLE9BQU8sQ0FBSSxVQUFlLE1BQU0sS0FBSyxJQUFJLElBQUksS0FBSyxDQUFDO0FBRXpELElBQU0sY0FBYyxDQUFDLE1BQWMsYUFBcUI7QUFDN0QsUUFBTSxRQUFRLEtBQUs7QUFBQSxJQUNqQixJQUFJLE9BQU8sbUNBQW1DLFFBQVEscUNBQXFDLEdBQUc7QUFBQSxFQUNoRztBQUNBLFNBQU8sUUFBUSxXQUFXLE1BQU0sQ0FBQyxDQUFDLElBQUk7QUFDeEM7QUFFQSxJQUFNLG1CQUFtQixDQUFDLFdBQW1CLENBQUMsS0FBSyxLQUFLLEtBQUssS0FBSyxHQUFHLEVBQUUsU0FBUyxNQUFNO0FBQ3RGLElBQU0scUJBQXFCLG9CQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxHQUFHLENBQUM7QUFDdEUsSUFBTSxRQUFRLENBQUMsT0FBZSxJQUFJLFFBQVEsQ0FBQyxZQUFZLFdBQVcsU0FBUyxFQUFFLENBQUM7QUFFOUUsZUFBc0IsZUFDcEIsT0FDQSxNQUNBLFNBS0E7QUFDQSxRQUFNLFdBQVcsS0FBSyxJQUFJLEdBQUcsU0FBUyxZQUFZLENBQUM7QUFDbkQsUUFBTSxZQUFZLEtBQUssSUFBSSxHQUFHLFNBQVMsYUFBYSxHQUFHO0FBQ3ZELFFBQU0sb0JBQW9CLElBQUksSUFBSSxTQUFTLHFCQUFxQixDQUFDLEdBQUcsa0JBQWtCLENBQUM7QUFDdkYsTUFBSSxZQUEwQjtBQUU5QixXQUFTLFVBQVUsR0FBRyxVQUFVLFVBQVUsV0FBVyxHQUFHO0FBQ3RELFFBQUk7QUFDRixZQUFNLFdBQVcsTUFBTSxNQUFNLE9BQU8sSUFBSTtBQUN4QyxVQUFJLENBQUMsa0JBQWtCLElBQUksU0FBUyxNQUFNLEtBQUssWUFBWSxXQUFXLEdBQUc7QUFDdkUsZUFBTztBQUFBLE1BQ1Q7QUFDQSxZQUFNLFNBQVMsTUFBTSxPQUFPLEVBQUUsTUFBTSxNQUFNLE1BQVM7QUFBQSxJQUNyRCxTQUFTLE9BQU87QUFDZCxrQkFBWSxpQkFBaUIsUUFBUSxRQUFRLElBQUksTUFBTSx3QkFBd0I7QUFDL0UsVUFBSSxZQUFZLFdBQVcsRUFBRztBQUFBLElBQ2hDO0FBRUEsVUFBTSxNQUFNLGFBQWEsVUFBVSxFQUFFO0FBQUEsRUFDdkM7QUFFQSxRQUFNLGFBQWEsSUFBSSxNQUFNLDhCQUE4QjtBQUM3RDtBQUVBLGVBQXNCLGdCQUFnQixPQUFlLFVBQVUsR0FBRztBQUNoRSxNQUFJLFVBQVU7QUFDZCxRQUFNLE9BQWlCLENBQUM7QUFFeEIsV0FBUyxRQUFRLEdBQUcsUUFBUSxTQUFTLFNBQVMsR0FBRztBQUMvQyxRQUFJO0FBQ0osUUFBSTtBQUNGLGVBQVMsSUFBSSxJQUFJLE9BQU87QUFBQSxJQUMxQixRQUFRO0FBQ047QUFBQSxJQUNGO0FBR0EsVUFBTSx3QkFBd0I7QUFBQSxNQUM1QjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUNBLFFBQUksQ0FBQyxjQUFjLE9BQU8sVUFBVSxxQkFBcUIsRUFBRztBQUU1RCxVQUFNLFdBQVcsTUFBTSxNQUFNLFNBQVM7QUFBQSxNQUNwQyxRQUFRO0FBQUEsTUFDUixVQUFVO0FBQUEsTUFDVixTQUFTO0FBQUEsUUFDUCxjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGLENBQUM7QUFFRCxRQUFJLENBQUMsaUJBQWlCLFNBQVMsTUFBTSxFQUFHO0FBQ3hDLFVBQU0sV0FBVyxTQUFTLFFBQVEsSUFBSSxVQUFVO0FBQ2hELFFBQUksQ0FBQyxTQUFVO0FBQ2YsY0FBVSxJQUFJLElBQUksVUFBVSxPQUFPLEVBQUUsU0FBUztBQUM5QyxTQUFLLEtBQUssT0FBTztBQUFBLEVBQ25CO0FBRUEsU0FBTyxFQUFFLEtBQUssU0FBUyxLQUFLO0FBQzlCO0FBRUEsZUFBc0Isc0JBQ3BCLFNBQ0EsVUFDQSxjQUNBLFNBTUE7QUFDQSxNQUFJO0FBQ0osTUFBSTtBQUNGLGFBQVMsSUFBSSxJQUFJLE9BQU87QUFBQSxFQUMxQixRQUFRO0FBQ04sV0FBTyxLQUFLLEVBQUUsT0FBTyw4QkFBOEIsR0FBRyxHQUFHO0FBQUEsRUFDM0Q7QUFFQSxNQUFJLENBQUMsY0FBYyxPQUFPLFVBQVUsWUFBWSxHQUFHO0FBQ2pELFdBQU8sS0FBSyxFQUFFLE9BQU8sbUJBQW1CLEdBQUcsR0FBRztBQUFBLEVBQ2hEO0FBRUEsUUFBTSxXQUFXLE1BQU0sZUFBZSxTQUFTO0FBQUEsSUFDN0MsVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLE1BQ1AsY0FBYyxTQUFTLGFBQWE7QUFBQSxNQUNwQyxRQUFRO0FBQUEsTUFDUixtQkFBbUI7QUFBQSxNQUNuQixHQUFJLFNBQVMsVUFBVSxFQUFFLFNBQVMsUUFBUSxRQUFRLElBQUksQ0FBQztBQUFBLE1BQ3ZELEdBQUksU0FBUyxvQkFBb0IsRUFBRSxPQUFPLFdBQVcsSUFBSSxDQUFDO0FBQUEsSUFDNUQ7QUFBQSxFQUNGLEdBQUc7QUFBQSxJQUNELFVBQVU7QUFBQSxJQUNWLFdBQVc7QUFBQSxFQUNiLENBQUM7QUFFRCxNQUFJLENBQUMsU0FBUyxNQUFNLENBQUMsU0FBUyxNQUFNO0FBQ2xDLFdBQU8sS0FBSyxFQUFFLE9BQU8sbUJBQW1CLFNBQVMsTUFBTSxHQUFHLEdBQUcsR0FBRztBQUFBLEVBQ2xFO0FBRUEsUUFBTSxjQUFjLFNBQVMsUUFBUSxJQUFJLGNBQWMsS0FBSyxTQUFTLHNCQUFzQjtBQUMzRixRQUFNLGdCQUFnQixTQUFTLFFBQVEsSUFBSSxnQkFBZ0I7QUFDM0QsUUFBTSxVQUFrQztBQUFBLElBQ3RDLEdBQUc7QUFBQSxJQUNILGdCQUFnQjtBQUFBLElBQ2hCLHVCQUF1Qix5QkFBeUIsaUJBQWlCLFFBQVEsQ0FBQztBQUFBLElBQzFFLGlCQUFpQjtBQUFBLEVBQ25CO0FBQ0EsTUFBSSxjQUFlLFNBQVEsZ0JBQWdCLElBQUk7QUFFL0MsU0FBTyxJQUFJLFNBQVMsU0FBUyxNQUFNLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUM3RDs7O0FDOUwrWDtBQUFBLEVBQzdYO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsT0FDSztBQWVQLElBQU0saUJBQWlCLENBQUMsU0FBa0IsWUFBWSxnQkFBNkI7QUFBQSxFQUNqRixjQUFjO0FBQUEsRUFDZCxRQUFRO0FBQUEsRUFDUixtQkFBbUI7QUFBQSxFQUNuQixHQUFJLFVBQVUsRUFBRSxTQUFTLFFBQVEsSUFBSSxDQUFDO0FBQ3hDO0FBRUEsSUFBTSxrQkFBa0IsQ0FBQyxTQUFpQixTQUFrQixjQUMxRCxJQUFJLFVBQVUsU0FBUztBQUFBLEVBQ3JCLGFBQWE7QUFBQSxJQUNYLFNBQVMsZUFBZSxTQUFTLFNBQVM7QUFBQSxFQUM1QztBQUFBLEVBQ0EsU0FBUyxDQUFDLEtBQUssZ0JBQWdCO0FBQzdCLFVBQU0sVUFBVSxJQUFJLFFBQVEsYUFBYSxPQUFPO0FBQ2hELFVBQU0sY0FBYyxJQUFJLFFBQVEsZUFBZSxTQUFTLFNBQVMsQ0FBQztBQUNsRSxnQkFBWSxRQUFRLENBQUMsT0FBTyxRQUFRO0FBQ2xDLFVBQUksQ0FBQyxRQUFRLElBQUksR0FBRyxFQUFHLFNBQVEsSUFBSSxLQUFLLEtBQUs7QUFBQSxJQUMvQyxDQUFDO0FBQ0QsV0FBTyxNQUFNLEtBQUs7QUFBQSxNQUNoQixHQUFHO0FBQUEsTUFDSDtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLGNBQWMsS0FBSyxPQUFPO0FBQUEsRUFDMUIsYUFBYTtBQUFBLEVBQ2IsZUFBZSxDQUFDLHFCQUE4QixvQkFBb0IsSUFBSSxPQUFPLFFBQVEsbUJBQW1CO0FBQzFHLENBQUM7QUFFSCxJQUFNLGtCQUFrQixDQUFDLE9BQXNCLGlCQUFvQztBQUNqRixNQUFJLENBQUMsTUFBTyxPQUFNLElBQUksTUFBTSxrQkFBa0I7QUFFOUMsTUFBSTtBQUNKLE1BQUk7QUFDRixhQUFTLElBQUksSUFBSSxLQUFLO0FBQUEsRUFDeEIsUUFBUTtBQUNOLFVBQU0sSUFBSSxNQUFNLDZCQUE2QjtBQUFBLEVBQy9DO0FBRUEsTUFBSSxDQUFDLGNBQWMsT0FBTyxVQUFVLFlBQVksR0FBRztBQUNqRCxVQUFNLElBQUksTUFBTSxrQkFBa0I7QUFBQSxFQUNwQztBQUVBLFNBQU8sT0FBTyxTQUFTO0FBQ3pCO0FBRUEsSUFBTSxrQkFBa0IsQ0FBQyxVQUFtQjtBQUMxQyxRQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQ3pELFFBQU0sU0FDSixZQUFZLHNCQUNULFFBQVEsV0FBVyxTQUFTLEtBQzVCLFFBQVEsV0FBVyxhQUFhLEtBQ2hDLFFBQVEsV0FBVyxnQkFBZ0IsSUFDbEMsTUFDQTtBQUVOLFNBQU8sS0FBSyxFQUFFLE9BQU8sUUFBUSxHQUFHLE1BQU07QUFDeEM7QUFFQSxJQUFNLG9CQUFvQixDQUFDLFVBQWtCLFVBQWtCLFNBQWtCLGNBQXVCO0FBQ3RHLFFBQU0sYUFBYSxJQUFJLE1BQU07QUFBQSxJQUMzQixTQUFTLENBQUMsS0FBSyxJQUFJO0FBQUEsSUFDbkIsUUFBUSxnQkFBZ0IsVUFBVSxTQUFTLFNBQVM7QUFBQSxFQUN0RCxDQUFDO0FBQ0QsUUFBTSxhQUFhLElBQUksTUFBTTtBQUFBLElBQzNCLFNBQVMsQ0FBQyxLQUFLLElBQUk7QUFBQSxJQUNuQixRQUFRLGdCQUFnQixVQUFVLFNBQVMsU0FBUztBQUFBLEVBQ3RELENBQUM7QUFFRCxTQUFPLEVBQUUsWUFBWSxXQUFXO0FBQ2xDO0FBRUEsZUFBZSxZQUFZLFVBQWtCLFVBQWtCLFNBQWtCLFdBQW9CO0FBQ25HLFFBQU0sRUFBRSxZQUFZLFdBQVcsSUFBSSxrQkFBa0IsVUFBVSxVQUFVLFNBQVMsU0FBUztBQUUzRixNQUFJO0FBQ0YsVUFBTSxDQUFDLFlBQVksVUFBVSxJQUFJLE1BQU0sUUFBUSxJQUFJO0FBQUEsTUFDakQsV0FBVyxxQkFBcUI7QUFBQSxNQUNoQyxXQUFXLHFCQUFxQjtBQUFBLElBQ2xDLENBQUM7QUFFRCxRQUFJLENBQUMsY0FBYyxDQUFDLFlBQVk7QUFDOUIsWUFBTSxJQUFJLE1BQU0sNERBQTREO0FBQUEsSUFDOUU7QUFFQSxRQUFJLENBQUMsV0FBVyxTQUFTLENBQUMsV0FBVyxPQUFPO0FBQzFDLFlBQU0sSUFBSSxNQUFNLHVDQUF1QztBQUFBLElBQ3pEO0FBRUEsVUFBTSxDQUFDLGFBQWEsV0FBVyxJQUFJLE1BQU0sUUFBUSxJQUFJO0FBQUEsTUFDbkQsV0FBVyxpQkFBaUI7QUFBQSxNQUM1QixXQUFXLGlCQUFpQjtBQUFBLElBQzlCLENBQUM7QUFFRCxRQUFJLENBQUMsZUFBZSxDQUFDLGFBQWE7QUFDaEMsWUFBTSxJQUFJLE1BQU0sNkNBQTZDO0FBQUEsSUFDL0Q7QUFFQSxXQUFPLEVBQUUsWUFBWSxZQUFZLGFBQWEsYUFBYSxZQUFZLFdBQVc7QUFBQSxFQUNwRixTQUFTLE9BQU87QUFDZCxlQUFXLFFBQVE7QUFDbkIsZUFBVyxRQUFRO0FBQ25CLFVBQU07QUFBQSxFQUNSO0FBQ0Y7QUFFQSxJQUFNLG1CQUFtQixPQUN2QixPQUNBLFFBQ0Esa0JBQ0c7QUFDSCxRQUFNLE9BQU8sSUFBSSxrQkFBa0IsS0FBSztBQUN4QyxNQUFJLFFBQVE7QUFFWixtQkFBaUIsVUFBVSxLQUFLLFFBQVEsR0FBRztBQUN6QyxRQUFJLE9BQU87QUFDVCxZQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUUsY0FBYyxDQUFDO0FBQzFDLGNBQVE7QUFBQSxJQUNWLE9BQU87QUFDTCxZQUFNLE9BQU8sSUFBSSxNQUFNO0FBQUEsSUFDekI7QUFBQSxFQUNGO0FBRUEsTUFBSSxPQUFPO0FBQ1QsVUFBTSxJQUFJLE1BQU0sNEJBQTRCO0FBQUEsRUFDOUM7QUFDRjtBQUVBLElBQU0sbUJBQW1CLE9BQ3ZCLE9BQ0EsUUFDQSxrQkFDRztBQUNILFFBQU0sT0FBTyxJQUFJLGtCQUFrQixLQUFLO0FBQ3hDLE1BQUksUUFBUTtBQUVaLG1CQUFpQixVQUFVLEtBQUssUUFBUSxHQUFHO0FBQ3pDLFFBQUksT0FBTztBQUNULFlBQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxjQUFjLENBQUM7QUFDMUMsY0FBUTtBQUFBLElBQ1YsT0FBTztBQUNMLFlBQU0sT0FBTyxJQUFJLE1BQU07QUFBQSxJQUN6QjtBQUFBLEVBQ0Y7QUFFQSxNQUFJLE9BQU87QUFDVCxVQUFNLElBQUksTUFBTSw0QkFBNEI7QUFBQSxFQUM5QztBQUNGO0FBRUEsZUFBc0Isd0JBQ3BCLFVBQ0EsVUFDQSxjQUNBLFNBQ0E7QUFDQSxRQUFNLGVBQWUsZ0JBQWdCLFVBQVUsWUFBWTtBQUMzRCxRQUFNLGVBQWUsZ0JBQWdCLFVBQVUsWUFBWTtBQUMzRCxRQUFNLEVBQUUsWUFBWSxXQUFXLElBQUksTUFBTSxZQUFZLGNBQWMsY0FBYyxTQUFTLFNBQVMsU0FBUyxTQUFTO0FBQ3JILGFBQVcsUUFBUTtBQUNuQixhQUFXLFFBQVE7QUFDckI7QUFFQSxlQUFzQixpQkFDcEIsVUFDQSxVQUNBLFVBQ0EsY0FDQSxTQUNBO0FBQ0EsTUFBSTtBQUNGLFVBQU0sZUFBZSxnQkFBZ0IsVUFBVSxZQUFZO0FBQzNELFVBQU0sZUFBZSxnQkFBZ0IsVUFBVSxZQUFZO0FBRTNELFVBQU07QUFBQSxNQUNKO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGLElBQUksTUFBTSxZQUFZLGNBQWMsY0FBYyxTQUFTLFNBQVMsU0FBUyxTQUFTO0FBRXRGLFVBQU0sY0FBYyxJQUFJLHlCQUF5QixXQUFXLEtBQUs7QUFDakUsVUFBTSxjQUFjLElBQUkseUJBQXlCLFdBQVcsS0FBSztBQUNqRSxVQUFNLFNBQVMsSUFBSSxnQkFBd0M7QUFDM0QsVUFBTSxTQUFTLElBQUksT0FBTztBQUFBLE1BQ3hCLFFBQVEsSUFBSSxnQkFBZ0I7QUFBQSxNQUM1QixRQUFRLElBQUksYUFBYSxPQUFPLFVBQVU7QUFBQSxRQUN4QyxTQUFTO0FBQUEsUUFDVCxXQUFXLE9BQU87QUFBQSxNQUNwQixDQUFDO0FBQUEsSUFDSCxDQUFDO0FBRUQsV0FBTyxjQUFjLFdBQVc7QUFDaEMsV0FBTyxjQUFjLFdBQVc7QUFFaEMsVUFBTSxRQUFRLFlBQVk7QUFDeEIsVUFBSTtBQUNGLGNBQU0sT0FBTyxNQUFNO0FBQ25CLGNBQU0sUUFBUSxJQUFJO0FBQUEsVUFDaEIsaUJBQWlCLFlBQVksYUFBYSxXQUFXO0FBQUEsVUFDckQsaUJBQWlCLFlBQVksYUFBYSxXQUFXO0FBQUEsUUFDdkQsQ0FBQztBQUNELGNBQU0sT0FBTyxTQUFTO0FBQUEsTUFDeEIsU0FBUyxPQUFPO0FBQ2QsY0FBTSxPQUFPLE9BQU8sRUFBRSxNQUFNLE1BQU0sTUFBUztBQUMzQyxjQUFNLE9BQU8sU0FBUyxNQUFNLEtBQUssRUFBRSxNQUFNLE1BQU0sTUFBUztBQUFBLE1BQzFELFVBQUU7QUFDQSxtQkFBVyxRQUFRO0FBQ25CLG1CQUFXLFFBQVE7QUFBQSxNQUNyQjtBQUFBLElBQ0YsR0FBRztBQUlILFdBQU8sSUFBSSxTQUFTLE9BQU8sVUFBVTtBQUFBLE1BQ25DLFFBQVE7QUFBQSxNQUNSLFNBQVM7QUFBQSxRQUNQLEdBQUc7QUFBQSxRQUNILGdCQUFnQjtBQUFBLFFBQ2hCLHVCQUF1Qix5QkFBeUIsaUJBQWlCLFVBQVUsU0FBUyxtQkFBbUIsY0FBYyxDQUFDO0FBQUEsUUFDdEgsaUJBQWlCO0FBQUEsTUFDbkI7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNILFNBQVMsT0FBTztBQUNkLFdBQU8sZ0JBQWdCLEtBQUs7QUFBQSxFQUM5QjtBQUNGOzs7QUMvT0EsSUFBTSx5QkFBeUI7QUFBQSxFQUM3QjtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFDRjtBQUVBLElBQU0sa0JBQWtCO0FBRXhCLElBQU0sZ0JBQWdCLENBQUMsVUFDckIsTUFBTSxRQUFRLFlBQVksR0FBRyxFQUFFLFFBQVEsWUFBWSxHQUFHLEVBQUUsUUFBUSxZQUFZLEdBQUcsRUFBRSxRQUFRLFNBQVMsR0FBRztBQUV2RyxJQUFNLGlCQUFpQixDQUFDLE1BQWMsWUFBb0I7QUFDeEQsUUFBTSxRQUFrQixDQUFDO0FBQ3pCLE1BQUk7QUFDSixTQUFRLFFBQVEsUUFBUSxLQUFLLElBQUksR0FBSTtBQUNuQyxVQUFNLFFBQVEsY0FBYyxNQUFNLENBQUMsQ0FBQztBQUNwQyxRQUFJLE1BQU0sV0FBVyxNQUFNLEVBQUcsT0FBTSxLQUFLLEtBQUs7QUFBQSxFQUNoRDtBQUNBLFNBQU8sS0FBSyxLQUFLO0FBQ25CO0FBRUEsSUFBTSxzQkFBc0IsQ0FBQyxNQUFjLGNBQWlDO0FBQzFFLFFBQU0sVUFBVSxjQUFjLElBQUk7QUFDbEMsUUFBTSxXQUFXLFFBQVEsTUFBTSxJQUFJLE9BQU8sZ0NBQWdDLFNBQVMsdUNBQXVDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDckksU0FBTyxLQUFLLFNBQVMsUUFBUSxDQUFDLFlBQVksZUFBZSxTQUFTLHNDQUFzQyxDQUFDLENBQUM7QUFDNUc7QUFFQSxJQUFNLGNBQWMsQ0FBQyxVQUFrQjtBQUNyQyxNQUFJO0FBQ0YsVUFBTSxNQUFNLElBQUksSUFBSSxLQUFLO0FBQ3pCLFFBQUksSUFBSSxhQUFhLFdBQVksUUFBTztBQUN4QyxRQUFJLFdBQVc7QUFDZixXQUFPLElBQUksU0FBUztBQUFBLEVBQ3RCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsSUFBTSx1QkFBdUIsQ0FBQyxVQUFrQjtBQUM5QyxNQUFJO0FBQ0YsVUFBTSxNQUFNLElBQUksSUFBSSxLQUFLO0FBQ3pCLFFBQUksSUFBSSxhQUFhLGtCQUFrQixJQUFJLGFBQWEsb0JBQW9CLElBQUksYUFBYSx1QkFBdUI7QUFDbEgsVUFBSSxXQUFXO0FBQUEsSUFDakI7QUFDQSxXQUFPLElBQUksU0FBUztBQUFBLEVBQ3RCLFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsSUFBTSxpQkFBaUIsQ0FBQyxVQUFrQjtBQUN4QyxNQUFJO0FBQ0YsVUFBTSxNQUFNLElBQUksSUFBSSxLQUFLO0FBQ3pCLFVBQU0sVUFBVSxJQUFJLGFBQWEsSUFBSSxHQUFHO0FBQ3hDLFFBQUksUUFBUyxRQUFPO0FBRXBCLFVBQU0sWUFBWSxJQUFJLFNBQVMsTUFBTSxnQkFBZ0I7QUFDckQsUUFBSSxVQUFXLFFBQU8sVUFBVSxDQUFDO0FBRWpDLFVBQU0sY0FBYyxJQUFJLFNBQVMsTUFBTSxrQkFBa0I7QUFDekQsUUFBSSxZQUFhLFFBQU8sWUFBWSxDQUFDO0FBRXJDLFdBQU87QUFBQSxFQUNULFFBQVE7QUFDTixXQUFPO0FBQUEsRUFDVDtBQUNGO0FBRUEsSUFBTSxzQkFBc0IsQ0FBQyxVQUFrQjtBQUM3QyxRQUFNLGFBQWEscUJBQXFCLEtBQUs7QUFDN0MsUUFBTSxVQUFVLGVBQWUsVUFBVTtBQUN6QyxTQUFPLEtBQUs7QUFBQSxJQUNWO0FBQUEsSUFDQSxHQUFJLFVBQVUsQ0FBQyxxQ0FBcUMsT0FBTyxFQUFFLElBQUksQ0FBQztBQUFBLElBQ2xFLFlBQVksVUFBVTtBQUFBLEVBQ3hCLENBQUM7QUFDSDtBQUVBLElBQU0sa0JBQWtCLENBQUMsU0FDdkIsc0lBQ0csS0FBSyxJQUFJO0FBRWQsSUFBTSxnQkFBZ0IsT0FBTyxpQkFBeUI7QUFDcEQsUUFBTSxTQUFtQixDQUFDO0FBRTFCLGFBQVcsYUFBYSxvQkFBb0IsWUFBWSxHQUFHO0FBQ3pELFFBQUk7QUFDRixZQUFNLFdBQVcsTUFBTSxlQUFlLFdBQVc7QUFBQSxRQUMvQyxTQUFTO0FBQUEsVUFDUCxjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLE1BQ0YsR0FBRztBQUFBLFFBQ0QsVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLE1BQ2IsQ0FBQztBQUNELFlBQU0sT0FBTyxNQUFNLFNBQVMsS0FBSztBQUNqQyxVQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLGVBQU8sS0FBSyxHQUFHLFNBQVMsS0FBSyxTQUFTLE1BQU0sRUFBRTtBQUM5QztBQUFBLE1BQ0Y7QUFFQSxZQUFNLGNBQWMsV0FBVyxJQUFJO0FBQ25DLFVBQUksQ0FBQyxnQkFBZ0IsV0FBVyxHQUFHO0FBQ2pDLGVBQU8sS0FBSyxHQUFHLFNBQVMsb0JBQW9CO0FBQzVDO0FBQUEsTUFDRjtBQUVBLGFBQU87QUFBQSxRQUNMLE1BQU07QUFBQSxRQUNOLGFBQWEsU0FBUyxPQUFPO0FBQUEsTUFDL0I7QUFBQSxJQUNGLFNBQVMsT0FBTztBQUNkLGFBQU8sS0FBSyxHQUFHLFNBQVMsS0FBSyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsZ0JBQWdCLEVBQUU7QUFBQSxJQUMxRjtBQUFBLEVBQ0Y7QUFFQSxRQUFNLElBQUksTUFBTSxPQUFPLENBQUMsSUFBSSx1Q0FBdUMsT0FBTyxDQUFDLENBQUMsTUFBTSxvQ0FBb0M7QUFDeEg7QUFFTyxJQUFNLHlCQUF5QixPQUFPLFFBQWlCO0FBQzVELE1BQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsV0FBTyxJQUFJLFNBQVMsTUFBTSxFQUFFLFNBQVMsWUFBWSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxNQUFJO0FBQ0YsUUFBSSxJQUFJLFdBQVcsU0FBUyxJQUFJLFdBQVcsUUFBUTtBQUNqRCxZQUFNLE1BQU0sSUFBSSxJQUFJLElBQUksR0FBRztBQUMzQixZQUFNLFVBQVUsSUFBSSxhQUFhLElBQUksTUFBTTtBQUMzQyxZQUFNLFdBQVcsSUFBSSxhQUFhLElBQUksT0FBTztBQUM3QyxZQUFNLFFBQVEsSUFBSSxhQUFhLElBQUksT0FBTztBQUMxQyxZQUFNLFdBQVcsaUJBQWlCLElBQUksYUFBYSxJQUFJLFVBQVUsS0FBSyxnQkFBZ0I7QUFDdEYsVUFBSSxDQUFDLFFBQVMsUUFBTyxLQUFLLEVBQUUsT0FBTyxtQkFBbUIsR0FBRyxHQUFHO0FBQzVELFVBQUksVUFBVSxXQUFXO0FBQ3ZCLFlBQUksSUFBSSxXQUFXLFFBQVE7QUFDekIsZ0JBQU0sd0JBQXdCLFNBQVMsVUFBVSx3QkFBd0I7QUFBQSxZQUN2RSxTQUFTO0FBQUEsVUFDWCxDQUFDO0FBQ0QsaUJBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxRQUFRLEtBQUssU0FBUyxZQUFZLENBQUM7QUFBQSxRQUNqRTtBQUNBLGVBQU8sTUFBTSxpQkFBaUIsU0FBUyxVQUFVLFVBQVUsd0JBQXdCO0FBQUEsVUFDakYsU0FBUztBQUFBLFVBQ1QsaUJBQWlCO0FBQUEsUUFDbkIsQ0FBQztBQUFBLE1BQ0g7QUFDQSxVQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLGVBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxRQUFRLEtBQUssU0FBUyxZQUFZLENBQUM7QUFBQSxNQUNqRTtBQUNBLGFBQU8sTUFBTSxzQkFBc0IsU0FBUyxVQUFVLHdCQUF3QjtBQUFBLFFBQzVFLFNBQVM7QUFBQSxNQUNYLENBQUM7QUFBQSxJQUNIO0FBRUEsVUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLO0FBQzVCLFVBQU0sZUFBZSxNQUFNO0FBQzNCLFVBQU0sZ0JBQWdCLE9BQU8sTUFBTSxTQUFTLFdBQVcsS0FBSyxPQUFPO0FBQ25FLFFBQUksQ0FBQyxnQkFBZ0IsT0FBTyxpQkFBaUIsVUFBVTtBQUNyRCxhQUFPLEtBQUssRUFBRSxPQUFPLHVCQUF1QixHQUFHLEdBQUc7QUFBQSxJQUNwRDtBQUVBLFVBQU0sV0FBVyxNQUFNLGdCQUFnQixZQUFZO0FBQ25ELFVBQU0sV0FBVyxTQUFTO0FBQzFCLFFBQUksQ0FBQyxnQkFBZ0IsS0FBSyxRQUFRLEdBQUc7QUFDbkMsYUFBTyxLQUFLLEVBQUUsT0FBTywyQ0FBMkMsR0FBRyxHQUFHO0FBQUEsSUFDeEU7QUFFQSxVQUFNLE9BQU8sTUFBTSxjQUFjLFFBQVE7QUFDekMsVUFBTSxjQUFjLEtBQUs7QUFDekIsVUFBTSxXQUFXLGVBQWUsYUFBYSxvRUFBb0U7QUFDakgsVUFBTSxXQUFXLGVBQWUsYUFBYSx5REFBeUQ7QUFDdEcsVUFBTSxhQUFhLGVBQWUsYUFBYSxvRUFBb0U7QUFDbkgsVUFBTSxnQkFBZ0Isb0JBQW9CLGFBQWEsT0FBTztBQUM5RCxVQUFNLGdCQUFnQixvQkFBb0IsYUFBYSxPQUFPO0FBQzlELFVBQU0sWUFBWSxlQUFlLGFBQWEsbUVBQW1FO0FBQ2pILFVBQU0sYUFBYSxlQUFlLGFBQWEsb0VBQW9FO0FBRW5ILFVBQU0sb0JBQW9CLEtBQUssQ0FBQyxHQUFHLFVBQVUsR0FBRyxVQUFVLEdBQUcsVUFBVSxDQUFDO0FBQ3hFLFVBQU0saUJBQWlCLGNBQWMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsU0FBUyxRQUFRLENBQUM7QUFDL0YsVUFBTSxpQkFBaUIsS0FBSyxDQUFDLEdBQUcsbUJBQW1CLEdBQUcsY0FBYyxDQUFDO0FBQ3JFLFVBQU0saUJBQWlCLEtBQUssQ0FBQyxHQUFHLFdBQVcsR0FBRyxVQUFVLENBQUM7QUFDekQsVUFBTSxvQkFBb0IsQ0FBQyxrQkFBa0IsVUFBVSxlQUFlLENBQUMsS0FBSyxjQUFjLENBQUMsSUFDdkYsQ0FBQztBQUFBLE1BQ0MsT0FBTztBQUFBLE1BQ1AsS0FBSyxlQUFlLENBQUM7QUFBQSxNQUNyQixVQUFVO0FBQUEsTUFDVixjQUFjO0FBQUEsTUFDZCxlQUFlO0FBQUEsTUFDZixlQUFlLGNBQWMsQ0FBQztBQUFBLElBQ2hDLENBQUMsSUFDRCxDQUFDO0FBRUwsVUFBTSxhQUFhLGVBQWUsU0FDOUIsQ0FBQztBQUFBLE1BQ0MsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLE1BQ1AsYUFBYSxrQkFBa0IsU0FDM0Isa0ZBQ0EsZUFBZSxVQUFVLGNBQWMsU0FDckMsNkRBQ0E7QUFBQSxNQUNOLFdBQVcsZUFBZSxDQUFDLEtBQUs7QUFBQSxNQUNoQyxXQUFXO0FBQUEsUUFDVCxHQUFHO0FBQUEsUUFDSCxHQUFHLFNBQVMsSUFBSSxDQUFDLFVBQVUsV0FBVztBQUFBLFVBQ3BDLE9BQU8sWUFBWSxRQUFRLENBQUM7QUFBQSxVQUM1QixLQUFLO0FBQUEsVUFDTCxVQUFVLGVBQWUsUUFBUSxDQUFDO0FBQUEsVUFDbEMsY0FBYztBQUFBLFFBQ2hCLEVBQUU7QUFBQSxRQUNGLEdBQUcsU0FDQSxPQUFPLENBQUMsYUFBYSxDQUFDLFNBQVMsU0FBUyxRQUFRLENBQUMsRUFDakQsSUFBSSxDQUFDLFVBQVUsV0FBVztBQUFBLFVBQ3pCLE9BQU8sWUFBWSxRQUFRLENBQUM7QUFBQSxVQUM1QixLQUFLO0FBQUEsVUFDTCxVQUFVLGVBQWUsUUFBUSxDQUFDO0FBQUEsVUFDbEMsY0FBYztBQUFBLFFBQ2hCLEVBQUU7QUFBQSxRQUNKLEdBQUcsZUFBZSxJQUFJLENBQUMsVUFBVSxXQUFXO0FBQUEsVUFDMUMsT0FBTyxjQUFjLFFBQVEsQ0FBQztBQUFBLFVBQzlCLEtBQUs7QUFBQSxVQUNMLFVBQVUsdUJBQXVCLFFBQVEsQ0FBQztBQUFBLFVBQzFDLGNBQWM7QUFBQSxRQUNoQixFQUFFO0FBQUEsUUFDRixHQUFHLGNBQWMsSUFBSSxDQUFDLFVBQVUsV0FBVztBQUFBLFVBQ3pDLE9BQU8sY0FBYyxRQUFRLENBQUM7QUFBQSxVQUM5QixLQUFLO0FBQUEsVUFDTCxVQUFVLHVCQUF1QixRQUFRLENBQUM7QUFBQSxVQUMxQyxjQUFjO0FBQUEsUUFDaEIsRUFBRTtBQUFBLE1BQ0o7QUFBQSxJQUNGLENBQUMsSUFDRCxDQUFDO0FBRUwsVUFBTSxhQUFhLGVBQ2hCLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxTQUFTLGdCQUFnQixDQUFDLEVBQ3pELElBQUksQ0FBQyxVQUFVLFdBQVc7QUFBQSxNQUN6QixJQUFJLFNBQVMsUUFBUSxDQUFDO0FBQUEsTUFDdEIsTUFBTTtBQUFBLE1BQ04sT0FBTyxTQUFTLFFBQVEsQ0FBQztBQUFBLE1BQ3pCLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxRQUNUO0FBQUEsVUFDRSxPQUFPO0FBQUEsVUFDUCxLQUFLO0FBQUEsVUFDTCxVQUFVLGtCQUFrQixRQUFRLENBQUM7QUFBQSxVQUNyQyxjQUFjO0FBQUEsUUFDaEI7QUFBQSxNQUNGO0FBQUEsSUFDRixFQUFFO0FBRUosVUFBTSxRQUNKLGtCQUFrQixXQUFXLGtCQUFrQixTQUMzQyxhQUNBLGtCQUFrQixTQUNoQixDQUFDLEdBQUcsWUFBWSxHQUFHLFVBQVUsSUFDN0IsQ0FBQyxHQUFHLFlBQVksR0FBRyxVQUFVO0FBRXJDLFFBQUksQ0FBQyxNQUFNLFFBQVE7QUFDakIsYUFBTyxLQUFLLEVBQUUsT0FBTyxxREFBcUQsR0FBRyxHQUFHO0FBQUEsSUFDbEY7QUFFQSxXQUFPLEtBQUs7QUFBQSxNQUNWLFVBQVU7QUFBQSxNQUNWLFlBQVk7QUFBQSxNQUNaLE9BQU8sWUFBWSxhQUFhLFVBQVUsS0FBSztBQUFBLE1BQy9DLFNBQVMsWUFBWSxhQUFhLGdCQUFnQixLQUFLO0FBQUEsTUFDdkQsVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osT0FBTyxNQUFNLENBQUMsR0FBRyxhQUFhO0FBQUEsTUFDOUI7QUFBQSxNQUNBLGFBQWEsS0FBSztBQUFBLElBQ3BCLENBQUM7QUFBQSxFQUNILFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsV0FBTyxLQUFLLEVBQUUsT0FBTyxRQUFRLEdBQUcsUUFBUSxTQUFTLG9DQUFvQyxJQUFJLE1BQU0sR0FBRztBQUFBLEVBQ3BHO0FBQ0Y7OztBQ3RTcVksU0FBUyxvQkFBb0I7QUFNbGEsSUFBTSxtQkFBbUI7QUFDekIsSUFBTSxnQkFBZ0I7QUFrQ3RCLElBQU0sTUFBTyxXQUVWLFNBQVMsT0FBTyxDQUFDO0FBRXBCLElBQU0saUJBQWlCLE1BQU0sSUFBSSxxQkFBcUIsSUFBSSxnQkFBZ0I7QUFDMUUsSUFBTSw0QkFBNEIsTUFBTSxJQUFJLGlDQUFpQyxJQUFJLDRCQUE0QjtBQUM3RyxJQUFNLHdCQUF3QixNQUFNLElBQUksNkJBQTZCO0FBQ3JFLElBQU0sdUJBQXVCLE1BQU0sSUFBSSx1QkFBdUI7QUFFOUQsSUFBTSxxQkFBcUIsTUFBTTtBQUMvQixRQUFNLGNBQWMsZUFBZTtBQUNuQyxRQUFNLGNBQWMsMEJBQTBCO0FBRTlDLE1BQUksQ0FBQyxlQUFlLENBQUMsYUFBYTtBQUNoQyxVQUFNLElBQUksTUFBTSx3Q0FBd0M7QUFBQSxFQUMxRDtBQUVBLFNBQU8sYUFBYSxhQUFhLFdBQVc7QUFDOUM7QUFFQSxJQUFNLG9CQUFvQixNQUFNO0FBQzlCLFFBQU0sY0FBYyxlQUFlO0FBQ25DLFFBQU0sYUFBYSxzQkFBc0I7QUFFekMsTUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFZLFFBQU87QUFFeEMsU0FBTyxhQUFhLGFBQWEsVUFBVTtBQUM3QztBQUVBLElBQU0sb0JBQW9CLE9BQU8sUUFBNEM7QUFDM0UsUUFBTSxhQUFhLElBQUksUUFBUSxJQUFJLGVBQWU7QUFDbEQsTUFBSSxDQUFDLFlBQVksV0FBVyxTQUFTLEdBQUc7QUFDdEMsVUFBTSxJQUFJLE1BQU0sY0FBYztBQUFBLEVBQ2hDO0FBRUEsUUFBTSxRQUFRLFdBQVcsUUFBUSxXQUFXLEVBQUU7QUFDOUMsUUFBTSxTQUFTLG1CQUFtQjtBQUNsQyxRQUFNLEVBQUUsTUFBTSxNQUFNLElBQUksTUFBTSxPQUFPLEtBQUssUUFBUSxLQUFLO0FBRXZELE1BQUksU0FBUyxDQUFDLEtBQUssTUFBTSxNQUFNLENBQUMsS0FBSyxLQUFLLE9BQU87QUFDL0MsVUFBTSxJQUFJLE1BQU0sY0FBYztBQUFBLEVBQ2hDO0FBRUEsU0FBTztBQUFBLElBQ0wsSUFBSSxLQUFLLEtBQUs7QUFBQSxJQUNkLE9BQU8sS0FBSyxLQUFLO0FBQUEsRUFDbkI7QUFDRjtBQUVBLElBQU0sb0JBQW9CLE9BQU8sWUFPM0I7QUFDSixRQUFNLFFBQVEsa0JBQWtCO0FBQ2hDLE1BQUksQ0FBQyxNQUFPO0FBRVosUUFBTSxNQUFNLEtBQUssYUFBYSxFQUFFO0FBQUEsSUFDOUI7QUFBQSxNQUNFLFNBQVMsUUFBUTtBQUFBLE1BQ2pCLE9BQU8sUUFBUTtBQUFBLE1BQ2YsUUFBUSxRQUFRO0FBQUEsTUFDaEIsb0JBQW9CLFFBQVE7QUFBQSxNQUM1Qix3QkFBd0IsUUFBUSxnQkFBZ0I7QUFBQSxNQUNoRCxvQkFBb0IsUUFBUSxvQkFBb0I7QUFBQSxJQUNsRDtBQUFBLElBQ0EsRUFBRSxZQUFZLFVBQVU7QUFBQSxFQUMxQjtBQUNGO0FBRUEsSUFBTSwwQkFBMEIsQ0FBQyxXQUFtQixPQUFPLE1BQU0sSUFBSSxLQUFLLElBQUksQ0FBQztBQUV4RSxJQUFNLDJCQUEyQixPQUFPLFFBQWlCO0FBQzlELE1BQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsV0FBTyxJQUFJLFNBQVMsTUFBTSxFQUFFLFNBQVMsWUFBWSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxNQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLFdBQU8sS0FBSyxFQUFFLE9BQU8scUJBQXFCLEdBQUcsR0FBRztBQUFBLEVBQ2xEO0FBRUEsTUFBSTtBQUNGLFVBQU0sRUFBRSxJQUFJLFFBQVEsTUFBTSxJQUFJLE1BQU0sa0JBQWtCLEdBQUc7QUFDekQsVUFBTSxZQUFZLHFCQUFxQjtBQUV2QyxRQUFJLENBQUMsV0FBVztBQUNkLGFBQU8sS0FBSyxFQUFFLE9BQU8sMkNBQTJDLEdBQUcsR0FBRztBQUFBLElBQ3hFO0FBRUEsVUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUMsRUFBRTtBQUM5QyxVQUFNLGNBQ0osT0FBTyxNQUFNLGlCQUFpQixZQUFZLEtBQUssYUFBYSxLQUFLLEVBQUUsU0FBUyxJQUN4RSxLQUFLLGVBQ0wsR0FBRyxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUUsTUFBTTtBQUVoQyxVQUFNLFlBQVksd0JBQXdCLE1BQU07QUFFaEQsVUFBTSxXQUFXLE1BQU0sTUFBTSxrREFBa0Q7QUFBQSxNQUM3RSxRQUFRO0FBQUEsTUFDUixTQUFTO0FBQUEsUUFDUCxlQUFlLFVBQVUsU0FBUztBQUFBLFFBQ2xDLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsTUFDQSxNQUFNLEtBQUssVUFBVTtBQUFBLFFBQ25CO0FBQUEsUUFDQSxRQUFRO0FBQUEsUUFDUixVQUFVO0FBQUEsUUFDVjtBQUFBLFFBQ0EsY0FBYztBQUFBLFFBQ2QsVUFBVSxFQUFFLFNBQVMsUUFBUSxNQUFNLGNBQWM7QUFBQSxNQUNuRCxDQUFDO0FBQUEsSUFDSCxDQUFDO0FBRUQsVUFBTSxXQUFZLE1BQU0sU0FBUyxLQUFLO0FBRXRDLFFBQUksQ0FBQyxTQUFTLE1BQU0sQ0FBQyxTQUFTLFFBQVE7QUFDcEMsYUFBTyxLQUFLLEVBQUUsT0FBTyxTQUFTLFdBQVcsY0FBYyxHQUFHLEdBQUc7QUFBQSxJQUMvRDtBQUVBLFVBQU0sa0JBQWtCO0FBQUEsTUFDdEI7QUFBQSxNQUNBO0FBQUEsTUFDQSxPQUFPO0FBQUEsTUFDUDtBQUFBLElBQ0YsQ0FBQztBQUVELFdBQU8sS0FBSztBQUFBLE1BQ1YsbUJBQW1CLFNBQVMsTUFBTTtBQUFBLE1BQ2xDLGFBQWEsU0FBUyxNQUFNO0FBQUEsTUFDNUIsV0FBVyxTQUFTLE1BQU0sYUFBYTtBQUFBLElBQ3pDLENBQUM7QUFBQSxFQUNILFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsVUFBTSxTQUFTLFlBQVksaUJBQWlCLE1BQU07QUFDbEQsV0FBTyxLQUFLLEVBQUUsT0FBTyxRQUFRLEdBQUcsTUFBTTtBQUFBLEVBQ3hDO0FBQ0Y7QUFFTyxJQUFNLHVCQUF1QixPQUFPLFFBQWlCO0FBQzFELE1BQUksSUFBSSxXQUFXLFdBQVc7QUFDNUIsV0FBTyxJQUFJLFNBQVMsTUFBTSxFQUFFLFNBQVMsWUFBWSxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxNQUFJLElBQUksV0FBVyxRQUFRO0FBQ3pCLFdBQU8sS0FBSyxFQUFFLE9BQU8scUJBQXFCLEdBQUcsR0FBRztBQUFBLEVBQ2xEO0FBRUEsTUFBSTtBQUNGLFVBQU0sRUFBRSxJQUFJLFFBQVEsTUFBTSxJQUFJLE1BQU0sa0JBQWtCLEdBQUc7QUFDekQsVUFBTSxZQUFZLHFCQUFxQjtBQUV2QyxRQUFJLENBQUMsV0FBVztBQUNkLGFBQU8sS0FBSyxFQUFFLE9BQU8sMkNBQTJDLEdBQUcsR0FBRztBQUFBLElBQ3hFO0FBRUEsVUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLLEVBQUUsTUFBTSxPQUFPLENBQUMsRUFBRTtBQUM5QyxVQUFNLFlBQVksT0FBTyxNQUFNLGNBQWMsV0FBVyxLQUFLLFVBQVUsS0FBSyxJQUFJO0FBQ2hGLFFBQUksQ0FBQyxXQUFXO0FBQ2QsYUFBTyxLQUFLLEVBQUUsT0FBTyxvQkFBb0IsR0FBRyxHQUFHO0FBQUEsSUFDakQ7QUFFQSxVQUFNLGFBQWEsTUFBTSxNQUFNLDhDQUE4QyxtQkFBbUIsU0FBUyxDQUFDLElBQUk7QUFBQSxNQUM1RyxTQUFTO0FBQUEsUUFDUCxlQUFlLFVBQVUsU0FBUztBQUFBLE1BQ3BDO0FBQUEsSUFDRixDQUFDO0FBRUQsVUFBTSxhQUFjLE1BQU0sV0FBVyxLQUFLO0FBRTFDLFFBQUksQ0FBQyxXQUFXLE1BQU0sQ0FBQyxXQUFXLFFBQVE7QUFDeEMsYUFBTyxLQUFLLEVBQUUsT0FBTyxXQUFXLFdBQVcsZ0JBQWdCLEdBQUcsR0FBRztBQUFBLElBQ25FO0FBRUEsVUFBTSxPQUFPLFdBQVc7QUFDeEIsVUFBTSxZQUFZLE1BQU0sV0FBVztBQUNuQyxVQUFNLGlCQUFpQixNQUFNLFVBQVU7QUFFdkMsUUFBSSxrQkFBa0IsbUJBQW1CLFFBQVE7QUFDL0MsYUFBTyxLQUFLLEVBQUUsT0FBTyxvQ0FBb0MsR0FBRyxHQUFHO0FBQUEsSUFDakU7QUFFQSxRQUFJLENBQUMsV0FBVztBQUNkLGFBQU8sS0FBSztBQUFBLFFBQ1YsUUFBUTtBQUFBLFFBQ1IsUUFBUSxNQUFNLFVBQVU7QUFBQSxNQUMxQixDQUFDO0FBQUEsSUFDSDtBQUVBLFVBQU0sU0FBUyxNQUFNLFVBQVUsSUFBSSxLQUFLLEtBQUssT0FBTyxJQUFJLG9CQUFJLEtBQUs7QUFDakUsVUFBTSxtQkFBbUIsSUFBSSxLQUFLLE9BQU8sUUFBUSxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQUssR0FBSSxFQUFFLFlBQVk7QUFFM0YsVUFBTSxrQkFBa0I7QUFBQSxNQUN0QjtBQUFBLE1BQ0EsT0FBTyxTQUFTLE1BQU0sVUFBVSxTQUFTO0FBQUEsTUFDekMsT0FBTztBQUFBLE1BQ1A7QUFBQSxNQUNBLGNBQWMsTUFBTSxVQUFVLGlCQUFpQjtBQUFBLE1BQy9DO0FBQUEsSUFDRixDQUFDO0FBRUQsV0FBTyxLQUFLO0FBQUEsTUFDVixRQUFRO0FBQUEsTUFDUixvQkFBb0I7QUFBQSxJQUN0QixDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxVQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQ3pELFVBQU0sU0FBUyxZQUFZLGlCQUFpQixNQUFNO0FBQ2xELFdBQU8sS0FBSyxFQUFFLE9BQU8sUUFBUSxHQUFHLE1BQU07QUFBQSxFQUN4QztBQUNGOzs7QUNsUEEsSUFBTUEsMEJBQXlCO0FBQUEsRUFDN0I7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFFQSxJQUFNLGtCQUFrQjtBQUFBLEVBQ3RCO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFDRjtBQUVBLElBQU0seUJBQXlCO0FBQy9CLElBQU0scUJBQ0o7QUFnRkYsSUFBTSxlQUFlLENBQUMsUUFBZ0I7QUFDcEMsTUFBSSxJQUFJLFdBQVcsSUFBSSxFQUFHLFFBQU8sU0FBUyxHQUFHO0FBQzdDLFNBQU87QUFDVDtBQUVBLElBQU0saUJBQWlCLENBQUMsVUFDdEIsVUFBVSxTQUFTLEtBQUssUUFBUSxPQUFPLEVBQUUsS0FBSyxLQUFLLEVBQUU7QUFFdkQsSUFBTSxpQkFBaUIsQ0FBQyxVQUN0QixPQUFPLFVBQVUsV0FBVyxRQUFRLFNBQVMsU0FBUyxLQUFLLEVBQUU7QUFFL0QsSUFBTSxXQUFXLENBQUMsVUFBaUM7QUFDakQsUUFBTSxPQUFPLE9BQU8sY0FBYyxPQUFPLE1BQU0sSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUU7QUFDbkYsU0FBTyxRQUFRO0FBQ2pCO0FBRUEsSUFBTUMsa0JBQWlCLENBQUMsVUFBa0I7QUFDeEMsTUFBSTtBQUNGLFVBQU0sTUFBTSxJQUFJLElBQUksS0FBSztBQUN6QixRQUFJLElBQUksU0FBUyxTQUFTLFVBQVUsRUFBRyxRQUFPLElBQUksU0FBUyxNQUFNLEdBQUcsRUFBRSxPQUFPLE9BQU8sRUFBRSxDQUFDLEtBQUs7QUFDNUYsUUFBSSxJQUFJLFNBQVMsV0FBVyxVQUFVLEVBQUcsUUFBTyxJQUFJLFNBQVMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxLQUFLO0FBQzlFLFFBQUksSUFBSSxTQUFTLFdBQVcsU0FBUyxFQUFHLFFBQU8sSUFBSSxTQUFTLE1BQU0sR0FBRyxFQUFFLENBQUMsS0FBSztBQUM3RSxXQUFPLElBQUksYUFBYSxJQUFJLEdBQUc7QUFBQSxFQUNqQyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLElBQU0sb0JBQW9CLENBQUMsVUFBa0I7QUFDM0MsTUFBSTtBQUNGLFVBQU0sTUFBTSxJQUFJLElBQUksS0FBSztBQUN6QixXQUFPLElBQUksYUFBYSxJQUFJLE1BQU07QUFBQSxFQUNwQyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLElBQU0scUJBQXFCLE9BQVVDLFVBQTZCO0FBQ2hFLE1BQUksWUFBMkI7QUFDL0IsYUFBVyxRQUFRLGlCQUFpQjtBQUNsQyxRQUFJO0FBQ0YsWUFBTSxXQUFXLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBR0EsS0FBSSxJQUFJO0FBQUEsUUFDdEQsU0FBUztBQUFBLFVBQ1AsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFFBQ1Y7QUFBQSxNQUNGLEdBQUc7QUFBQSxRQUNELFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxNQUNiLENBQUM7QUFDRCxVQUFJLENBQUMsU0FBUyxJQUFJO0FBQ2hCLG9CQUFZLG1CQUFtQixTQUFTLE1BQU07QUFDOUM7QUFBQSxNQUNGO0FBQ0EsYUFBTyxNQUFNLFNBQVMsS0FBSztBQUFBLElBQzdCLFNBQVMsT0FBTztBQUNkLGtCQUFZLGlCQUFpQixRQUFRLE1BQU0sVUFBVTtBQUFBLElBQ3ZEO0FBQUEsRUFDRjtBQUNBLFFBQU0sSUFBSSxNQUFNLGFBQWEsMENBQTBDO0FBQ3pFO0FBRUEsSUFBTSx5QkFBeUIsQ0FBQyxTQUM5QixLQUFLLE1BQU0sK0JBQStCLElBQUksQ0FBQyxLQUM1QyxLQUFLLE1BQU0sa0RBQWtELElBQUksQ0FBQyxLQUNsRTtBQUVMLElBQU0scUJBQXFCLE9BQU8sWUFBNkM7QUFDN0UsUUFBTSxXQUFXLG1DQUFtQyxtQkFBbUIsT0FBTyxDQUFDO0FBQy9FLFFBQU0sZ0JBQWdCLE1BQU0sZUFBZSxVQUFVO0FBQUEsSUFDbkQsU0FBUztBQUFBLE1BQ1AsY0FBYztBQUFBLE1BQ2QsUUFBUTtBQUFBLE1BQ1IsbUJBQW1CO0FBQUEsSUFDckI7QUFBQSxFQUNGLEdBQUc7QUFBQSxJQUNELFVBQVU7QUFBQSxJQUNWLFdBQVc7QUFBQSxFQUNiLENBQUM7QUFFRCxNQUFJLENBQUMsY0FBYyxJQUFJO0FBQ3JCLFVBQU0sSUFBSSxNQUFNLDRCQUE0QixjQUFjLE1BQU0sRUFBRTtBQUFBLEVBQ3BFO0FBRUEsUUFBTSxZQUFZLE1BQU0sY0FBYyxLQUFLO0FBQzNDLFFBQU0sU0FBUyx1QkFBdUIsU0FBUztBQUMvQyxNQUFJLENBQUMsUUFBUTtBQUNYLFVBQU0sSUFBSSxNQUFNLDZDQUE2QztBQUFBLEVBQy9EO0FBRUEsUUFBTSxpQkFBaUIsTUFBTSxlQUFlLGtEQUFrRCxtQkFBbUIsTUFBTSxDQUFDLHNCQUFzQjtBQUFBLElBQzVJLFFBQVE7QUFBQSxJQUNSLFNBQVM7QUFBQSxNQUNQLGNBQWM7QUFBQSxNQUNkLFFBQVE7QUFBQSxNQUNSLGdCQUFnQjtBQUFBLE1BQ2hCLG1CQUFtQjtBQUFBLE1BQ25CLFFBQVE7QUFBQSxNQUNSLFNBQVMsY0FBYyxPQUFPO0FBQUEsTUFDOUIseUJBQXlCO0FBQUEsTUFDekIsNEJBQTRCO0FBQUEsSUFDOUI7QUFBQSxJQUNBLE1BQU0sS0FBSyxVQUFVO0FBQUEsTUFDbkIsU0FBUztBQUFBLFFBQ1AsUUFBUTtBQUFBLFVBQ04sWUFBWTtBQUFBLFVBQ1osZUFBZTtBQUFBLFVBQ2YsSUFBSTtBQUFBLFVBQ0osSUFBSTtBQUFBLFFBQ047QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLE1BQ0EsZ0JBQWdCO0FBQUEsTUFDaEIsYUFBYTtBQUFBLElBQ2YsQ0FBQztBQUFBLEVBQ0gsR0FBRztBQUFBLElBQ0QsVUFBVTtBQUFBLElBQ1YsV0FBVztBQUFBLEVBQ2IsQ0FBQztBQUVELE1BQUksQ0FBQyxlQUFlLElBQUk7QUFDdEIsVUFBTSxJQUFJLE1BQU0sNEJBQTRCLGVBQWUsTUFBTSxFQUFFO0FBQUEsRUFDckU7QUFFQSxRQUFNLFVBQVUsTUFBTSxlQUFlLEtBQUs7QUFDMUMsUUFBTSxjQUFjLFFBQVEsbUJBQW1CO0FBQy9DLE1BQUksZUFBZSxnQkFBZ0IsTUFBTTtBQUN2QyxVQUFNLElBQUk7QUFBQSxNQUNSLFFBQVEsbUJBQW1CLFVBQ3hCLFFBQVEsbUJBQW1CLFdBQVcsQ0FBQyxLQUN2Qyw4QkFBOEIsV0FBVztBQUFBLElBQzlDO0FBQUEsRUFDRjtBQUVBLFNBQU87QUFDVDtBQUVBLElBQU0sZ0JBQWdCLENBQUMsZUFBd0M7QUFDN0QsUUFBTSxPQUFPLFlBQVksTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLE9BQU8sRUFBRSxTQUFTLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDO0FBQ2xGLFNBQU8sTUFBTSxNQUFNLGFBQWEsS0FBSyxHQUFHLElBQUk7QUFDOUM7QUFFQSxJQUFNLGtCQUFrQixDQUFDLFVBQ3ZCLE1BQU0sZUFDRixPQUFPLENBQUMsV0FBVyxPQUFPLE9BQU8sT0FBTyxVQUFVLFNBQVMsV0FBVyxDQUFDLEVBQ3hFLEtBQUssQ0FBQyxHQUFHLE1BQU0sZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sSUFBSSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLO0FBRXJILElBQU0sMEJBQTBCLENBQUMsVUFDL0IsTUFBTSxpQkFDRixPQUFPLENBQUMsV0FBVyxPQUFPLE9BQU8sT0FBTyxVQUFVLFNBQVMsV0FBVyxDQUFDLEVBQ3hFLEtBQUssQ0FBQyxHQUFHLE1BQ1IsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sSUFBSSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxLQUNyRixlQUFlLEVBQUUsT0FBTyxJQUFJLGVBQWUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFFdEUsSUFBTSxrQkFBa0IsQ0FBQyxVQUN2QixNQUFNLGlCQUNGLE9BQU8sQ0FBQyxXQUFXLE9BQU8sT0FBTyxPQUFPLFVBQVUsU0FBUyxRQUFRLENBQUMsRUFDckUsS0FBSyxDQUFDLEdBQUcsTUFBTSxlQUFlLEVBQUUsT0FBTyxJQUFJLGVBQWUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFFakYsSUFBTSxxQkFBcUIsQ0FBQyxVQUMxQixNQUFNLGlCQUNGLE9BQU8sQ0FBQyxXQUFXLE9BQU8sT0FBTyxPQUFPLFVBQVUsU0FBUyxXQUFXLENBQUMsRUFDeEUsS0FBSyxDQUFDLEdBQUcsTUFBTSxlQUFlLEVBQUUsT0FBTyxJQUFJLGVBQWUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFFakYsSUFBTSxpQkFBaUIsQ0FBQyxXQUN0QixRQUFRLFVBQVUsU0FBUyxNQUFNLElBQUksU0FBUztBQUVoRCxJQUFNLGlCQUFpQixDQUFDLGFBQTJDO0FBQUEsRUFDakUsT0FBTyxRQUFRLGNBQWMsU0FBUyxTQUFTLFFBQVEsYUFBYSwyQkFBMkIsS0FBSyxLQUFLO0FBQUEsRUFDekcsUUFBUSxRQUFRLGNBQWMsVUFBVSxRQUFRLGFBQWEsMkJBQTJCO0FBQUEsRUFDeEYsVUFBVSxRQUFRLGNBQWMsYUFBYSxRQUFRLGFBQWEsMkJBQTJCO0FBQUEsRUFDN0YsYUFBYSxRQUFRLGNBQWMsb0JBQW9CLFNBQVMsUUFBUSxhQUFhLDJCQUEyQixXQUFXO0FBQUEsRUFDM0gsWUFDRSxRQUFRLGNBQWMsV0FBVyxjQUM5QixRQUFRLGFBQWEsMkJBQTJCLFdBQVcsY0FDM0QsQ0FBQztBQUFBLEVBQ04sZUFBZSxRQUFRLGVBQWUsV0FBVyxDQUFDO0FBQUEsRUFDbEQsaUJBQWlCLFFBQVEsZUFBZSxtQkFBbUIsQ0FBQztBQUM5RDtBQUVBLElBQU0sZ0JBQWdCLENBQUMsU0FBaUIsT0FBcUIsU0FBaUI7QUFDNUUsUUFBTSxZQUFZLGNBQWMsTUFBTSxVQUFVLEtBQzNDLDBCQUEwQixPQUFPO0FBQ3RDLFFBQU0seUJBQXlCLGdCQUFnQixLQUFLO0FBQ3BELFFBQU0sc0JBQXNCLHlCQUF5QixPQUFPLHdCQUF3QixLQUFLO0FBQ3pGLFFBQU0sY0FBYywwQkFBMEI7QUFDOUMsUUFBTSwwQkFBMEIsbUJBQW1CLEtBQUs7QUFDeEQsUUFBTSxzQkFBc0IsZ0JBQWdCLEtBQUs7QUFDakQsUUFBTSxjQUFjLFNBQVMsVUFDekIsc0JBQ0EsMkJBQTJCO0FBQy9CLFFBQU0sV0FBVyxTQUFTLFdBQ3JCLENBQUMsMEJBQ0QsUUFBUSxxQkFBcUIsR0FBRyxLQUNoQyxRQUFRLHlCQUF5QixHQUFHO0FBQ3pDLFFBQU0saUJBQWlCLENBQUMsMEJBQTBCLFFBQVEscUJBQXFCLEdBQUcsS0FBSyxRQUFRLHFCQUFxQixHQUFHO0FBQ3ZILFFBQU0sWUFBWSxDQUFDO0FBRW5CLE1BQUksU0FBUyxXQUFXLGFBQWEsS0FBSztBQUN4QyxjQUFVLEtBQUs7QUFBQSxNQUNiLE9BQU87QUFBQSxNQUNQLEtBQUssWUFBWTtBQUFBLE1BQ2pCLFVBQVUsR0FBRyxPQUFPLElBQUksZUFBZSxXQUFXLENBQUM7QUFBQSxNQUNuRCxjQUFjO0FBQUEsTUFDZCxTQUFTLFlBQVksZ0JBQWdCO0FBQUEsSUFDdkMsQ0FBQztBQUFBLEVBQ0g7QUFDQSxNQUFJLFlBQVkscUJBQXFCLE9BQU8seUJBQXlCLEtBQUs7QUFDeEUsY0FBVSxLQUFLO0FBQUEsTUFDYixPQUFPO0FBQUEsTUFDUCxLQUFLLG9CQUFvQjtBQUFBLE1BQ3pCLFVBQVUsR0FBRyxPQUFPO0FBQUEsTUFDcEIsY0FBYztBQUFBLE1BQ2QsU0FBUyxvQkFBb0IsZ0JBQWdCLG9CQUFvQixXQUFXO0FBQUEsTUFDNUUsZUFBZTtBQUFBLE1BQ2YsZUFBZSx3QkFBd0I7QUFBQSxJQUN6QyxDQUFDO0FBQUEsRUFDSDtBQUNBLE1BQUksYUFBYSxLQUFLO0FBQ3BCLGNBQVUsS0FBSztBQUFBLE1BQ2IsT0FBTztBQUFBLFFBQ0wsWUFBWSxnQkFBZ0IsWUFBWSxXQUFXO0FBQUEsUUFDbkQsWUFBWSxpQkFBaUIsZUFBZTtBQUFBLE1BQzlDLEVBQUUsT0FBTyxPQUFPLEVBQUUsS0FBSyxHQUFHO0FBQUEsTUFDMUIsS0FBSyxZQUFZO0FBQUEsTUFDakIsVUFBVSxHQUFHLE9BQU87QUFBQSxNQUNwQixjQUFjO0FBQUEsTUFDZCxTQUFTLFlBQVksZ0JBQWdCLFlBQVksV0FBVztBQUFBLElBQzlELENBQUM7QUFBQSxFQUNIO0FBQ0EsTUFBSSxTQUFTLFdBQVcsYUFBYSxLQUFLO0FBQ3hDLGNBQVUsS0FBSztBQUFBLE1BQ2IsT0FBTztBQUFBLE1BQ1AsS0FBSyxZQUFZO0FBQUEsTUFDakIsVUFBVSxHQUFHLE9BQU8sSUFBSSxlQUFlLFdBQVcsQ0FBQztBQUFBLE1BQ25ELGNBQWM7QUFBQSxNQUNkLFNBQVMsWUFBWSxnQkFBZ0I7QUFBQSxJQUN2QyxDQUFDO0FBQUEsRUFDSDtBQUNBLFlBQVUsS0FBSztBQUFBLElBQ2IsT0FBTztBQUFBLElBQ1AsS0FBSztBQUFBLElBQ0wsVUFBVSxHQUFHLE9BQU87QUFBQSxJQUNwQixjQUFjO0FBQUEsRUFDaEIsQ0FBQztBQUVELFNBQU87QUFBQSxJQUNMLElBQUk7QUFBQSxJQUNKLE1BQU0sU0FBUyxVQUFVLFVBQVU7QUFBQSxJQUNuQyxPQUFPLE1BQU0sU0FBUztBQUFBLElBQ3RCLGFBQ0UsV0FDSSxDQUFDLE1BQU0sYUFBYSxtRkFBbUYsRUFDdEcsT0FBTyxPQUFPLEVBQ2QsS0FBSyxHQUFHLElBQ1QsaUJBQ0UsQ0FBQyxNQUFNLGFBQWEscURBQXFELEVBQ3hFLE9BQU8sT0FBTyxFQUNkLEtBQUssR0FBRyxJQUNULE1BQU0sZUFBZTtBQUFBLElBQzdCO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFDRjtBQUVPLElBQU0sd0JBQXdCLE9BQU8sUUFBaUI7QUFDM0QsTUFBSSxJQUFJLFdBQVcsV0FBVztBQUM1QixXQUFPLElBQUksU0FBUyxNQUFNLEVBQUUsU0FBUyxZQUFZLENBQUM7QUFBQSxFQUNwRDtBQUVBLE1BQUk7QUFDRixRQUFJLElBQUksV0FBVyxTQUFTLElBQUksV0FBVyxRQUFRO0FBQ2pELFlBQU0sTUFBTSxJQUFJLElBQUksSUFBSSxHQUFHO0FBQzNCLFlBQU0sVUFBVSxJQUFJLGFBQWEsSUFBSSxNQUFNO0FBQzNDLFlBQU0sV0FBVyxJQUFJLGFBQWEsSUFBSSxPQUFPO0FBQzdDLFlBQU0sUUFBUSxJQUFJLGFBQWEsSUFBSSxPQUFPO0FBQzFDLFlBQU0sV0FBVyxpQkFBaUIsSUFBSSxhQUFhLElBQUksVUFBVSxLQUFLLGVBQWU7QUFDckYsVUFBSSxDQUFDLFFBQVMsUUFBTyxLQUFLLEVBQUUsT0FBTyxtQkFBbUIsR0FBRyxHQUFHO0FBQzVELFVBQUksVUFBVSxXQUFXO0FBQ3ZCLFlBQUksSUFBSSxXQUFXLFFBQVE7QUFDekIsZ0JBQU0sd0JBQXdCLFNBQVMsVUFBVUYseUJBQXdCO0FBQUEsWUFDdkUsU0FBUztBQUFBLFlBQ1QsV0FBVztBQUFBLFVBQ2IsQ0FBQztBQUNELGlCQUFPLElBQUksU0FBUyxNQUFNLEVBQUUsUUFBUSxLQUFLLFNBQVMsWUFBWSxDQUFDO0FBQUEsUUFDakU7QUFDQSxlQUFPLE1BQU0saUJBQWlCLFNBQVMsVUFBVSxVQUFVQSx5QkFBd0I7QUFBQSxVQUNqRixTQUFTO0FBQUEsVUFDVCxpQkFBaUI7QUFBQSxVQUNqQixXQUFXO0FBQUEsUUFDYixDQUFDO0FBQUEsTUFDSDtBQUNBLFVBQUksSUFBSSxXQUFXLFFBQVE7QUFDekIsZUFBTyxJQUFJLFNBQVMsTUFBTSxFQUFFLFFBQVEsS0FBSyxTQUFTLFlBQVksQ0FBQztBQUFBLE1BQ2pFO0FBQ0EsYUFBTyxNQUFNLHNCQUFzQixTQUFTLFVBQVVBLHlCQUF3QjtBQUFBLFFBQzVFLFNBQVM7QUFBQSxRQUNULFdBQVc7QUFBQSxRQUNYLG1CQUFtQjtBQUFBLE1BQ3JCLENBQUM7QUFBQSxJQUNIO0FBRUEsVUFBTSxPQUFPLE1BQU0sSUFBSSxLQUFLO0FBQzVCLFVBQU0sZUFBZSxNQUFNO0FBQzNCLFVBQU0sZ0JBQWdCLE9BQU8sTUFBTSxTQUFTLFdBQVcsS0FBSyxPQUFPO0FBQ25FLFFBQUksQ0FBQyxnQkFBZ0IsT0FBTyxpQkFBaUIsVUFBVTtBQUNyRCxhQUFPLEtBQUssRUFBRSxPQUFPLHNCQUFzQixHQUFHLEdBQUc7QUFBQSxJQUNuRDtBQUVBLFVBQU0sV0FBVyxNQUFNLGdCQUFnQixZQUFZO0FBQ25ELFVBQU0sV0FBVyxTQUFTO0FBRTFCLFFBQUksa0JBQWtCLFlBQVk7QUFDaEMsWUFBTSxhQUFhLGtCQUFrQixRQUFRO0FBQzdDLFVBQUksQ0FBQyxZQUFZO0FBQ2YsZUFBTyxLQUFLLEVBQUUsT0FBTyw0Q0FBNEMsR0FBRyxHQUFHO0FBQUEsTUFDekU7QUFFQSxZQUFNLFdBQVcsTUFBTSxtQkFBc0MsY0FBYyxVQUFVLEVBQUU7QUFDdkYsWUFBTSxTQUFTLFNBQVMsVUFBVSxDQUFDO0FBQ25DLFlBQU0sVUFBVSxNQUFNLFFBQVE7QUFBQSxRQUM1QixPQUFPLElBQUksT0FBTyxVQUFVO0FBQzFCLGNBQUksQ0FBQyxNQUFNLFFBQVMsUUFBTztBQUMzQixnQkFBTUcsV0FBVSxNQUFNLG1CQUFtQixNQUFNLE9BQU87QUFDdEQsaUJBQU8sY0FBYyxNQUFNLFNBQVMsZUFBZUEsUUFBTyxHQUFHLE9BQU87QUFBQSxRQUN0RSxDQUFDO0FBQUEsTUFDSDtBQUVBLFlBQU0sUUFBUSxRQUNYLElBQUksQ0FBQyxXQUFZLE9BQU8sV0FBVyxjQUFjLE9BQU8sUUFBUSxJQUFLLEVBQ3JFLE9BQU8sQ0FBQ0MsVUFBU0EsVUFBUyxJQUFJO0FBRWpDLFVBQUksQ0FBQyxNQUFNLFFBQVE7QUFDakIsZUFBTyxLQUFLLEVBQUUsT0FBTyw0Q0FBNEMsR0FBRyxHQUFHO0FBQUEsTUFDekU7QUFFQSxhQUFPLEtBQUs7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLE9BQU8sU0FBUyxTQUFTO0FBQUEsUUFDekIsU0FBUyxTQUFTLGVBQWU7QUFBQSxRQUNqQyxVQUFVLFNBQVMsWUFBWTtBQUFBLFFBQy9CLFlBQVksU0FBUyxVQUFVO0FBQUEsUUFDL0IsWUFBWTtBQUFBLFFBQ1osT0FBTyxNQUFNLENBQUMsR0FBRyxhQUFhO0FBQUEsUUFDOUI7QUFBQSxRQUNBLGFBQWE7QUFBQSxNQUNmLENBQUM7QUFBQSxJQUNIO0FBRUEsVUFBTSxVQUFVSCxnQkFBZSxRQUFRO0FBQ3ZDLFFBQUksQ0FBQyxTQUFTO0FBQ1osYUFBTyxLQUFLLEVBQUUsT0FBTywyREFBMkQsR0FBRyxHQUFHO0FBQUEsSUFDeEY7QUFFQSxVQUFNLFVBQVUsTUFBTSxtQkFBbUIsT0FBTztBQUNoRCxVQUFNLFFBQVEsZUFBZSxPQUFPO0FBQ3BDLFVBQU0sT0FBTyxjQUFjLFNBQVMsT0FBTyxhQUFhO0FBQ3hELFFBQUksQ0FBQyxLQUFLLFVBQVUsUUFBUTtBQUMxQixhQUFPLEtBQUssRUFBRSxPQUFPLG9EQUFvRCxHQUFHLEdBQUc7QUFBQSxJQUNqRjtBQUVBLFdBQU8sS0FBSztBQUFBLE1BQ1YsVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLE1BQ1osT0FBTyxNQUFNLFNBQVM7QUFBQSxNQUN0QixTQUFTLE1BQU0sZUFBZTtBQUFBLE1BQzlCLFVBQVUsTUFBTSxZQUFZO0FBQUEsTUFDNUIsWUFBWSxNQUFNLFVBQVU7QUFBQSxNQUM1QixZQUFZO0FBQUEsTUFDWixPQUFPLEtBQUs7QUFBQSxNQUNaLE9BQU8sQ0FBQyxJQUFJO0FBQUEsTUFDWixhQUFhO0FBQUEsSUFDZixDQUFDO0FBQUEsRUFDSCxTQUFTLE9BQU87QUFDZCxVQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQ3pELFdBQU8sS0FBSyxFQUFFLE9BQU8sUUFBUSxHQUFHLEdBQUc7QUFBQSxFQUNyQztBQUNGOzs7QUNuZU8sSUFBTSxnQkFBZ0IsT0FBTyxRQUFpQjtBQUNuRCxNQUFJLElBQUksV0FBVyxXQUFXO0FBQzVCLFdBQU8sSUFBSSxTQUFTLE1BQU0sRUFBRSxTQUFTLFlBQVksQ0FBQztBQUFBLEVBQ3BEO0FBRUEsTUFBSTtBQUNGLFVBQU0sT0FBTyxNQUFNLElBQUksS0FBSztBQUM1QixVQUFNLEVBQUUsUUFBUSxLQUFLLFNBQVMsSUFBSSxRQUFRLENBQUM7QUFDM0MsUUFBSSxDQUFDLE9BQU8sT0FBTyxRQUFRLFNBQVUsUUFBTyxLQUFLLEVBQUUsT0FBTyxjQUFjLEdBQUcsR0FBRztBQUM5RSxRQUFJLENBQUMsVUFBVyxXQUFXLGFBQWEsV0FBVyxVQUFZLFFBQU8sS0FBSyxFQUFFLE9BQU8scUJBQXFCLEdBQUcsR0FBRztBQUUvRyxRQUFJLFdBQVcsV0FBVztBQUN4QixZQUFNLFdBQVcsTUFBTSxnQkFBZ0IsR0FBRztBQUMxQyxhQUFPLEtBQUssRUFBRSxVQUFVLEtBQUssYUFBYSxTQUFTLEtBQUssTUFBTSxTQUFTLEtBQUssQ0FBQztBQUFBLElBQy9FO0FBRUEsVUFBTSxXQUFZLFlBQVksT0FBTyxRQUFRLEVBQUUsWUFBWSxLQUFNO0FBRWpFLFFBQUksYUFBYSxTQUFTO0FBQ3hCLFlBQU0sT0FBTyxNQUFNLGVBQWUsNENBQTRDLG1CQUFtQixHQUFHLENBQUMsSUFBSTtBQUFBLFFBQ3ZHLFNBQVMsRUFBRSxjQUFjLFdBQVc7QUFBQSxNQUN0QyxDQUFDO0FBQ0QsWUFBTSxPQUFPLE1BQU0sS0FBSyxLQUFLO0FBQzdCLFVBQUksQ0FBQyxLQUFLLE1BQU0sQ0FBQyxNQUFNLFNBQVUsUUFBTyxLQUFLLEVBQUUsT0FBTyxNQUFNLGdCQUFnQixlQUFlLEdBQUcsR0FBRztBQUNqRyxhQUFPLEtBQUssRUFBRSxVQUFVLEtBQUssVUFBVSxLQUFLLFVBQVUsVUFBVSxRQUFRLENBQUM7QUFBQSxJQUMzRTtBQUVBLFFBQUksYUFBYSxRQUFRO0FBQ3ZCLFlBQU0sT0FBTyxNQUFNLGVBQWUsMkNBQTJDLG1CQUFtQixHQUFHLENBQUMsSUFBSTtBQUFBLFFBQ3RHLFNBQVMsRUFBRSxjQUFjLFdBQVc7QUFBQSxNQUN0QyxDQUFDO0FBQ0QsWUFBTSxPQUFPLE1BQU0sS0FBSyxLQUFLO0FBQzdCLFVBQUksQ0FBQyxLQUFLLE1BQU0sQ0FBQyxNQUFNLFNBQVUsUUFBTyxLQUFLLEVBQUUsT0FBTyxNQUFNLGdCQUFnQixjQUFjLEdBQUcsR0FBRztBQUNoRyxhQUFPLEtBQUssRUFBRSxVQUFVLEtBQUssVUFBVSxLQUFLLFVBQVUsVUFBVSxPQUFPLENBQUM7QUFBQSxJQUMxRTtBQUVBLFFBQUksYUFBYSxTQUFTO0FBQ3hCLFlBQU0sT0FBTyxNQUFNLGVBQWUsdUJBQXVCLG1CQUFtQixHQUFHLENBQUMsSUFBSTtBQUFBLFFBQ2xGLFNBQVMsRUFBRSxjQUFjLFdBQVc7QUFBQSxNQUN0QyxDQUFDO0FBQ0QsWUFBTSxRQUFRLE1BQU0sS0FBSyxLQUFLLEdBQUcsS0FBSztBQUN0QyxVQUFJLENBQUMsS0FBSyxNQUFNLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxFQUFHLFFBQU8sS0FBSyxFQUFFLE9BQU8sZUFBZSxHQUFHLEdBQUc7QUFDdkYsYUFBTyxLQUFLLEVBQUUsVUFBVSxLQUFLLFVBQVUsTUFBTSxVQUFVLFFBQVEsQ0FBQztBQUFBLElBQ2xFO0FBRUEsUUFBSSxhQUFhLFNBQVM7QUFDeEIsWUFBTSxhQUFhLE1BQU0sS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLGFBQWEsSUFBSTtBQUNsRSxVQUFJLENBQUMsV0FBWSxRQUFPLEtBQUssRUFBRSxPQUFPLGlDQUFpQyxHQUFHLEdBQUc7QUFDN0UsWUFBTSxPQUFPLE1BQU0sZUFBZSx3Q0FBd0M7QUFBQSxRQUN4RSxRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsVUFDUCxlQUFlLFVBQVUsVUFBVTtBQUFBLFVBQ25DLGdCQUFnQjtBQUFBLFVBQ2hCLGNBQWM7QUFBQSxRQUNoQjtBQUFBLFFBQ0EsTUFBTSxLQUFLLFVBQVUsRUFBRSxVQUFVLElBQUksQ0FBQztBQUFBLE1BQ3hDLENBQUM7QUFDRCxZQUFNLFVBQVUsTUFBTSxLQUFLLEtBQUs7QUFDaEMsVUFBSSxDQUFDLEtBQUssTUFBTSxDQUFDLFNBQVMsS0FBTSxRQUFPLEtBQUssRUFBRSxPQUFPLFNBQVMsV0FBVyxlQUFlLEdBQUcsR0FBRztBQUM5RixhQUFPLEtBQUssRUFBRSxVQUFVLEtBQUssVUFBVSxRQUFRLE1BQU0sVUFBVSxRQUFRLENBQUM7QUFBQSxJQUMxRTtBQUVBLFVBQU0sZ0JBQWlCLE9BQU8sWUFBWSxlQUFlLFFBQVEsT0FBTyxRQUFRLElBQUkscUJBQXNCO0FBQzFHLFFBQUksZUFBZTtBQUNqQixZQUFNLFdBQVcsTUFBTSxlQUFlLGtDQUFrQztBQUFBLFFBQ3RFLFFBQVE7QUFBQSxRQUNSLFNBQVM7QUFBQSxVQUNQLGVBQWUsVUFBVSxhQUFhO0FBQUEsVUFDdEMsZ0JBQWdCO0FBQUEsVUFDaEIsY0FBYztBQUFBLFFBQ2hCO0FBQUEsUUFDQSxNQUFNLEtBQUssVUFBVSxFQUFFLElBQUksQ0FBQztBQUFBLE1BQzlCLENBQUM7QUFDRCxZQUFNLFVBQVUsTUFBTSxTQUFTLEtBQUs7QUFDcEMsVUFBSSxDQUFDLFNBQVMsTUFBTSxDQUFDLFNBQVMsTUFBTSxTQUFVLFFBQU8sS0FBSyxFQUFFLE9BQU8sU0FBUyxTQUFTLENBQUMsS0FBSyxTQUFTLFdBQVcscUJBQXFCLEdBQUcsR0FBRztBQUMxSSxhQUFPLEtBQUssRUFBRSxVQUFVLEtBQUssVUFBVSxRQUFRLEtBQUssVUFBVSxVQUFVLGNBQWMsQ0FBQztBQUFBLElBQ3pGO0FBRUEsVUFBTSxpQkFBaUIsTUFBTSxlQUFlLDBDQUEwQyxtQkFBbUIsR0FBRyxDQUFDLElBQUk7QUFBQSxNQUMvRyxTQUFTLEVBQUUsY0FBYyxXQUFXO0FBQUEsSUFDdEMsQ0FBQztBQUNELFVBQU0sWUFBWSxNQUFNLGVBQWUsS0FBSyxHQUFHLEtBQUs7QUFDcEQsUUFBSSxDQUFDLGVBQWUsTUFBTSxDQUFDLHdDQUF3QyxLQUFLLFFBQVEsRUFBRyxRQUFPLEtBQUssRUFBRSxPQUFPLHFDQUFxQyxHQUFHLEdBQUc7QUFDbkosV0FBTyxLQUFLLEVBQUUsVUFBVSxLQUFLLFVBQVUsVUFBVSxpQkFBaUIsQ0FBQztBQUFBLEVBQ3JFLFNBQVMsT0FBTztBQUNkLFVBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsV0FBTyxLQUFLLEVBQUUsT0FBTyxRQUFRLEdBQUcsR0FBRztBQUFBLEVBQ3JDO0FBQ0Y7OztBTjFGQSxJQUFNLG1DQUFtQztBQVV6QyxJQUFNLHNCQUErRTtBQUFBLEVBQ25GLHFCQUFxQjtBQUFBLEVBQ3JCLG9CQUFvQjtBQUFBLEVBQ3BCLHVCQUF1QjtBQUFBLEVBQ3ZCLG1CQUFtQjtBQUFBLEVBQ25CLGlCQUFpQjtBQUNuQjtBQUVBLElBQU0sZUFBZSxDQUFDLFFBQTZDO0FBQ2pFLFFBQU0sU0FBUyxVQUFVLElBQUksUUFBUSxRQUFRLGdCQUFnQjtBQUM3RCxRQUFNLE1BQU0sSUFBSSxJQUFJLElBQUksT0FBTyxLQUFLLE1BQU07QUFDMUMsUUFBTSxTQUFTLElBQUksVUFBVTtBQUM3QixRQUFNLFVBQVUsSUFBSSxRQUFRO0FBRTVCLFNBQU8sUUFBUSxJQUFJLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLEtBQUssTUFBTTtBQUNwRCxRQUFJLE9BQU8sVUFBVSxVQUFVO0FBQzdCLGNBQVEsSUFBSSxLQUFLLEtBQUs7QUFBQSxJQUN4QixXQUFXLE1BQU0sUUFBUSxLQUFLLEdBQUc7QUFDL0IsY0FBUSxJQUFJLEtBQUssTUFBTSxLQUFLLElBQUksQ0FBQztBQUFBLElBQ25DO0FBQUEsRUFDRixDQUFDO0FBRUQsU0FBTyxJQUFJLFFBQVEsS0FBSztBQUFBLElBQ3RCO0FBQUEsSUFDQTtBQUFBLElBQ0EsTUFBTSxXQUFXLFNBQVMsV0FBVyxTQUFTLFNBQVksU0FBUyxNQUFNLEdBQUc7QUFBQSxJQUM1RSxRQUFRLFdBQVcsU0FBUyxXQUFXLFNBQVMsU0FBWTtBQUFBLEVBQzlELENBQUM7QUFDSDtBQUVBLElBQU0sbUJBQW1CLE9BQU8sS0FBeUMsYUFBdUI7QUFDOUYsTUFBSSxhQUFhLFNBQVM7QUFDMUIsV0FBUyxRQUFRLFFBQVEsQ0FBQyxPQUFPLFFBQVE7QUFDdkMsUUFBSSxVQUFVLEtBQUssS0FBSztBQUFBLEVBQzFCLENBQUM7QUFFRCxNQUFJLENBQUMsU0FBUyxNQUFNO0FBQ2xCLFFBQUksSUFBSTtBQUNSO0FBQUEsRUFDRjtBQUVBLFFBQU0sSUFBSSxRQUFjLENBQUMsU0FBUyxXQUFXO0FBQzNDLGFBQVMsUUFBUSxTQUFTLElBQWlDLEVBQUUsS0FBSyxHQUFHLEVBQUUsR0FBRyxVQUFVLE9BQU8sRUFBRSxHQUFHLFNBQVMsTUFBTTtBQUFBLEVBQ2pILENBQUM7QUFDSDtBQUVBLElBQU0sbUJBQW1CLE9BQU87QUFBQSxFQUM5QixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxnQkFBZ0IsUUFBc0M7QUFDcEQsV0FBTyxZQUFZLElBQUksT0FBTyxLQUFLLEtBQUssU0FBUztBQUMvQyxZQUFNLFlBQVksSUFBSSxPQUFPLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQztBQUM3QyxZQUFNLFFBQVEsU0FBUyxNQUFNLDRCQUE0QjtBQUN6RCxZQUFNLGVBQWUsUUFBUSxDQUFDO0FBQzlCLFlBQU0sVUFBVSxlQUFlLG9CQUFvQixZQUFZLElBQUk7QUFFbkUsVUFBSSxDQUFDLFNBQVM7QUFDWixhQUFLO0FBQ0w7QUFBQSxNQUNGO0FBRUEsVUFBSTtBQUNGLGNBQU0sVUFBVSxhQUFhLEdBQUc7QUFDaEMsY0FBTSxXQUFXLE1BQU0sUUFBUSxPQUFPO0FBQ3RDLGNBQU0saUJBQWlCLEtBQUssUUFBUTtBQUFBLE1BQ3RDLFNBQVMsT0FBTztBQUNkLGNBQU0sVUFBVSxpQkFBaUIsUUFBUSxNQUFNLFVBQVU7QUFDekQsWUFBSSxhQUFhO0FBQ2pCLFlBQUksVUFBVSxnQkFBZ0Isa0JBQWtCO0FBQ2hELFlBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxPQUFPLFFBQVEsQ0FBQyxDQUFDO0FBQUEsTUFDNUM7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNSSxPQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFNBQU8sT0FBTyxRQUFRLEtBQUtBLElBQUc7QUFFOUIsU0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLFFBQ0gsU0FBUztBQUFBLE1BQ1g7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsTUFBTSxHQUFHLGlCQUFpQixHQUFHLFNBQVMsaUJBQWlCLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFDbEcsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsTUFDQSxRQUFRLENBQUMsU0FBUyxhQUFhLHFCQUFxQix5QkFBeUIseUJBQXlCLHNCQUFzQjtBQUFBLElBQzlIO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbIkFMTE9XRURfRE9XTkxPQURfSE9TVFMiLCAiZXh0cmFjdFZpZGVvSWQiLCAicGF0aCIsICJwYXlsb2FkIiwgIml0ZW0iLCAiZW52Il0KfQo=
