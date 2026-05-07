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
  const mp4Regex = /https?:\/\/[^\"'\s>]+\\.mp4[^\"'\s>]*/gi;
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

const parseCourseSlug = (url: string) => {
  const match = url.match(/udemy\.com\/course\/([^\/?#]+)/i);
  return match ? match[1] : null;
};

const buildUdemyHeaders = (token?: string, cookie?: string) => {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://www.udemy.com/",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  return headers;
};

const deepCollectMediaUrls = (value: unknown) => {
  const urls = new Set<string>();
  const addUrl = (candidate: string) => {
    const cleaned = candidate.trim().replace(/\\u0026/g, "&");
    if (/\.(m3u8|mp4)(?:[?\s]|$)/i.test(cleaned) || /\/assets\/.*\/hls\//i.test(cleaned)) {
      urls.add(cleaned);
    }
  };

  const collect = (current: unknown) => {
    if (typeof current === "string") {
      const matches = current.match(/https?:\/\/[^"'\s>]+/gi);
      matches?.forEach(addUrl);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach(collect);
      return;
    }
    if (typeof current === "object" && current !== null) {
      for (const nested of Object.values(current)) {
        collect(nested);
      }
    }
  };

  collect(value);
  return Array.from(urls);
};

const getDownloadLabel = (url: string) => {
  if (/\.m3u8/i.test(url)) return "HLS playlist";
  if (/\.mp4/i.test(url)) return "MP4 video";
  return "Udemy media";
};

const getDownloadFilename = (courseTitle: string | null, lectureTitle: string, url: string, index: number) => {
  const extensionMatch = url.match(/\.(m3u8|mp4)(?:[?]|$)/i);
  const extension = extensionMatch?.[1] ?? "mp4";
  const base = courseTitle ? `${courseTitle} ${lectureTitle}` : lectureTitle;
  return `${sanitizeFilename(`${base}`)}.${extension}`;
};

const fetchUdemyJson = async (url: string, token?: string, cookie?: string) => {
  const resp = await fetchWithRetry(url, {
    headers: buildUdemyHeaders(token, cookie),
    redirect: "follow",
  }, { attempts: 3, backoffMs: 500 });

  let data: unknown = null;
  try {
    data = await resp.json();
  } catch {
    // ignore parse errors
  }

  return { resp, data } as const;
};

const fetchUdemyText = async (url: string, token?: string, cookie?: string) => {
  const resp = await fetchWithRetry(url, {
    headers: buildUdemyHeaders(token, cookie),
    redirect: "follow",
  }, { attempts: 3, backoffMs: 500 });

  const text = resp.ok ? await resp.text() : null;
  return { resp, text } as const;
};

const resolveUdemyCourse = async (slug: string, token?: string, cookie?: string) => {
  const url = `https://www.udemy.com/api-2.0/courses/${encodeURIComponent(slug)}/?fields[course]=id,title,headline,image_480x270`;
  const result = await fetchUdemyJson(url, token, cookie);
  if (result.resp.ok && result.data && typeof result.data === "object" && "id" in result.data) {
    return result.data as Record<string, unknown>;
  }

  const searchUrl = `https://www.udemy.com/api-2.0/courses/?search=${encodeURIComponent(slug)}&page_size=20`;
  const searchResult = await fetchUdemyJson(searchUrl, token, cookie);
  if (searchResult.resp.ok && searchResult.data && typeof searchResult.data === "object") {
    const results = Array.isArray((searchResult.data as Record<string, unknown>).results)
      ? ((searchResult.data as Record<string, unknown>).results as unknown[])
      : [];
    if (results.length) {
      const candidate = results.find((item) =>
        typeof item === "object" && item !== null && "url" in item && typeof (item as Record<string, unknown>).url === "string" && (item as Record<string, unknown>).url?.includes(`/course/${slug}/`),
      ) as Record<string, unknown> | undefined;
      return (candidate ?? results[0]) as Record<string, unknown>;
    }
  }

  throw new Error("Could not resolve Udemy course slug to a course record.");
};

const fetchCourseCurriculumItems = async (courseId: string | number, token?: string, cookie?: string) => {
  const endpoints = [
    `https://www.udemy.com/api-2.0/courses/${encodeURIComponent(String(courseId))}/subscriber-curriculum-items/?page_size=500`,
    `https://www.udemy.com/api-2.0/courses/${encodeURIComponent(String(courseId))}/cached-subscriber-curriculum-items/?page_size=500`,
    `https://www.udemy.com/api-2.0/courses/${encodeURIComponent(String(courseId))}/public-curriculum-items/?page_size=500`,
  ];

  for (const endpoint of endpoints) {
    const result = await fetchUdemyJson(endpoint, token, cookie);
    if (result.resp.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as Record<string, unknown>).results)) {
      return (result.data as Record<string, unknown>).results as unknown[];
    }
  }

  throw new Error("Failed to fetch Udemy course curriculum. Ensure the token is valid and the course is accessible.");
};

const fetchLecturePageMediaUrls = async (slug: string, lectureId: string | number, token?: string, cookie?: string) => {
  const lectureUrl = `https://www.udemy.com/course/${encodeURIComponent(slug)}/learn/lecture/${encodeURIComponent(String(lectureId))}`;
  const result = await fetchUdemyText(lectureUrl, token, cookie);
  if (!result.resp.ok || !result.text) return [];
  return deepCollectMediaUrls(result.text);
};

const fetchLectureDetails = async (lectureId: string | number, token?: string, cookie?: string) => {
  const url = `https://www.udemy.com/api-2.0/lectures/${encodeURIComponent(String(lectureId))}/?fields[lecture]=id,headline,description,asset,media`;
  const result = await fetchUdemyJson(url, token, cookie);
  return result.resp.ok && result.data && typeof result.data === "object" ? (result.data as Record<string, unknown>) : null;
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
      // First, try the external Udemy scraper if configured (better at handling bot detection)
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
          // ignore fallback failure and try direct approach below
        }
      }

      const resp = await fetchWithRetry(finalUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          Referer: "https://www.google.com/",
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

    // Owner / course flow (requires Udemy API token or client credentials)
    if (requestedMode === "owner" || requestedMode === "course") {
      const token = body?.udemy_api_token || Deno.env.get("UDEMY_API_TOKEN");
      const cookie = typeof body?.udemy_cookie === "string" ? body.udemy_cookie : undefined;
      if (!token && !cookie) {
        return json({
          error:
            "Owner/course mode requires authentication. Provide `udemy_api_token` in the request body or set UDEMY_API_TOKEN in the environment. " +
            "If you prefer session cookies, send `udemy_cookie` instead.",
        }, 400);
      }

      try {
        const slug = parseCourseSlug(finalUrl);
        if (!slug) return json({ error: "Could not determine course slug from URL" }, 400);

        const course = await resolveUdemyCourse(slug, token, cookie);
        const courseId = course.id ?? course.course_id ?? null;
        if (!courseId) return json({ error: "Could not resolve course ID from Udemy API response" }, 502);

        const courseTitle = typeof course.title === "string" ? course.title : null;
        const courseCover = typeof course.image_480x270 === "string" ? course.image_480x270 : null;
        const curriculumItems = await fetchCourseCurriculumItems(courseId, token, cookie);

        const lectureItems = curriculumItems.filter((item) => {
          if (item && typeof item === "object") {
            const record = item as Record<string, unknown>;
            return record.object_type === "lecture" || record.type === "lecture" || record.lecture != null || record.asset != null || record.media != null;
          }
          return false;
        });

        const items = [] as Array<{
          id: string;
          type: "video";
          title: string;
          description: string | null;
          thumbnail: string | null;
          downloads: Array<{
            label: string;
            url: string;
            filename: string;
            functionName: string;
          }>;
        }>;

        for (let index = 0; index < lectureItems.length; index += 1) {
          const rawItem = lectureItems[index] as Record<string, unknown>;
          const lecture = (rawItem.lecture && typeof rawItem.lecture === "object") ? (rawItem.lecture as Record<string, unknown>) : rawItem;
          const lectureId = String(lecture.id ?? rawItem.object_id ?? rawItem.id ?? index + 1);
          const lectureTitle =
            typeof lecture.headline === "string" ? lecture.headline :
            typeof lecture.title === "string" ? lecture.title :
            typeof rawItem.title === "string" ? rawItem.title :
            `Lecture ${index + 1}`;
          const lectureDescription =
            typeof lecture.description === "string" ? lecture.description :
            typeof rawItem.title === "string" ? rawItem.title :
            null;

          let mediaUrls = deepCollectMediaUrls(lecture.asset ?? lecture.media ?? rawItem);
          if (!mediaUrls.length) {
            const lectureDetails = await fetchLectureDetails(lectureId, token, cookie);
            if (lectureDetails) {
              mediaUrls = deepCollectMediaUrls(lectureDetails);
            }
          }
          if (!mediaUrls.length) {
            mediaUrls = await fetchLecturePageMediaUrls(slug, lectureId, token, cookie);
          }

          if (!mediaUrls.length) continue;

          const downloads = mediaUrls.map((url, downloadIndex) => ({
            label: downloadIndex === 0 ? getDownloadLabel(url) : `${getDownloadLabel(url)} ${downloadIndex + 1}`,
            url,
            filename: getDownloadFilename(courseTitle, lectureTitle, url, downloadIndex),
            functionName: "udemy-download",
          }));

          items.push({
            id: `lecture-${lectureId}`,
            type: "video",
            title: lectureTitle,
            description: lectureDescription,
            thumbnail: null,
            downloads,
          });
        }

        if (!items.length) {
          return json({ error: "Authenticated Udemy course access succeeded, but no downloadable media could be found." }, 404);
        }

        return json({
          platform: "udemy",
          sourceType: requestedMode,
          title: courseTitle,
          caption: null,
          username: null,
          authorName: null,
          profilePic: null,
          cover: courseCover,
          items,
          resolvedUrl: finalUrl,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Udemy owner/course request failed";
        return json({ error: message }, 500);
      }
    }

    return json({ error: "Unsupported mode" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
