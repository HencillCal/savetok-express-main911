import {
  corsHeaders,
  fetchWithRetry,
  json,
  proxyDownloadResponse,
  resolveShortUrl,
  sanitizeFilename,
  USER_AGENT,
} from "../_shared/http.ts";

const ALLOWED_DOWNLOAD_HOSTS = [
  "pbs.twimg.com",
  "video.twimg.com",
  "video-cf.twimg.com",
  "twimg.com",
  "x.com",
  "twitter.com",
] as const;

const TWEET_URL_RE = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d+)/i;

type TweetPayload = {
  text?: string;
  user?: {
    name?: string;
    screen_name?: string;
    profile_image_url_https?: string;
  };
  mediaDetails?: Array<{
    type?: string;
    media_url_https?: string;
    video_info?: {
      variants?: Array<{
        bitrate?: number;
        content_type?: string;
        url?: string;
      }>;
    };
  }>;
  photos?: Array<{
    url?: string;
  }>;
  video?: {
    poster?: string;
    variants?: Array<{
      type?: string;
      src?: string;
    }>;
  };
};

const getTweetId = (url: string) => url.match(TWEET_URL_RE)?.[1] ?? null;

const asTitle = (text: string | undefined) => {
  const trimmed = (text ?? "").replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 120) : "Tweet media";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const fileUrl = url.searchParams.get("file");
      const filename = sanitizeFilename(url.searchParams.get("filename") || "twitter-media");
      if (!fileUrl) return json({ error: "Missing file URL" }, 400);
      return await proxyDownloadResponse(fileUrl, filename, ALLOWED_DOWNLOAD_HOSTS, {
        referer: "https://x.com/",
      });
    }

    const body = await req.json();
    const requestedUrl = body?.url;
    const requestedMode = typeof body?.mode === "string" ? body.mode : "post";
    if (!requestedUrl || typeof requestedUrl !== "string") {
      return json({ error: "Missing X / Twitter URL" }, 400);
    }

    const resolved = await resolveShortUrl(requestedUrl);
    const finalUrl = resolved.url;
    const tweetId = getTweetId(finalUrl);
    if (!tweetId) {
      return json({ error: "Please enter a valid public X / Twitter status URL" }, 400);
    }

    const response = await fetchWithRetry(`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=0`, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    }, {
      attempts: 3,
      backoffMs: 400,
    });
    const payload = (await response.json()) as TweetPayload & { __typename?: string };
    if (!response.ok || payload.__typename === "TweetTombstone") {
      return json({ error: "Could not load that public post" }, 404);
    }

    const photoUrls = [
      ...(payload.photos?.map((photo) => photo.url).filter((item): item is string => Boolean(item)) ?? []),
      ...(
        payload.mediaDetails
          ?.filter((item) => item.type === "photo")
          .map((item) => item.media_url_https)
          .filter((item): item is string => Boolean(item)) ?? []
      ),
    ];

    const imageItems = Array.from(new Set(photoUrls)).map((photoUrl, index) => ({
      id: `image-${index + 1}`,
      type: "image" as const,
      title: `Image ${index + 1}`,
      thumbnail: `${photoUrl}?name=small`,
      downloads: [
        {
          label: "Original image",
          url: `${photoUrl}?name=orig`,
          filename: `tweet-image-${index + 1}.jpg`,
          functionName: "twitter-download",
        },
      ],
    }));

    const videoVariants = [
      ...(payload.video?.variants
        ?.filter((variant) => variant.type === "video/mp4" && variant.src)
        .map((variant) => ({
          url: variant.src as string,
          bitrate: 0,
        })) ?? []),
      ...(
        payload.mediaDetails?.flatMap((item) =>
          item.video_info?.variants
            ?.filter((variant) => variant.content_type === "video/mp4" && variant.url)
            .map((variant) => ({
              url: variant.url as string,
              bitrate: variant.bitrate ?? 0,
            })) ?? []
        ) ?? []
      ),
    ];

    const dedupedVideos = Array.from(
      new Map(videoVariants.sort((a, b) => b.bitrate - a.bitrate).map((variant) => [variant.url, variant])).values(),
    );

    const videoItems = dedupedVideos.length
      ? [{
          id: "video-1",
          type: "video" as const,
          title: "Tweet video",
          thumbnail: payload.video?.poster ?? payload.mediaDetails?.find((item) => item.media_url_https)?.media_url_https ?? null,
          downloads: dedupedVideos.map((variant, index) => ({
            label: variant.bitrate ? `${Math.round(variant.bitrate / 1000)} kbps MP4` : `MP4 variant ${index + 1}`,
            url: variant.url,
            filename: `tweet-video-${index + 1}.mp4`,
            functionName: "twitter-download",
          })),
        }]
      : [];

    const items =
      requestedMode === "image"
        ? imageItems
        : requestedMode === "video"
          ? videoItems
          : [...videoItems, ...imageItems];

    if (!items.length) {
      return json({ error: "No downloadable media found for that post" }, 404);
    }

    return json({
      platform: "twitter",
      sourceType: requestedMode,
      title: asTitle(payload.text),
      caption: payload.text ?? null,
      username: payload.user?.screen_name ?? null,
      authorName: payload.user?.name ?? null,
      profilePic: payload.user?.profile_image_url_https ?? null,
      cover: videoItems[0]?.thumbnail ?? imageItems[0]?.thumbnail ?? null,
      items,
      resolvedUrl: finalUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
