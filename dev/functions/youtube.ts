import {
  corsHeaders,
  fetchWithRetry,
  json,
  proxyDownloadResponse,
  resolveShortUrl,
  sanitizeFilename,
  USER_AGENT,
} from "../../supabase/functions/_shared/http.ts";
import { mergeMp4Response, validateMp4MergeRequest } from "./merge.ts";

const ALLOWED_DOWNLOAD_HOSTS = [
  "googlevideo.com",
  "youtube.com",
  "youtu.be",
  "ytimg.com",
  "ggpht.com",
] as const;

const INVIDIOUS_BASES = [
  "https://yewtu.be/api/v1",
  "https://inv.nadeko.net/api/v1",
  "https://vid.puffyan.us/api/v1",
] as const;

const ANDROID_CLIENT_VERSION = "20.10.38";
const ANDROID_USER_AGENT =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US; Pixel 8 Pro Build/AP1A.240505.005)";

type Thumbnail = {
  url: string;
  width?: number;
  height?: number;
};

type StreamFormat = {
  url?: string;
  cipher?: string;
  signatureCipher?: string;
  s?: string;
  sp?: string;
  sig?: string;
  mimeType?: string;
  audioQuality?: string;
  bitrate?: string | number;
  qualityLabel?: string;
  quality?: string;
};

type YouTubeVideo = {
  title?: string;
  author?: string;
  authorId?: string;
  description?: string;
  thumbnails?: Thumbnail[];
  formatStreams?: StreamFormat[];
  adaptiveFormats?: StreamFormat[];
};

type InvidiousPlaylist = {
  title?: string;
  author?: string;
  authorId?: string;
  description?: string;
  videos?: Array<{
    title?: string;
    videoId?: string;
    videoThumbnails?: Thumbnail[];
  }>;
};

type TextRun = {
  text?: string;
};

type TextValue = {
  simpleText?: string;
  runs?: TextRun[];
};

type PlayerResponse = {
  playabilityStatus?: {
    status?: string;
    reason?: string;
    messages?: string[];
  };
  videoDetails?: {
    title?: string;
    author?: string;
    channelId?: string;
    shortDescription?: string;
    thumbnail?: {
      thumbnails?: Thumbnail[];
    };
  };
  microformat?: {
    playerMicroformatRenderer?: {
      title?: TextValue;
      description?: TextValue;
      ownerChannelName?: string;
      externalChannelId?: string;
      thumbnail?: {
        thumbnails?: Thumbnail[];
      };
    };
  };
  streamingData?: {
    formats?: StreamFormat[];
    adaptiveFormats?: StreamFormat[];
  };
};

const normalizeUrl = (url: string) => {
  if (url.startsWith("//")) return `https:${url}`;
  return url;
};

const extractStreamUrl = (stream: StreamFormat, playerScriptUrl?: string): string | null => {
  if (stream.url) return normalizeUrl(stream.url);

  const cipher = stream.signatureCipher ?? stream.cipher;
  if (!cipher) return null;

  const params = new URLSearchParams(cipher);
  const url = params.get("url") ?? params.get("u");
  if (!url) return null;

  let finalUrl = url;
  const signature = params.get("s") ?? params.get("sig");
  const signatureParam = params.get("sp");
  if (signature) {
    // Try to decode signature using cached player decipher
    let sigValue = signature;
    if (playerScriptUrl && playerDecipherCache.has(playerScriptUrl)) {
      try {
        const fn = playerDecipherCache.get(playerScriptUrl)!;
        sigValue = fn(signature);
      } catch {
        sigValue = signature;
      }
    }

    if (signatureParam) {
      finalUrl += `&${encodeURIComponent(signatureParam)}=${encodeURIComponent(sigValue)}`;
    } else {
      finalUrl += `&sig=${encodeURIComponent(sigValue)}`;
    }
  }

  for (const [key, value] of params.entries()) {
    if (key === "url" || key === "u" || key === "s" || key === "sig" || key === "sp") continue;
    finalUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }

  return normalizeUrl(finalUrl);
};

