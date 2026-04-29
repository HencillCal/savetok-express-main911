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

const fetchFromInnertube = async (videoId: string): Promise<PlayerResponse> => {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&bpctr=9999999999&has_verified=1&hl=en`;
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

  if (!playerResponse.ok) {
    throw new Error(`YouTube player API error ${playerResponse.status}`);
  }

  const payload = await playerResponse.json() as PlayerResponse;
  const playability = payload.playabilityStatus?.status;
  if (playability && playability !== "OK") {
    throw new Error(
      payload.playabilityStatus?.reason
      ?? payload.playabilityStatus?.messages?.[0]
      ?? `YouTube playability status ${playability}`,
    );
  }

  return payload;
};

const bestThumbnail = (thumbnails: Thumbnail[] | undefined) => {
  const best = thumbnails?.slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url ? normalizeUrl(best.url) : null;
};

const bestVideoStream = (video: YouTubeVideo) =>
  video.formatStreams
    ?.filter((stream) => stream.url && stream.mimeType?.includes("video/mp4"))
    .sort((a, b) => numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality))[0] ?? null;

const bestAdaptiveVideoStream = (video: YouTubeVideo) =>
  video.adaptiveFormats
    ?.filter((stream) => stream.url && stream.mimeType?.includes("video/mp4"))
    .sort((a, b) =>
      numericQuality(b.qualityLabel ?? b.quality) - numericQuality(a.qualityLabel ?? a.quality)
      || numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;

const bestAudioStream = (video: YouTubeVideo) =>
  video.adaptiveFormats
    ?.filter((stream) => stream.url && stream.mimeType?.includes("audio/"))
    .sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;

const bestMp4AudioStream = (video: YouTubeVideo) =>
  video.adaptiveFormats
    ?.filter((stream) => stream.url && stream.mimeType?.includes("audio/mp4"))
    .sort((a, b) => numericBitrate(b.bitrate) - numericBitrate(a.bitrate))[0] ?? null;

const audioExtension = (stream: StreamFormat | null | undefined) =>
  stream?.mimeType?.includes("webm") ? "webm" : "m4a";

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

const makeVideoItem = (videoId: string, video: YouTubeVideo, mode: string) => {
  const thumbnail = bestThumbnail(video.thumbnails)
    ?? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const progressiveVideoStream = bestVideoStream(video);
  const adaptiveVideoStream = progressiveVideoStream ? null : bestAdaptiveVideoStream(video);
  const videoStream = progressiveVideoStream ?? adaptiveVideoStream;
  const preferredMp4AudioStream = bestMp4AudioStream(video);
  const fallbackAudioStream = bestAudioStream(video);
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
      label: "Merged MP4",
      url: adaptiveVideoStream.url,
      filename: `${videoId}.mp4`,
      functionName: "youtube-download",
      quality: adaptiveVideoStream.qualityLabel ?? adaptiveVideoStream.quality ?? null,
      mergeStrategy: "mux-mp4" as const,
      mergeAudioUrl: preferredMp4AudioStream.url,
    });
  }
  if (videoStream?.url) {
    downloads.push({
      label: [
        videoStream.qualityLabel ?? videoStream.quality ?? "Video",
        canMerge || separateTracks ? "video only" : null,
      ].filter(Boolean).join(" "),
      url: videoStream.url,
      filename: `${videoId}.mp4`,
      functionName: "youtube-download",
      quality: videoStream.qualityLabel ?? videoStream.quality ?? null,
    });
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
  downloads.push({
    label: "Thumbnail",
    url: thumbnail,
    filename: `${videoId}-thumbnail.jpg`,
    functionName: "youtube-download",
  });

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
          const payload = await fetchFromInnertube(entry.videoId);
          return makeVideoItem(entry.videoId, toYouTubeVideo(payload), "video");
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
      resolvedUrl: finalUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
};
