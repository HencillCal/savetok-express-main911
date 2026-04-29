export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
};

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const sanitizeFilename = (value: string, fallback = "download") =>
  value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;

export const isAllowedHost = (hostname: string, allowedHosts: readonly string[]) => {
  const host = hostname.toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
};

export const decodeHtml = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export const uniq = <T>(items: T[]) => Array.from(new Set(items));

export const extractMeta = (html: string, property: string) => {
  const match = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
  );
  return match ? decodeHtml(match[1]) : null;
};

const isRedirectStatus = (status: number) => [301, 302, 303, 307, 308].includes(status);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  options?: {
    attempts?: number;
    backoffMs?: number;
    retryableStatuses?: readonly number[];
  },
) {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const backoffMs = Math.max(0, options?.backoffMs ?? 350);
  const retryableStatuses = new Set(options?.retryableStatuses ?? [...RETRYABLE_STATUSES]);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!retryableStatuses.has(response.status) || attempt === attempts - 1) {
        return response;
      }
      await response.body?.cancel().catch(() => undefined);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network request failed");
      if (attempt === attempts - 1) break;
    }

    await sleep(backoffMs * (attempt + 1));
  }

  throw lastError ?? new Error("Request failed after retries");
}

export async function resolveShortUrl(input: string, maxHops = 6) {
  let current = input;
  const hops: string[] = [];

  for (let index = 0; index < maxHops; index += 1) {
    let parsed: URL;
    try {
      parsed = new URL(current);
    } catch {
      break;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!["tinyurl.com", "www.tinyurl.com", "tiny.one"].includes(hostname)) break;

    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!isRedirectStatus(response.status)) break;
    const location = response.headers.get("Location");
    if (!location) break;
    current = new URL(location, current).toString();
    hops.push(current);
  }

  return { url: current, hops };
}

export async function proxyDownloadResponse(
  fileUrl: string,
  filename: string,
  allowedHosts: readonly string[],
  options?: {
    referer?: string;
    defaultContentType?: string;
    userAgent?: string;
    forceRangeRequest?: boolean;
  },
) {
  let parsed: URL;
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
      ...(options?.referer ? { Referer: options.referer } : {}),
      ...(options?.forceRangeRequest ? { Range: "bytes=0-" } : {}),
    },
  }, {
    attempts: 3,
    backoffMs: 500,
  });

  if (!upstream.ok || !upstream.body) {
    return json({ error: `Upstream error: ${upstream.status}` }, 502);
  }

  const contentType = upstream.headers.get("Content-Type") || options?.defaultContentType || "application/octet-stream";
  const contentLength = upstream.headers.get("Content-Length");
  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
    "Cache-Control": "no-store",
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(upstream.body, { status: 200, headers });
}