const numericQuality = (value: string | undefined) =>
  parseInt((value ?? "0").replace(/\D/g, "") || "0", 10);

const numericBitrate = (value: string | number | undefined) =>
  typeof value === "number" ? value : parseInt(value ?? "0", 10);

const joinRuns = (value: TextValue | undefined) => {
  const text = value?.simpleText ?? value?.runs?.map((run) => run.text ?? "").join("");
  return text || undefined;
};

const extractVideoId = (value: string) => {
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

const extractPlaylistId = (value: string) => {
  try {
    const url = new URL(value);
    return url.searchParams.get("list");
  } catch {
    return null;
  }
};

const fetchFromInvidious = async <T>(path: string): Promise<T> => {
  let lastError: string | null = null;
  for (const base of INVIDIOUS_BASES) {
    try {
      const response = await fetchWithRetry(`${base}${path}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      }, {
        attempts: 3,
        backoffMs: 450,
      });
      if (!response.ok) {
        lastError = `Invidious error ${response.status}`;
        continue;
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown Invidious error";
    }
  }
  throw new Error(lastError ?? "No YouTube source is available right now");
};

const extractInnertubeApiKey = (html: string) =>
  html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  ?? html.match(/["']INNERTUBE_API_KEY["']\s*:\s*["']([^"']+)["']/)?.[1]
  ?? null;

// Player JS decipher cache keyed by player script URL
const playerDecipherCache = new Map<string, (sig: string) => string>();

const extractPlayerScriptUrlFromHtml = (html: string): string | null => {
  const patterns = [
    /"PLAYER_JS_URL"\s*:\s*"([^"]+)"/,
    /"jsUrl"\s*:\s*"([^"]+)"/,
    /"assets"\s*:\s*\{[^}]*"js"\s*:\s*"([^"]+)"/,
    /<script[^>]+src="([^"]*player[^"]+\.js)"/i,
    /<script[^>]+src="(\/s\/player[^"]+\.js)"/i,
  ];

  for (const re of patterns) {
    const m = re.exec(html);
    if (m && m[1]) {
      let url = m[1];
      // Unescape JSON escaped slashes
      url = url.replace(/\\\//g, "/");
      if (url.startsWith("//")) return `https:${url}`;
      if (url.startsWith("/")) return `https://www.youtube.com${url}`;
      if (!url.startsWith("http")) return `https://www.youtube.com/${url}`;
      return url;
    }
  }

  return null;
};

const parseDecipherOperations = (body: string): ((sig: string) => string) | null => {
  try {
    // Find the decipher function definition
    const fnRegexes = [
      /([A-Za-z0-9_$]{2,})=function\(\w\)\{[\s\S]*?return \w+\.join\(""\)\}/,
      /function\s+([A-Za-z0-9_$]{2,})\(\w\)\{[\s\S]*?return \w+\.join\(""\)\}/,
    ];

    let fnMatch: RegExpMatchArray | null = null;
    for (const r of fnRegexes) {
      const m = body.match(r);
      if (m) {
        fnMatch = m;
        break;
      }
    }

    if (!fnMatch) return null;

    const fnName = fnMatch[1];
    // Extract the whole function body text so we can inspect calls
    const fnBodyRegex = new RegExp(`${fnName}=function\\(\\w\\)\\{([\\s\\S]*?)return\\s+\\w+\\.join\\(\\"\\"\\)\\}`);
    const fnBodyMatch = body.match(fnBodyRegex) || body.match(new RegExp(`function\\s+${fnName}\\(\\w\\)\\{([\\s\\S]*?)return\\s+\\w+\\.join\\(\\"\\"\\)\\}`));
    const fnBody = fnBodyMatch ? fnBodyMatch[1] : fnMatch[0];

    // Find helper object name used in the function (e.g., var aB={...};) by finding first occurrence of X.Y(a,\d)
    const helperCallMatch = fnBody.match(/([A-Za-z0-9_$]{2,})\.[A-Za-z0-9_$]{2,}\(\w,\d+\)/);
    const helperName = helperCallMatch ? helperCallMatch[1] : null;

    const ops: Array<{op: string; arg?: number}> = [];

    if (helperName) {
      // Extract helper object literal
      const helperRegex = new RegExp(`(?:var|let|const)\\s+${helperName}=\\{([\\s\\S]*?)\\};`);
      const helperMatch = body.match(helperRegex);
      const helperBody = helperMatch ? helperMatch[1] : "";

      // Build method -> op map
      const methodRe = /([A-Za-z0-9_$]{2,})\s*:\s*function\(\w(?:,\w)?\)\{([\s\S]*?)\}/g;
      const methodMap: Record<string, string> = {};
      let mm: RegExpExecArray | null;
      while ((mm = methodRe.exec(helperBody))) {
        const name = mm[1];
        const bodyText = mm[2];
        if (/\.reverse\(\)/.test(bodyText)) methodMap[name] = "reverse";
        else if (/\.slice\(/.test(bodyText)) methodMap[name] = "slice";
        else if (/\.splice\(0,/.test(bodyText)) methodMap[name] = "splice";
        else if (/var\s+\w+=\w\[0\];\w\[0\]=\w\[\w%\w.length\];\w\[\w\]=\w;/.test(bodyText) || /\[0\]=\w\[\w%\w.length\]/.test(bodyText)) methodMap[name] = "swap";
        else if (/return\s+\w+\.join\(\"\"\)/.test(bodyText)) methodMap[name] = "join";
        else methodMap[name] = "unknown";
      }

      // Extract calls in order
      const callRe = new RegExp(`${helperName}\.([A-Za-z0-9_$]{2,})\(\w,(\d+)\)`, "g");
      let cm: RegExpExecArray | null;
      while ((cm = callRe.exec(fnBody))) {
        const method = cm[1];
        const arg = parseInt(cm[2], 10);
        const mapped = methodMap[method] ?? "unknown";
        ops.push({ op: mapped, arg });
      }
    } else {
      // Try to extract direct operations (no helper object)
      const directCallRe = /a\.reverse\(\)|a\.slice\((\d+)\)|a\.splice\(0,(\d+)\)|a\[0\]=a\[(\d+)\%a.length\];/g;
      let dm: RegExpExecArray | null;
      while ((dm = directCallRe.exec(fnBody))) {
        if (dm[0].includes("reverse")) ops.push({ op: "reverse" });
        else if (dm[1]) ops.push({ op: "slice", arg: parseInt(dm[1], 10) });
        else if (dm[2]) ops.push({ op: "splice", arg: parseInt(dm[2], 10) });
        else if (dm[3]) ops.push({ op: "swap", arg: parseInt(dm[3], 10) });
      }
    }

    if (!ops.length) return null;

    // Return decipher function that applies parsed ops
    return (sig: string) => {
      try {
        let a = sig.split("");
        for (const step of ops) {
          switch (step.op) {
            case "reverse":
              a = a.reverse();
              break;
            case "slice":
              a = a.slice(step.arg ?? 0);
              break;
            case "splice":
              a.splice(0, step.arg ?? 0);
              break;
            case "swap": {
              const idx = step.arg ?? 0;
              const i = idx % a.length;
              const tmp = a[0];
              a[0] = a[i];
              a[i] = tmp;
              break;
            }
            default:
              // Unknown op; bail out and return original
              return sig;
          }
        }
        return a.join("");
      } catch {
        return sig;
      }
    };
  } catch {
    return null;
  }
};

const getDecipherFromPlayerUrl = async (playerUrl: string | null) => {
  if (!playerUrl) return null;
  if (playerDecipherCache.has(playerUrl)) return playerDecipherCache.get(playerUrl)!;

  try {
    const resp = await fetchWithRetry(playerUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    }, { attempts: 2, backoffMs: 300 });
    if (!resp.ok) return null;
    const body = await resp.text();
    let decipher = parseDecipherOperations(body);

    if (!decipher) {
      try {
        const fnRegex = /([A-Za-z0-9_$]{2,})=function\(\w\)\{[\s\S]*?return \w+\.join\(\"\"\)\}/;
        const fnRegex2 = /function\s+([A-Za-z0-9_$]{2,})\(\w\)\{[\s\S]*?return \w+\.join\(\"\"\)\}/;
        const m = body.match(fnRegex) || body.match(fnRegex2);
        if (m && m[1]) {
          const fnName = m[1];
          try {
            const factory = new Function(`${body};\nreturn ${fnName};`);
            const fnAny = factory();
            if (typeof fnAny === "function") {
              decipher = (sig: string) => {
                try {
                  const out = fnAny(sig);
                  return typeof out === "string" ? out : sig;
                } catch {
                  return sig;
                }
              };
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }

    if (decipher) playerDecipherCache.set(playerUrl, decipher);
    return decipher;
  } catch {
    return null;
  }
};

const fetchFromInnertube = async (videoId: string): Promise<{ payload: PlayerResponse; playerScriptUrl?: string }> => {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&bpctr=9999999999&has_verified=1&hl=en&gl=US`;
  let watchHtml: string | null = null;
  let playerScriptUrl: string | null = null;

  try {
    const watchResponse = await fetchWithRetry(watchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }, {
      attempts: 3,
      backoffMs: 500,
    });

    if (watchResponse.ok) {
      watchHtml = await watchResponse.text();
      // Try to discover player script and prefetch decipher ops
      playerScriptUrl = extractPlayerScriptUrlFromHtml(watchHtml);
      if (playerScriptUrl) {
        try {
          await getDecipherFromPlayerUrl(playerScriptUrl);
        } catch {
          // ignore
        }
      }

      const apiKey = extractInnertubeApiKey(watchHtml);
      if (apiKey) {
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
            "X-YouTube-Client-Version": ANDROID_CLIENT_VERSION,
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "ANDROID",
                clientVersion: ANDROID_CLIENT_VERSION,
                hl: "en",
                gl: "US",
              },
            },
            videoId,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
        }, {
          attempts: 3,
          backoffMs: 500,
        });

        if (playerResponse.ok) {
          const payload = await playerResponse.json() as PlayerResponse;
          const playability = payload.playabilityStatus?.status;
          if (!playability || playability === "OK") {
            return { payload, playerScriptUrl: playerScriptUrl ?? undefined };
          }
        }
      }
    }
  } catch {
    // Fall back to HTML parsing and get_video_info when direct Innertube access fails.
  }

  if (watchHtml) {
    const htmlPayload = parsePlayerResponseFromHtml(watchHtml);
    if (htmlPayload) return { payload: htmlPayload, playerScriptUrl: playerScriptUrl ?? undefined };
  }

  const infoPayload = await fetchPlayerResponseFromGetVideoInfo(videoId);
  if (infoPayload) return { payload: infoPayload, playerScriptUrl: playerScriptUrl ?? undefined };

  throw new Error("Could not read YouTube player configuration");
};

const bestThumbnail = (thumbnails: Thumbnail[] | undefined) => {
  const best = thumbnails?.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url ? normalizeUrl(best.url) : null;
};

const allVideoStreams = (video: YouTubeVideo, playerScriptUrl?: string) =>
  (video.formatStreams ?? [])
    .map((stream) => ({ ...stream, url: extractStreamUrl(stream, playerScriptUrl) }))
    .filter((stream) => stream.url && stream.mimeType?.includes("video/"))
    .sort((a, b) => numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality));

const bestVideoStream = (video: YouTubeVideo, playerScriptUrl?: string) => allVideoStreams(video, playerScriptUrl)[0] ?? null;

const allAdaptiveVideoStreams = (video: YouTubeVideo, playerScriptUrl?: string) =>
  (video.adaptiveFormats ?? [])
    .map((stream) => ({ ...stream, url: extractStreamUrl(stream, playerScriptUrl) }))
    .filter((stream) => stream.url && stream.mimeType?.includes("video/"))
    .sort((a, b) =>
      numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality)
      || numericBitrate(b.bitrate) - numericBitrate(a.bitrate));

const bestAdaptiveVideoStream = (video: YouTubeVideo, playerScriptUrl?: string) => allAdaptiveVideoStreams(video, playerScriptUrl)[0] ?? null;

const bestAudioStream = (video: YouTubeVideo, playerScriptUrl?: string) =>
  (video.adaptiveFormats ?? [])
    .map((stream) => ({ ...stream, url: extractStreamUrl(stream, playerScriptUrl) }))
    .filter((stream) => stream.url && stream.mimeType?.includes("audio/"))
    .sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;

const bestMp4AudioStream = (video: YouTubeVideo, playerScriptUrl?: string) =>
  (video.adaptiveFormats ?? [])
    .map((stream) => ({ ...stream, url: extractStreamUrl(stream, playerScriptUrl) }))
    .filter((stream) => stream.url && stream.mimeType?.includes("audio/mp4"))
    .sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;

const audioExtension = (stream: StreamFormat | null | undefined) =>
  stream?.mimeType?.includes("webm") ? "webm" : "m4a";

const videoExtension = (stream: StreamFormat | null | undefined) =>
  stream?.mimeType?.includes("webm") ? "webm" : "mp4";

const toYouTubeVideo = (payload: PlayerResponse): YouTubeVideo => ({
  title: payload.videoDetails?.title ?? joinRuns(payload.microformat?.playerMicroformatRenderer?.title) ?? "YouTube media",
  author: payload.videoDetails?.author ?? payload.microformat?.playerMicroformatRenderer?.ownerChannelName,
  authorId: payload.videoDetails?.channelId ?? payload.microformat?.playerMicroformatRenderer?.externalChannelId,
  description: payload.videoDetails?.shortDescription ?? joinRuns(payload.microformat?.playerMicroformatRenderer?.description),
  thumbnails:
    payload.videoDetails?.thumbnail?.thumbnails
    ?? payload.microformat?.playerMicroformatRenderer?.thumbnail?.thumbnails
    ?? [],
  formatStreams: payload.streamingData?.formats ?? [],
  adaptiveFormats: payload.streamingData?.adaptiveFormats ?? [],
});

const makeVideoItem = (videoId: string, video: YouTubeVideo, mode: string, playerScriptUrl?: string) => {
  const thumbnail = bestThumbnail(video.thumbnails)
    ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const progressiveVideoStream = bestVideoStream(video, playerScriptUrl);
  const adaptiveVideoStream = progressiveVideoStream ? null : bestAdaptiveVideoStream(video, playerScriptUrl);
  const videoStream = progressiveVideoStream ?? adaptiveVideoStream;
  const preferredMp4AudioStream = bestMp4AudioStream(video, playerScriptUrl);
  const fallbackAudioStream = bestAudioStream(video, playerScriptUrl);
  const audioStream = mode === "audio"
    ? fallbackAudioStream
    : preferredMp4AudioStream ?? fallbackAudioStream;
  const canMerge = mode !== "audio"
    && !progressiveVideoStream
    && Boolean(adaptiveVideoStream?.url)
    && Boolean(preferredMp4AudioStream?.url);
  const separateTracks = !progressiveVideoStream && Boolean(adaptiveVideoStream?.url) && Boolean(fallbackAudioStream?.url);
  const downloads = [];

  if (mode === "audio" && audioStream?.url) {
    downloads.push({
      label: "Audio",
      url: audioStream.url,
      filename: `${videoId}.${audioExtension(audioStream)}`,
      functionName: "youtube-download",
      quality: audioStream.audioQuality ?? null,
    });
  }
  if (canMerge && adaptiveVideoStream?.url && preferredMp4AudioStream?.url) {
    downloads.push({
      label: `Merged MP4 (${adaptiveVideoStream.qualityLabel ?? adaptiveVideoStream.quality ?? 'Unknown'})`,
      url: adaptiveVideoStream.url,
      filename: `${videoId}.mp4`,
      functionName: "youtube-download",
      quality: adaptiveVideoStream.qualityLabel ?? adaptiveVideoStream.quality ?? null,
      mergeStrategy: "mux-mp4" as const,
      mergeAudioUrl: preferredMp4AudioStream.url,
    });
  }

  for (const vid of allAdaptiveVideoStreams(video, playerScriptUrl)) {
    if (vid.url && vid.mimeType?.includes("video")) {
      downloads.push({
        label: `Video ${vid.qualityLabel ?? vid.quality ?? 'Unknown'} (video only)`,
        url: vid.url,
        filename: `${videoId}-${vid.qualityLabel ?? 'video'}.${videoExtension(vid)}`,
        functionName: "youtube-download",
        quality: vid.qualityLabel ?? vid.quality ?? null,
      });
    }
  }

  for (const vid of allVideoStreams(video, playerScriptUrl)) {
    if (vid.url) {
      downloads.push({
        label: `${vid.qualityLabel ?? 'Video'} (with audio)`,
        url: vid.url,
        filename: `${videoId}-${vid.qualityLabel ?? 'video'}.${videoExtension(vid)}`,
        functionName: "youtube-download",
        quality: vid.qualityLabel ?? vid.quality ?? null,
      });
    }
  }

  if (mode !== "audio" && audioStream?.url) {
    downloads.push({
      label: "Audio",
      url: audioStream.url,
      filename: `${videoId}.${audioExtension(audioStream)}`,
      functionName: "youtube-download",
      quality: audioStream.audioQuality ?? null,
    });
  }

  if (downloads.length > 0) {
    downloads.push({
      label: "Thumbnail",
      url: thumbnail,
      filename: `${videoId}-thumbnail.jpg`,
      functionName: "youtube-download",
    });
  }

  return {
    id: videoId,
    type: mode === "audio" ? "audio" : "video",
    title: video.title ?? "YouTube media",
    description:
      canMerge
        ? [video.description, "Server will automatically merge the separate video and audio tracks into one MP4."]
          .filter(Boolean)
          .join(" ")
        : separateTracks
          ? [video.description, "This source exposes separate video and audio files."]
            .filter(Boolean)
            .join(" ")
          : video.description ?? null,
    thumbnail,
    downloads,
  };
};

export const handleYouTubeDownload = async (req: Request) => {
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
          await validateMp4MergeRequest(fileUrl, audioUrl, ALLOWED_DOWNLOAD_HOSTS, {
            referer: "https://www.youtube.com/",
            userAgent: ANDROID_USER_AGENT,
          });
          return new Response(null, { status: 204, headers: corsHeaders });
        }
        return await mergeMp4Response(fileUrl, audioUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
          referer: "https://www.youtube.com/",
          defaultFilename: "youtube-media",
          userAgent: ANDROID_USER_AGENT,
        });
      }
      if (req.method === "HEAD") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
        referer: "https://www.youtube.com/",
        userAgent: ANDROID_USER_AGENT,
        forceRangeRequest: true,
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

      const playlist = await fetchFromInvidious<InvidiousPlaylist>(`/playlists/${playlistId}`);
      const videos = playlist.videos ?? [];
      const settled = await Promise.allSettled(
        videos.map(async (entry) => {
          if (!entry.videoId) return null;
          const res = await fetchFromInnertube(entry.videoId);
          const video = toYouTubeVideo(res.payload);
          return makeVideoItem(entry.videoId, video, "video", res.playerScriptUrl);
        }),
      );

      const items = settled
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((item) => item !== null);

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
        resolvedUrl: finalUrl,
      });
    }

    const videoId = extractVideoId(finalUrl);
    if (!videoId) {
      return json({ error: "Please enter a valid YouTube video, Shorts, or music URL" }, 400);
    }

    let payload: PlayerResponse | null = null;
    let allErrors: string[] = [];
    let item: ReturnType<typeof makeVideoItem> | null = null;
    
    // Try Innertube first
    try {
      const res = await fetchFromInnertube(videoId);
      payload = res.payload;
      const video = toYouTubeVideo(payload as PlayerResponse);
      item = makeVideoItem(videoId, video, requestedMode, res.playerScriptUrl);

      // If Innertube succeeds but returns zero streams, continue to fallback methods
      if (!item.downloads.length) {
        allErrors.push("Innertube: No downloadable streams returned");
        payload = null;
        item = null;
      }
    } catch (innertubeErr) {
      allErrors.push(`Innertube: ${innertubeErr instanceof Error ? innertubeErr.message : String(innertubeErr)}`);
    }

    // If Innertube didn't work, try Invidious
    if (!payload) {
      try {
        const inv = await fetchFromInvidious<any>(`/videos/${videoId}`);
        // Map Invidious response shape to PlayerResponse-ish object for downstream helpers.
        const mapped: PlayerResponse = {
          videoDetails: {
            title: inv.title ?? inv.videoTitle ?? undefined,
            author: inv.author ?? undefined,
            channelId: inv.authorId ?? undefined,
            shortDescription: inv.description ?? undefined,
            thumbnail: { thumbnails: inv.videoThumbnails ?? inv.thumbnails ?? [] },
          },
          streamingData: {
            formats: (inv.formatStreams ?? inv.format ?? inv.formats ?? []) as StreamFormat[],
            adaptiveFormats: (inv.adaptiveFormats ?? inv.adaptiveFormats ?? []) as StreamFormat[],
          },
        } as PlayerResponse;
        const video = toYouTubeVideo(mapped);
        item = makeVideoItem(videoId, video, requestedMode);
        
        if (!item.downloads.length) {
          allErrors.push("Invidious: No downloadable streams returned");
          item = null;
        } else {
          payload = mapped;
        }
      } catch (invErr) {
        allErrors.push(`Invidious: ${invErr instanceof Error ? invErr.message : String(invErr)}`);
      }
    }

    // If still no payload, try parsing the watch page HTML as a last-resort fallback
    if (!payload) {
      try {
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        const resp = await fetchWithRetry(watchUrl, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        }, { attempts: 2, backoffMs: 400 });

        if (resp.ok) {
          const html = await resp.text();
          const parsed = parsePlayerResponseFromHtml(html);
          if (parsed) {
            const playerScriptUrl = extractPlayerScriptUrlFromHtml(html);
            if (playerScriptUrl) await getDecipherFromPlayerUrl(playerScriptUrl);
            const video = toYouTubeVideo(parsed);
            item = makeVideoItem(videoId, video, requestedMode, playerScriptUrl);
            if (item.downloads.length) {
              payload = parsed;
            } else {
              allErrors.push("HTML parser: No downloadable streams found");
            }
          } else {
            throw new Error("Could not parse ytInitialPlayerResponse from watch page");
          }
        } else {
          throw new Error(`Watch page returned ${resp.status}`);
        }
      } catch (htmlErr) {
        allErrors.push(`HTML parser: ${htmlErr instanceof Error ? htmlErr.message : String(htmlErr)}`);
      }
    }

    // If we still don't have any downloads, return error
    if (!item || !item.downloads.length) {
      return json({ error: "No downloadable streams were found for that video" }, 404);
    }

    const video = toYouTubeVideo(payload as PlayerResponse);
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
      resolvedUrl: finalUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
};
